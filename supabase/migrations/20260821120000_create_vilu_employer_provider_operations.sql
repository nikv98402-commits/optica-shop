begin;

alter table public.referrals
  add column if not exists provider_organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists provider_status text not null default 'unassigned'
    check (provider_status in ('unassigned','queued','appointment_booked','urgent_escalated','examination_completed','outcome_confirmed')),
  add column if not exists version integer not null default 1 check (version > 0);

create table public.provider_operation_receipts (
  id uuid primary key default gen_random_uuid(), provider_organization_id uuid not null references public.organizations(id),
  actor_user_id uuid not null references auth.users(id) on delete cascade, operation text not null,
  referral_id uuid references public.referrals(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete cascade,
  idempotency_key uuid not null, request_fingerprint text not null, response jsonb not null, created_at timestamptz not null default now(),
  unique(actor_user_id,operation,idempotency_key)
);
create table public.referral_appointments (
  id uuid primary key default gen_random_uuid(), referral_id uuid not null references public.referrals(id) on delete restrict,
  provider_organization_id uuid not null references public.organizations(id), employee_organization_id uuid not null references public.organizations(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade, scheduled_at timestamptz not null,
  status text not null default 'booked' check(status in ('booked','completed','cancelled')),
  version integer not null default 1 check(version>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(referral_id)
);
create table public.referral_escalations (
  id uuid primary key default gen_random_uuid(), referral_id uuid not null references public.referrals(id) on delete restrict,
  provider_organization_id uuid not null references public.organizations(id), employee_organization_id uuid not null references public.organizations(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  reason_code text not null check(reason_code in ('clinical_red_flag','rapid_deterioration','safety_concern')),
  status text not null default 'open' check(status in ('open','acknowledged','resolved')),
  created_at timestamptz not null default now(), unique(referral_id,status)
);
create table public.clinical_outcomes (
  id uuid primary key default gen_random_uuid(), referral_id uuid not null unique references public.referrals(id) on delete restrict,
  provider_organization_id uuid not null references public.organizations(id), employee_organization_id uuid not null references public.organizations(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  outcome_code text not null check(outcome_code in ('exam_completed','treatment_started','no_action_required','referred_onward')),
  completed_at timestamptz not null, created_at timestamptz not null default now()
);
create table public.employer_outcome_reports (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_from timestamptz not null, period_to timestamptz not null,
  response jsonb not null, created_at timestamptz not null default now(),
  primary key(organization_id,period_from,period_to)
);

create index referrals_provider_queue_idx on public.referrals(provider_organization_id,provider_status,respond_by,created_at);
create index appointments_provider_idx on public.referral_appointments(provider_organization_id,scheduled_at);
create index outcomes_employee_org_idx on public.clinical_outcomes(employee_organization_id,completed_at);

alter table public.provider_operation_receipts enable row level security;
alter table public.referral_appointments enable row level security;
alter table public.referral_escalations enable row level security;
alter table public.clinical_outcomes enable row level security;
alter table public.employer_outcome_reports enable row level security;

create policy provider_appointments_with_consent on public.referral_appointments for select to authenticated using(
 private.has_clinic_access(employee_organization_id,owner_user_id,provider_organization_id));
create policy employee_appointments_own on public.referral_appointments for select to authenticated using(
 owner_user_id=auth.uid() and private.has_org_role(employee_organization_id,array['employee']::public.organization_role[]));
create policy provider_escalations_with_consent on public.referral_escalations for select to authenticated using(
 private.has_clinic_access(employee_organization_id,owner_user_id,provider_organization_id));
create policy employee_escalations_own on public.referral_escalations for select to authenticated using(
 owner_user_id=auth.uid() and private.has_org_role(employee_organization_id,array['employee']::public.organization_role[]));
create policy provider_outcomes_with_consent on public.clinical_outcomes for select to authenticated using(
 private.has_clinic_access(employee_organization_id,owner_user_id,provider_organization_id));
create policy employee_outcomes_own on public.clinical_outcomes for select to authenticated using(
 owner_user_id=auth.uid() and private.has_org_role(employee_organization_id,array['employee']::public.organization_role[]));
grant select on public.referral_appointments,public.referral_escalations,public.clinical_outcomes to authenticated;
revoke all on public.provider_operation_receipts from anon,authenticated;
revoke all on public.employer_outcome_reports from anon,authenticated;
revoke insert,update,delete on public.referral_appointments,public.referral_escalations,public.clinical_outcomes from anon,authenticated;

create or replace function private.assert_provider_referral(target_provider_organization_id uuid,target_referral_id uuid)
returns public.referrals language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.referrals;
begin
 select * into r from public.referrals where id=target_referral_id and provider_organization_id=target_provider_organization_id for update;
 if auth.uid() is null or r.id is null or not private.has_org_role(target_provider_organization_id,array['provider_staff']::public.organization_role[])
   or not private.has_clinic_access(r.organization_id,r.owner_user_id,target_provider_organization_id) then
   raise exception 'Provider referral not found' using errcode='42501';
 end if;
 return r;
end $$;
revoke all on function private.assert_provider_referral(uuid,uuid) from public;

create or replace function public.assign_employee_referral_provider(target_organization_id uuid,target_referral_id uuid,target_provider_organization_id uuid,expected_version integer,request_idempotency_key uuid)
returns public.referrals language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.referrals; cached jsonb; stored_fingerprint text; fingerprint text;
begin
 fingerprint:=jsonb_build_object('employeeOrganizationId',target_organization_id,'referralId',target_referral_id,'providerOrganizationId',target_provider_organization_id,'expectedVersion',expected_version)::text;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',auth.uid()::text,'referral.assign',request_idempotency_key::text),0));
 select * into r from public.referrals where id=target_referral_id and organization_id=target_organization_id;
 if auth.uid() is null or r.id is null or r.owner_user_id<>auth.uid() or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Referral not found' using errcode='42501'; end if;
 if not exists(select 1 from public.organizations where id=target_provider_organization_id and organization_type='provider') then raise exception 'Clinical partner required' using errcode='22023'; end if;
 if not exists(select 1 from public.data_consents where organization_id=target_organization_id and owner_user_id=auth.uid() and consent_type='clinic_access' and provider_organization_id=target_provider_organization_id and granted) then raise exception 'Active clinic consent required' using errcode='42501'; end if;
 select response,request_fingerprint into cached,stored_fingerprint from public.provider_operation_receipts
  where actor_user_id=auth.uid() and operation='referral.assign' and idempotency_key=request_idempotency_key;
 if cached is not null then
  if stored_fingerprint<>fingerprint then raise exception 'Idempotency key reused with different request' using errcode='22023'; end if;
  select * into r from public.referrals where id=(cached->>'referralId')::uuid;
  return r;
 end if;
 select * into r from public.referrals where id=target_referral_id and organization_id=target_organization_id for update;
 if r.provider_organization_id=target_provider_organization_id then return r; end if;
 if r.version<>expected_version then raise exception 'Referral version conflict' using errcode='40001'; end if;
 update public.referrals set provider_organization_id=target_provider_organization_id,provider_status='queued',version=version+1,updated_at=now() where id=r.id returning * into r;
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,resource_id,correlation_id,metadata)
 values(auth.uid(),target_organization_id,'referral.provider_assigned','referral',r.id::text,request_idempotency_key,jsonb_build_object('providerOrganizationId',target_provider_organization_id));
 insert into public.provider_operation_receipts(provider_organization_id,actor_user_id,operation,referral_id,subject_user_id,idempotency_key,request_fingerprint,response)
 values(target_provider_organization_id,auth.uid(),'referral.assign',r.id,r.owner_user_id,request_idempotency_key,
  fingerprint,jsonb_build_object('referralId',r.id));
 return r;
end $$;

create or replace function public.consent_and_assign_employee_referral_provider(target_organization_id uuid,target_referral_id uuid,target_provider_organization_id uuid,expected_version integer,request_idempotency_key uuid)
returns public.referrals language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.referrals; cached jsonb; stored_fingerprint text; fingerprint text;
begin
 fingerprint:=jsonb_build_object('employeeOrganizationId',target_organization_id,'referralId',target_referral_id,'providerOrganizationId',target_provider_organization_id,'expectedVersion',expected_version)::text;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',auth.uid()::text,'referral.assign',request_idempotency_key::text),0));
 select * into r from public.referrals where id=target_referral_id and organization_id=target_organization_id;
 if auth.uid() is null or r.id is null or r.owner_user_id<>auth.uid() or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Referral not found' using errcode='42501'; end if;
 if not exists(select 1 from public.organizations where id=target_provider_organization_id and organization_type='provider') then raise exception 'Clinical partner required' using errcode='22023'; end if;
 select response,request_fingerprint into cached,stored_fingerprint from public.provider_operation_receipts
  where actor_user_id=auth.uid() and operation='referral.assign' and idempotency_key=request_idempotency_key;
 if cached is not null then
  if stored_fingerprint<>fingerprint then raise exception 'Idempotency key reused with different request' using errcode='22023'; end if;
  if not exists(select 1 from public.data_consents where organization_id=target_organization_id and owner_user_id=auth.uid() and consent_type='clinic_access' and provider_organization_id=target_provider_organization_id and granted) then raise exception 'Active clinic consent required' using errcode='42501'; end if;
  select * into r from public.referrals where id=(cached->>'referralId')::uuid;
  return r;
 end if;
 select * into r from public.referrals where id=target_referral_id and organization_id=target_organization_id for update;
 perform public.set_employee_consent(target_organization_id,'clinic_access',true,target_provider_organization_id);
 return public.assign_employee_referral_provider(target_organization_id,target_referral_id,target_provider_organization_id,expected_version,request_idempotency_key);
end $$;

create or replace function public.get_provider_queue(target_organization_id uuid,target_priority public.screening_outcome default null,target_status text default null,target_search text default null,target_limit integer default 25,target_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['provider_staff']::public.organization_role[]) then raise exception 'Provider membership required' using errcode='42501'; end if;
 select jsonb_build_object('items',coalesce((select jsonb_agg(item order by item->>'respondBy',item->>'id') from (
   select jsonb_build_object('id',r.id,'priority',r.priority,'status',r.provider_status,'respondBy',r.respond_by,'createdAt',r.created_at,
    'patientName',coalesce(p.display_name,'ViLu patient'),'appointmentAt',a.scheduled_at,'documentsCount',(select count(*) from public.clinic_documents d where d.owner_user_id=r.owner_user_id and d.organization_id=r.organization_id and d.provider_organization_id=target_organization_id)) item
   from public.referrals r join public.profiles p on p.id=r.owner_user_id left join public.referral_appointments a on a.referral_id=r.id
   where r.provider_organization_id=target_organization_id and private.has_clinic_access(r.organization_id,r.owner_user_id,target_organization_id)
    and (target_priority is null or r.priority=target_priority) and (target_status is null or r.provider_status=target_status)
    and (target_search is null or p.display_name ilike '%'||target_search||'%')
   order by r.respond_by,r.id limit least(greatest(coalesce(target_limit,25),1),50) offset greatest(coalesce(target_offset,0),0)) q),'[]'::jsonb),
  'total',(select count(*) from public.referrals r join public.profiles p on p.id=r.owner_user_id where r.provider_organization_id=target_organization_id
   and private.has_clinic_access(r.organization_id,r.owner_user_id,target_organization_id)
   and (target_priority is null or r.priority=target_priority) and (target_status is null or r.provider_status=target_status)
   and (target_search is null or p.display_name ilike '%'||target_search||'%'))) into result;
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,metadata)
 values(auth.uid(),target_organization_id,'provider.queue_sensitive_read','referral_queue',
  jsonb_build_object('priority',target_priority,'status',target_status,'searchApplied',target_search is not null,'limit',least(greatest(coalesce(target_limit,25),1),50),'offset',greatest(coalesce(target_offset,0),0),'returnedCount',jsonb_array_length(result->'items')));
 return result;
end $$;

create or replace function public.get_provider_referral(target_organization_id uuid,target_referral_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.referrals; result jsonb;
begin
 select * into r from public.referrals where id=target_referral_id and provider_organization_id=target_organization_id;
 if auth.uid() is null or r.id is null or not private.has_org_role(target_organization_id,array['provider_staff']::public.organization_role[]) or not private.has_clinic_access(r.organization_id,r.owner_user_id,target_organization_id) then raise exception 'Provider referral not found' using errcode='42501'; end if;
 result:=jsonb_build_object('id',r.id,'priority',r.priority,'status',r.provider_status,'respondBy',r.respond_by,'version',r.version,
  'patientName',(select display_name from public.profiles where id=r.owner_user_id),
  'appointment',(select jsonb_build_object('id',id,'scheduledAt',scheduled_at,'status',status,'version',version) from public.referral_appointments where referral_id=r.id),
  'documents',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'type',document_type,'storagePath',storage_path,'issuedAt',issued_at) order by issued_at desc) from public.clinic_documents where owner_user_id=r.owner_user_id and organization_id=r.organization_id and provider_organization_id=target_organization_id),'[]'::jsonb));
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,resource_id,metadata)
 values(auth.uid(),target_organization_id,'provider.referral_sensitive_read','referral',r.id::text,
  jsonb_build_object('fields',jsonb_build_array('patientName','appointment','documents'),'documentIds',
   coalesce((select jsonb_agg(id order by issued_at desc) from public.clinic_documents
    where owner_user_id=r.owner_user_id and organization_id=r.organization_id and provider_organization_id=target_organization_id),'[]'::jsonb)));
 return result;
