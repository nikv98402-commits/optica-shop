begin;

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists notification_email boolean not null default true;
alter table public.profiles add column if not exists notification_push boolean not null default false;

create table public.vision_recommendations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title_key text not null check (title_key in ('review.annual','comfort.breaks','exam.follow_up')), due_at timestamptz,
  status text not null default 'active' check (status in ('active','completed','dismissed')),
  created_at timestamptz not null default now()
);
create table public.clinic_documents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider_organization_id uuid not null references public.organizations(id),
  document_type text not null check (document_type in ('visit_summary','prescription','care_plan')),
  title text not null check (char_length(title) between 1 and 160), storage_path text not null,
  issued_at timestamptz not null, created_at timestamptz not null default now(),
  constraint clinic_documents_storage_path_unique unique(storage_path),
  constraint clinic_documents_storage_path_canonical check (
    storage_path like organization_id::text||'/'||owner_user_id::text||'/%'
    and storage_path not like '%..%'
  )
);
create table public.data_consents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('program_participation','clinic_access','research')),
  granted boolean not null default false, provider_organization_id uuid references public.organizations(id),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id,owner_user_id,consent_type,provider_organization_id)
);
create table public.active_devices (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100), last_seen_at timestamptz not null default now(),
  current_device boolean not null default false, revoked_at timestamptz
);
create table public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid references auth.users(id) on delete set null,
  owner_subject uuid not null, organization_id uuid not null references public.organizations(id),
  status text not null default 'requested' check(status in ('requested','processing','completed','cancelled','failed')),
  requested_at timestamptz not null default now(), processed_at timestamptz, failure_code text,
  worker_token uuid, processing_started_at timestamptz, lease_expires_at timestamptz
  ,attempt_count integer not null default 0 check(attempt_count between 0 and 5)
  ,next_attempt_at timestamptz not null default now()
);

create index vision_recommendations_owner_org_idx on public.vision_recommendations(owner_user_id,organization_id,created_at desc);
create index clinic_documents_owner_org_idx on public.clinic_documents(owner_user_id,organization_id,issued_at desc);
create index data_consents_owner_org_idx on public.data_consents(owner_user_id,organization_id);
create unique index data_deletion_requests_one_active_idx
  on public.data_deletion_requests(owner_subject,organization_id)
  where status in ('requested','processing');
alter table public.vision_recommendations enable row level security;
alter table public.clinic_documents enable row level security;
alter table public.data_consents enable row level security;
alter table public.active_devices enable row level security;
alter table public.data_deletion_requests enable row level security;

create or replace function private.has_clinic_access(target_organization_id uuid,target_owner_user_id uuid,target_provider_organization_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.data_consents c where c.organization_id=target_organization_id
  and c.owner_user_id=target_owner_user_id and c.consent_type='clinic_access'
  and c.provider_organization_id=target_provider_organization_id and c.granted)
 and private.has_org_role(target_provider_organization_id,array['provider_staff']::public.organization_role[]);
$$;
revoke all on function private.has_clinic_access(uuid,uuid,uuid) from public;
grant execute on function private.has_clinic_access(uuid,uuid,uuid) to authenticated;

create policy recommendations_employee_own on public.vision_recommendations for select to authenticated using (
  owner_user_id=auth.uid() and private.has_org_role(organization_id,array['employee']::public.organization_role[]));
create policy documents_employee_own on public.clinic_documents for select to authenticated using (
  owner_user_id=auth.uid() and private.has_org_role(organization_id,array['employee']::public.organization_role[]));
create policy documents_provider_with_consent on public.clinic_documents for select to authenticated using (
  private.has_clinic_access(organization_id,owner_user_id,provider_organization_id));
create policy consents_employee_own on public.data_consents for select to authenticated using (
  owner_user_id=auth.uid() and private.has_org_role(organization_id,array['employee']::public.organization_role[]));
create policy devices_owner_own on public.active_devices for select to authenticated using(owner_user_id=auth.uid());
create policy deletion_requests_owner_own on public.data_deletion_requests for select to authenticated using(
  owner_user_id=auth.uid() and private.has_org_role(organization_id,array['employee']::public.organization_role[]));
grant select on public.vision_recommendations,public.clinic_documents,public.data_consents,public.active_devices,public.data_deletion_requests to authenticated;
revoke insert,update,delete on public.vision_recommendations,public.clinic_documents,public.data_consents,public.active_devices,public.data_deletion_requests from anon,authenticated;

do $$ begin
 if to_regclass('storage.buckets') is not null then
  execute $storage$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
   values('clinic-documents','clinic-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
   on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types$storage$;
  execute $storage$create policy clinic_documents_storage_employee_read on storage.objects for select to authenticated using(
   bucket_id='clinic-documents' and exists(select 1 from public.clinic_documents d where d.storage_path=name
    and d.owner_user_id=auth.uid() and private.has_org_role(d.organization_id,array['employee']::public.organization_role[])))$storage$;
  execute $storage$create policy clinic_documents_storage_provider_read on storage.objects for select to authenticated using(
   bucket_id='clinic-documents' and exists(select 1 from public.clinic_documents d where d.storage_path=name
    and private.has_clinic_access(d.organization_id,d.owner_user_id,d.provider_organization_id)))$storage$;
 end if;
end $$;

create or replace function public.get_employee_vision_passport(target_organization_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Employee membership required' using errcode='42501'; end if;
 return jsonb_build_object(
  'screenings',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'completedAt',s.completed_at,'outcome',r.outcome,'reviewWithinDays',r.review_within_days) order by s.completed_at desc) from public.screenings s join public.screening_results r on r.screening_id=s.id where s.organization_id=target_organization_id and s.owner_user_id=auth.uid()),'[]'::jsonb),
  'referrals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'priority',priority,'respondBy',respond_by,'createdAt',created_at) order by created_at desc) from public.referrals where organization_id=target_organization_id and owner_user_id=auth.uid()),'[]'::jsonb),
  'recommendations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'titleKey',title_key,'status',status,'dueAt',due_at) order by created_at desc) from public.vision_recommendations where organization_id=target_organization_id and owner_user_id=auth.uid()),'[]'::jsonb),
  'documents',coalesce((select jsonb_agg(jsonb_build_object('id',id,'type',document_type,'title',title,'storagePath',storage_path,'issuedAt',issued_at) order by issued_at desc) from public.clinic_documents where organization_id=target_organization_id and owner_user_id=auth.uid()),'[]'::jsonb),
  'nextReviewAt',(select min(candidate_at) from (
    select s.completed_at+make_interval(days=>r.review_within_days) as candidate_at
      from public.screenings s join public.screening_results r on r.screening_id=s.id
      where s.organization_id=target_organization_id and s.owner_user_id=auth.uid()
        and r.review_within_days>0 and s.completed_at+make_interval(days=>r.review_within_days)>now()
    union all
    select due_at from public.vision_recommendations
      where organization_id=target_organization_id and owner_user_id=auth.uid()
        and status='active' and due_at>now()
  ) future_reviews));
end $$;

create or replace function public.get_employee_profile_settings(target_organization_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
declare p public.profiles; org_name text;
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Employee membership required' using errcode='42501'; end if;
 select * into strict p from public.profiles where id=auth.uid(); select name into org_name from public.organizations where id=target_organization_id;
 return jsonb_build_object('displayName',p.display_name,'locale',p.locale,'region',p.region,'phone',p.phone,'birthDate',p.birth_date,'notificationEmail',p.notification_email,'notificationPush',p.notification_push,'organizationName',org_name,
  'consents',coalesce((select jsonb_agg(jsonb_build_object('type',consent_type,'granted',granted,'providerOrganizationId',provider_organization_id,'providerName',(select name from public.organizations where id=provider_organization_id))) from public.data_consents where organization_id=target_organization_id and owner_user_id=auth.uid()),'[]'::jsonb),
  'providers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.organizations where organization_type='provider'),'[]'::jsonb),
  'devices',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label,'lastSeenAt',last_seen_at,'current',current_device)) from public.active_devices where owner_user_id=auth.uid() and revoked_at is null),'[]'::jsonb),
  'deletionRequest',(select jsonb_build_object('id',id,'status',status,'requestedAt',requested_at,'processedAt',processed_at) from public.data_deletion_requests where organization_id=target_organization_id and owner_user_id=auth.uid() order by requested_at desc limit 1));
end $$;

create or replace function public.update_employee_profile_settings(target_organization_id uuid,settings jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Employee membership required' using errcode='42501'; end if;
 if settings-array['displayName','locale','region','phone','birthDate','notificationEmail','notificationPush']<>'{}'::jsonb then raise exception 'Unsupported profile field' using errcode='22023'; end if;
 if settings?'locale' and settings->>'locale' not in('ru','en') then raise exception 'Unsupported locale' using errcode='22023'; end if;
 update public.profiles set display_name=coalesce(settings->>'displayName',display_name),locale=coalesce(settings->>'locale',locale),region=case when settings?'region' then nullif(settings->>'region','') else region end,phone=case when settings?'phone' then nullif(settings->>'phone','') else phone end,birth_date=case when settings?'birthDate' then nullif(settings->>'birthDate','')::date else birth_date end,notification_email=coalesce((settings->>'notificationEmail')::boolean,notification_email),notification_push=coalesce((settings->>'notificationPush')::boolean,notification_push),updated_at=now() where id=auth.uid();
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,resource_id) values(auth.uid(),target_organization_id,'profile.updated','profile',auth.uid()::text);
 return public.get_employee_profile_settings(target_organization_id);