end $$;

create or replace function public.book_provider_appointment(target_organization_id uuid,target_referral_id uuid,expected_version integer,target_scheduled_at timestamptz,request_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.referrals; a public.referral_appointments; cached jsonb; stored_fingerprint text; fingerprint text;
begin
 fingerprint:=jsonb_build_object('providerOrganizationId',target_organization_id,'referralId',target_referral_id,'expectedVersion',expected_version,'scheduledAt',target_scheduled_at)::text;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',auth.uid()::text,'appointment.book',request_idempotency_key::text),0));
 r:=private.assert_provider_referral(target_organization_id,target_referral_id);
 select response,request_fingerprint into cached,stored_fingerprint from public.provider_operation_receipts where actor_user_id=auth.uid() and operation='appointment.book' and idempotency_key=request_idempotency_key;
 if cached is not null then if stored_fingerprint<>fingerprint then raise exception 'Idempotency key reused with different request' using errcode='22023'; end if; return cached; end if;
 if r.version<>expected_version or target_scheduled_at<=now() then raise exception 'Referral version conflict or invalid appointment' using errcode='40001'; end if;
 if r.provider_status not in('queued','appointment_booked','urgent_escalated') then raise exception 'Referral cannot be booked in its current state' using errcode='22023'; end if;
 insert into public.referral_appointments(referral_id,provider_organization_id,employee_organization_id,owner_user_id,scheduled_at) values(r.id,target_organization_id,r.organization_id,r.owner_user_id,target_scheduled_at)
 on conflict(referral_id) do update set scheduled_at=excluded.scheduled_at,version=public.referral_appointments.version+1,updated_at=now() returning * into a;
 update public.referrals set provider_status='appointment_booked',version=version+1,updated_at=now() where id=r.id;
 cached:=jsonb_build_object('appointmentId',a.id,'scheduledAt',a.scheduled_at,'referralVersion',r.version+1);
 insert into public.provider_operation_receipts(provider_organization_id,actor_user_id,operation,referral_id,subject_user_id,idempotency_key,request_fingerprint,response)
 values(target_organization_id,auth.uid(),'appointment.book',r.id,r.owner_user_id,request_idempotency_key,fingerprint,cached);
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,resource_id,correlation_id) values(auth.uid(),target_organization_id,'appointment.booked','referral',r.id::text,request_idempotency_key);
 return cached;
end $$;

create or replace function public.escalate_provider_referral(target_organization_id uuid,target_referral_id uuid,expected_version integer,target_reason_code text,request_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.referrals; e public.referral_escalations; cached jsonb; stored_fingerprint text; fingerprint text;
begin
 fingerprint:=jsonb_build_object('providerOrganizationId',target_organization_id,'referralId',target_referral_id,'expectedVersion',expected_version,'reasonCode',target_reason_code)::text;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',auth.uid()::text,'referral.escalate',request_idempotency_key::text),0));
 r:=private.assert_provider_referral(target_organization_id,target_referral_id);
 select response,request_fingerprint into cached,stored_fingerprint from public.provider_operation_receipts where actor_user_id=auth.uid() and operation='referral.escalate' and idempotency_key=request_idempotency_key;
 if cached is not null then if stored_fingerprint<>fingerprint then raise exception 'Idempotency key reused with different request' using errcode='22023'; end if; return cached; end if;
 if r.version<>expected_version then raise exception 'Referral version conflict' using errcode='40001'; end if;
 if r.provider_status not in('queued','appointment_booked') then raise exception 'Referral cannot be escalated in its current state' using errcode='22023'; end if;
 insert into public.referral_escalations(referral_id,provider_organization_id,employee_organization_id,owner_user_id,reason_code) values(r.id,target_organization_id,r.organization_id,r.owner_user_id,target_reason_code) returning * into e;
 update public.referrals set provider_status='urgent_escalated',version=version+1,updated_at=now() where id=r.id;
 cached:=jsonb_build_object('escalationId',e.id,'status',e.status,'referralVersion',r.version+1);
 insert into public.provider_operation_receipts(provider_organization_id,actor_user_id,operation,referral_id,subject_user_id,idempotency_key,request_fingerprint,response)
 values(target_organization_id,auth.uid(),'referral.escalate',r.id,r.owner_user_id,request_idempotency_key,fingerprint,cached);
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,resource_id,correlation_id) values(auth.uid(),target_organization_id,'referral.urgent_escalated','referral',r.id::text,request_idempotency_key);
 return cached;