end $$;

create or replace function public.set_employee_consent(target_organization_id uuid,target_consent_type text,target_granted boolean,target_provider_organization_id uuid default null)
returns public.data_consents language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.data_consents;
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Employee membership required' using errcode='42501'; end if;
 if target_consent_type not in('program_participation','clinic_access','research') or (target_consent_type='clinic_access')<>(target_provider_organization_id is not null) then raise exception 'Invalid consent' using errcode='22023'; end if;
 if target_provider_organization_id is not null and not exists(select 1 from public.organizations where id=target_provider_organization_id and organization_type='provider') then raise exception 'Clinical partner required' using errcode='22023'; end if;
 insert into public.data_consents(organization_id,owner_user_id,consent_type,granted,provider_organization_id) values(target_organization_id,auth.uid(),target_consent_type,target_granted,target_provider_organization_id)
 on conflict(organization_id,owner_user_id,consent_type,provider_organization_id) do update set granted=excluded.granted,updated_at=now() returning * into result;
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,resource_id) values(auth.uid(),target_organization_id,case when target_granted then 'consent.granted' else 'consent.revoked' end,'consent',result.id::text);
 return result;
end $$;

create or replace function public.export_employee_data(target_organization_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Employee membership required' using errcode='42501'; end if;
 return jsonb_build_object('exportedAt',now(),'organizationId',target_organization_id,'profile',public.get_employee_profile_settings(target_organization_id),'visionPassport',public.get_employee_vision_passport(target_organization_id),
  'screeningMeasurements',coalesce((select jsonb_agg(to_jsonb(m)-'owner_user_id') from public.screening_measurements m where m.organization_id=target_organization_id and m.owner_user_id=auth.uid()),'[]'::jsonb),
  'carePathways',coalesce((select jsonb_agg(to_jsonb(p)-'owner_user_id') from public.care_pathways p where p.organization_id=target_organization_id and p.owner_user_id=auth.uid()),'[]'::jsonb),
  'deletionRequests',coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'requestedAt',requested_at,'processedAt',processed_at)) from public.data_deletion_requests where organization_id=target_organization_id and owner_user_id=auth.uid()),'[]'::jsonb));
end $$;

create or replace function public.request_employee_data_deletion(target_organization_id uuid)
returns public.data_deletion_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.data_deletion_requests;
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Employee membership required' using errcode='42501'; end if;
 if exists(select 1 from public.data_deletion_requests where owner_subject=auth.uid() and organization_id=target_organization_id and status in('requested','processing')) then raise exception 'Deletion already requested' using errcode='22023'; end if;
 insert into public.data_deletion_requests(owner_user_id,owner_subject,organization_id) values(auth.uid(),auth.uid(),target_organization_id) returning * into result;
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,resource_id) values(auth.uid(),target_organization_id,'deletion.requested','profile',auth.uid()::text);
 return result;
end $$;

create or replace function public.cancel_employee_data_deletion(target_organization_id uuid,target_request_id uuid)
returns public.data_deletion_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.data_deletion_requests;
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Employee membership required' using errcode='42501'; end if;
 update public.data_deletion_requests set status='cancelled',processed_at=now() where id=target_request_id and organization_id=target_organization_id and owner_user_id=auth.uid() and status='requested' returning * into result;
 if result.id is null then raise exception 'Cancellable deletion request not found' using errcode='42501'; end if;
 return result;
end $$;