end $$;

create or replace function public.confirm_provider_outcome(target_organization_id uuid,target_referral_id uuid,expected_version integer,target_outcome_code text,target_completed_at timestamptz,request_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.referrals; o public.clinical_outcomes; cached jsonb; stored_fingerprint text; fingerprint text;
begin
 fingerprint:=jsonb_build_object('providerOrganizationId',target_organization_id,'referralId',target_referral_id,'expectedVersion',expected_version,'outcomeCode',target_outcome_code,'completedAt',target_completed_at)::text;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',auth.uid()::text,'outcome.confirm',request_idempotency_key::text),0));
 r:=private.assert_provider_referral(target_organization_id,target_referral_id);
 select response,request_fingerprint into cached,stored_fingerprint from public.provider_operation_receipts where actor_user_id=auth.uid() and operation='outcome.confirm' and idempotency_key=request_idempotency_key;
 if cached is not null then if stored_fingerprint<>fingerprint then raise exception 'Idempotency key reused with different request' using errcode='22023'; end if; return cached; end if;
 if r.version<>expected_version then raise exception 'Referral version conflict' using errcode='40001'; end if;
 if r.provider_status not in('appointment_booked','urgent_escalated')
   or target_completed_at<greatest(r.created_at,coalesce((select scheduled_at from public.referral_appointments where referral_id=r.id),r.created_at))
   or target_completed_at>now()+interval '5 minutes' then raise exception 'Referral cannot record this outcome' using errcode='22023'; end if;
 insert into public.clinical_outcomes(referral_id,provider_organization_id,employee_organization_id,owner_user_id,outcome_code,completed_at) values(r.id,target_organization_id,r.organization_id,r.owner_user_id,target_outcome_code,target_completed_at)
 returning * into o;
 update public.referrals set provider_status='outcome_confirmed',version=version+1,updated_at=now() where id=r.id;
 cached:=jsonb_build_object('outcomeId',o.id,'status','outcome_confirmed','referralVersion',r.version+1);
 insert into public.provider_operation_receipts(provider_organization_id,actor_user_id,operation,referral_id,subject_user_id,idempotency_key,request_fingerprint,response)
 values(target_organization_id,auth.uid(),'outcome.confirm',r.id,r.owner_user_id,request_idempotency_key,fingerprint,cached);
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,resource_id,correlation_id) values(auth.uid(),target_organization_id,'outcome.confirmed','referral',r.id::text,request_idempotency_key);
 return cached;
end $$;

create or replace function public.get_employer_outcomes(target_organization_id uuid,target_from timestamptz,target_to timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare cohort_size integer; screened integer; next_step integer; completed integer; result jsonb;
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employer_admin']::public.organization_role[]) then raise exception 'Employer membership required' using errcode='42501'; end if;
 if target_from<>(date_trunc('month',target_from at time zone 'UTC') at time zone 'UTC') or target_to<>target_from+interval '1 month' or target_to>date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' then
  raise exception 'Only completed UTC calendar months are available' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',target_organization_id::text,target_from::text,target_to::text),0));
 select response into result from public.employer_outcome_reports where organization_id=target_organization_id and period_from=target_from and period_to=target_to;
 if result is not null then
  insert into public.audit_events(actor_user_id,organization_id,action,resource_type,metadata) values(auth.uid(),target_organization_id,'employer.outcomes_viewed','aggregate_report',jsonb_build_object('from',target_from,'to',target_to,'snapshot',true));
  return result;
 end if;
 select count(*) into cohort_size from public.organization_memberships where organization_id=target_organization_id and role='employee' and status='active' and created_at<target_to;
 if cohort_size<20 then raise exception 'Cohort privacy threshold not met' using errcode='42501'; end if;
 with screened_cohort as (
  select distinct s.owner_user_id from public.screenings s where s.organization_id=target_organization_id and s.status='completed' and s.completed_at>=target_from and s.completed_at<target_to
 ), next_step_cohort as (
  select distinct r.id,r.owner_user_id from public.referrals r join screened_cohort sc on sc.owner_user_id=r.owner_user_id
  where r.organization_id=target_organization_id and r.priority in('review_recommended','urgent') and r.created_at>=target_from and r.created_at<target_to
 )
 select (select count(*) from screened_cohort),(select count(*) from next_step_cohort),
  (select count(*) from next_step_cohort n where exists(select 1 from public.clinical_outcomes o where o.referral_id=n.id and o.completed_at<target_to))
 into screened,next_step,completed;
 result:=jsonb_build_object(
  'cohortSize',cohort_size,
  'screened',case when screened>=5 and cohort_size-screened>=5 then to_jsonb(screened) else 'null'::jsonb end,
  'nextStep',case when next_step>=5 and screened-next_step>=5 then to_jsonb(next_step) else 'null'::jsonb end,
  'completedCareLoops',case when next_step>=5 and completed>=5 and next_step-completed>=5 then to_jsonb(completed) else 'null'::jsonb end,
  'screeningRate',case when screened>=5 and cohort_size-screened>=5 then to_jsonb(round(100.0*screened/cohort_size,1)) else 'null'::jsonb end,
  'completionRate',case when next_step>=5 and completed>=5 and next_step-completed>=5 then to_jsonb(round(100.0*completed/next_step,1)) else 'null'::jsonb end,
  'privacyThreshold',20,'cellSuppressionThreshold',5,'from',target_from,'to',target_to);
 insert into public.employer_outcome_reports(organization_id,period_from,period_to,response) values(target_organization_id,target_from,target_to,result);
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,metadata) values(auth.uid(),target_organization_id,'employer.outcomes_viewed','aggregate_report',jsonb_build_object('from',target_from,'to',target_to,'cohortSize',cohort_size));
 return result;