create or replace function public.get_employee_data_deletion_status(target_organization_id uuid,target_request_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
declare request_row public.data_deletion_requests;
begin
 select * into request_row from public.data_deletion_requests
  where id=target_request_id and organization_id=target_organization_id and owner_subject=auth.uid();
 if auth.uid() is null or request_row.id is null then raise exception 'Deletion request not found' using errcode='42501'; end if;
 return jsonb_build_object('id',request_row.id,'status',request_row.status,'requestedAt',request_row.requested_at,'processedAt',request_row.processed_at);
end $$;

create or replace function public.list_pending_employee_data_deletions(target_limit integer default 10)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 select coalesce(jsonb_agg(jsonb_build_object(
  'requestId',id,'ownerUserId',owner_subject,'organizationId',organization_id
 ) order by requested_at), '[]'::jsonb) into result
 from (
  select id,owner_subject,organization_id,requested_at
  from public.data_deletion_requests
  where (status='requested' and next_attempt_at<=now()) or (status='processing' and lease_expires_at<=now())
  order by requested_at
  limit greatest(1,least(coalesce(target_limit,10),25))
 ) pending;
 return result;
end;
$$;

create or replace function public.claim_employee_data_deletion(target_request_id uuid,target_owner_user_id uuid,target_organization_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare request_row public.data_deletion_requests; claim_token uuid:=gen_random_uuid();
begin
 select * into request_row from public.data_deletion_requests where id=target_request_id for update;
 if request_row.id is null or request_row.owner_subject<>target_owner_user_id or request_row.organization_id<>target_organization_id then raise exception 'Deletion request not found' using errcode='42501'; end if;
 if request_row.status='processing' and request_row.lease_expires_at>now() then raise exception 'Deletion request is already processing' using errcode='55000'; end if;
 if request_row.status='processing' and request_row.attempt_count>=5 then
  update public.data_deletion_requests set status='failed',processed_at=now(),failure_code='worker_lease_exhausted',worker_token=null,lease_expires_at=null where id=request_row.id;
  return jsonb_build_object('requestId',request_row.id,'terminal',true,'failureCode','worker_lease_exhausted');
 end if;
 if request_row.status not in('requested','processing') then raise exception 'Pending deletion request not found' using errcode='22023'; end if;
 update public.data_deletion_requests set status='processing',worker_token=claim_token,processing_started_at=now(),lease_expires_at=now()+interval '5 minutes',failure_code=null,attempt_count=attempt_count+1 where id=request_row.id;
 return jsonb_build_object('requestId',request_row.id,'workerToken',claim_token,'storagePaths',coalesce((select jsonb_agg(storage_path) from public.clinic_documents where organization_id=target_organization_id and owner_user_id=target_owner_user_id),'[]'::jsonb));
end $$;

create or replace function public.complete_employee_data_deletion(target_request_id uuid,target_worker_token uuid)
returns public.data_deletion_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare request_row public.data_deletion_requests; subject uuid;
begin
 select * into request_row from public.data_deletion_requests where id=target_request_id and status='processing' and worker_token=target_worker_token for update;
 if request_row.id is null then raise exception 'Active deletion lease not found' using errcode='42501'; end if;
 subject:=request_row.owner_subject;
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

create or replace function public.fail_employee_data_deletion(target_request_id uuid,target_worker_token uuid,target_failure_code text)
returns public.data_deletion_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare request_row public.data_deletion_requests;
begin
 update public.data_deletion_requests set
  status=case when attempt_count>=5 then 'failed' else 'requested' end,
  processed_at=case when attempt_count>=5 then now() else null end,
  failure_code=left(coalesce(target_failure_code,'worker_error'),100),worker_token=null,lease_expires_at=null,
  next_attempt_at=case when attempt_count>=5 then next_attempt_at else now()+make_interval(mins=>least(60,5*attempt_count)) end
 where id=target_request_id and status='processing' and worker_token=target_worker_token returning * into request_row;
 if request_row.id is null then raise exception 'Active deletion lease not found' using errcode='42501'; end if;
 return request_row;
end $$;

revoke all on function public.get_employee_vision_passport(uuid),public.get_employee_profile_settings(uuid),public.update_employee_profile_settings(uuid,jsonb),public.set_employee_consent(uuid,text,boolean,uuid),public.export_employee_data(uuid),public.request_employee_data_deletion(uuid),public.cancel_employee_data_deletion(uuid,uuid),public.get_employee_data_deletion_status(uuid,uuid),public.list_pending_employee_data_deletions(integer),public.claim_employee_data_deletion(uuid,uuid,uuid),public.complete_employee_data_deletion(uuid,uuid),public.fail_employee_data_deletion(uuid,uuid,text) from public;
grant execute on function public.get_employee_vision_passport(uuid),public.get_employee_profile_settings(uuid),public.update_employee_profile_settings(uuid,jsonb),public.set_employee_consent(uuid,text,boolean,uuid),public.export_employee_data(uuid),public.request_employee_data_deletion(uuid),public.cancel_employee_data_deletion(uuid,uuid),public.get_employee_data_deletion_status(uuid,uuid) to authenticated;
grant execute on function public.list_pending_employee_data_deletions(integer),public.claim_employee_data_deletion(uuid,uuid,uuid),public.complete_employee_data_deletion(uuid,uuid),public.fail_employee_data_deletion(uuid,uuid,text) to service_role;
grant select on public.data_deletion_requests to service_role;
commit;