end $$;

-- Slice 3 adds restrictive referral children, so the production deletion worker
-- must erase them before deleting the parent referral under the same lease.
create or replace function public.complete_employee_data_deletion(target_request_id uuid,target_worker_token uuid)
returns public.data_deletion_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare request_row public.data_deletion_requests; subject uuid;
begin
 select * into request_row from public.data_deletion_requests where id=target_request_id and status='processing' and worker_token=target_worker_token for update;
 if request_row.id is null then raise exception 'Active deletion lease not found' using errcode='42501'; end if;
 subject:=request_row.owner_subject;
 delete from public.provider_operation_receipts where subject_user_id=subject and referral_id in
  (select id from public.referrals where organization_id=request_row.organization_id and owner_user_id=subject);
 delete from public.clinical_outcomes where employee_organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.referral_escalations where employee_organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.referral_appointments where employee_organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.referrals where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.care_pathways where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.screening_results where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.screening_measurements where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.screenings where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.vision_recommendations where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.clinic_documents where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.data_consents where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.organization_memberships where organization_id=request_row.organization_id and user_id=subject and role='employee';
 update public.data_deletion_requests set status='completed',processed_at=now(),owner_user_id=null,worker_token=null,lease_expires_at=null where id=request_row.id returning * into request_row;
 return request_row;
end $$;

revoke all on function public.assign_employee_referral_provider(uuid,uuid,uuid,integer,uuid) from public;
revoke all on function public.consent_and_assign_employee_referral_provider(uuid,uuid,uuid,integer,uuid) from public;
revoke all on function public.get_provider_queue(uuid,public.screening_outcome,text,text,integer,integer) from public;
revoke all on function public.get_provider_referral(uuid,uuid) from public;
revoke all on function public.book_provider_appointment(uuid,uuid,integer,timestamptz,uuid) from public;
revoke all on function public.escalate_provider_referral(uuid,uuid,integer,text,uuid) from public;
revoke all on function public.confirm_provider_outcome(uuid,uuid,integer,text,timestamptz,uuid) from public;
revoke all on function public.get_employer_outcomes(uuid,timestamptz,timestamptz) from public;
grant execute on function public.assign_employee_referral_provider(uuid,uuid,uuid,integer,uuid),public.consent_and_assign_employee_referral_provider(uuid,uuid,uuid,integer,uuid),public.get_provider_queue(uuid,public.screening_outcome,text,text,integer,integer),public.get_provider_referral(uuid,uuid),public.book_provider_appointment(uuid,uuid,integer,timestamptz,uuid),public.escalate_provider_referral(uuid,uuid,integer,text,uuid),public.confirm_provider_outcome(uuid,uuid,integer,text,timestamptz,uuid),public.get_employer_outcomes(uuid,timestamptz,timestamptz) to authenticated;

commit;
