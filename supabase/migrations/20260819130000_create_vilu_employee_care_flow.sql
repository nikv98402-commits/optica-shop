begin;

do $$ begin
  create type public.screening_status as enum ('in_progress', 'completed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.screening_outcome as enum ('routine', 'review_recommended', 'urgent');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.care_pathway_status as enum ('recommended', 'referral_created');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.referral_status as enum ('created');
exception when duplicate_object then null;
end $$;

create table if not exists public.screenings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  flow_id text not null check (flow_id = 'adult-comfort'),
  protocol_version text not null check (char_length(protocol_version) between 1 and 40),
  scoring_version text not null check (char_length(scoring_version) between 1 and 40),
  status public.screening_status not null default 'in_progress',
  version integer not null default 1 check (version > 0),
  idempotency_key uuid not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, owner_user_id, idempotency_key)
);

create table if not exists public.screening_measurements (
  screening_id uuid primary key references public.screenings(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  current_step integer not null default 0 check (current_step between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.screening_results (
  screening_id uuid primary key references public.screenings(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  outcome public.screening_outcome not null,
  total_score integer not null check (total_score between 0 and 12),
  review_within_days integer check (review_within_days in (0, 30, 365)),
  protocol_version text not null,
  scoring_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.care_pathways (
  id uuid primary key default gen_random_uuid(),
  screening_id uuid not null unique references public.screenings(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status public.care_pathway_status not null default 'recommended',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  care_pathway_id uuid not null unique references public.care_pathways(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status public.referral_status not null default 'created',
  priority public.screening_outcome not null,
  respond_by timestamptz not null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, owner_user_id, idempotency_key)
);

create index if not exists screenings_owner_org_created_idx
  on public.screenings (owner_user_id, organization_id, created_at desc);
create unique index if not exists screenings_one_in_progress_per_owner_org_idx
  on public.screenings (organization_id, owner_user_id)
  where status = 'in_progress';
create index if not exists referrals_owner_org_created_idx
  on public.referrals (owner_user_id, organization_id, created_at desc);

alter table public.screenings enable row level security;
alter table public.screening_measurements enable row level security;
alter table public.screening_results enable row level security;
alter table public.care_pathways enable row level security;
alter table public.referrals enable row level security;

create policy screenings_select_own on public.screenings for select to authenticated using (
  owner_user_id = auth.uid()
  and private.has_org_role(organization_id, array['employee']::public.organization_role[])
);
create policy screening_measurements_select_own on public.screening_measurements for select to authenticated using (
  owner_user_id = auth.uid()
  and private.has_org_role(organization_id, array['employee']::public.organization_role[])
);
create policy screening_results_select_own on public.screening_results for select to authenticated using (
  owner_user_id = auth.uid()
  and private.has_org_role(organization_id, array['employee']::public.organization_role[])
);
create policy care_pathways_select_own on public.care_pathways for select to authenticated using (
  owner_user_id = auth.uid()
  and private.has_org_role(organization_id, array['employee']::public.organization_role[])
);
create policy referrals_select_own on public.referrals for select to authenticated using (
  owner_user_id = auth.uid()
  and private.has_org_role(organization_id, array['employee']::public.organization_role[])
);

grant select on public.screenings, public.screening_measurements, public.screening_results,
  public.care_pathways, public.referrals to authenticated;
revoke insert, update, delete on public.screenings, public.screening_measurements, public.screening_results,
  public.care_pathways, public.referrals from anon, authenticated;

create or replace function public.start_employee_screening(
  target_organization_id uuid,
  request_idempotency_key uuid
)
returns public.screenings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare result public.screenings;
begin
  if auth.uid() is null or not private.has_org_role(target_organization_id, array['employee']::public.organization_role[]) then
    raise exception 'Employee membership required' using errcode = '42501';
  end if;

  insert into public.screenings (
    organization_id, owner_user_id, flow_id, protocol_version, scoring_version, idempotency_key
  ) values (
    target_organization_id, auth.uid(), 'adult-comfort', 'adult-comfort-v1', 'attention-v1', request_idempotency_key
  )
  on conflict do nothing
  returning * into result;

  if result.id is null then
    select * into strict result from public.screenings
    where organization_id = target_organization_id
      and owner_user_id = auth.uid()
      and (idempotency_key = request_idempotency_key or status = 'in_progress')
    order by (idempotency_key = request_idempotency_key) desc, created_at desc
    limit 1;
  else
    insert into public.audit_events (actor_user_id, organization_id, action, resource_type, resource_id)
    values (auth.uid(), target_organization_id, 'screening.started', 'screening', result.id::text);
  end if;
  return result;
end;
$$;

create or replace function public.save_employee_screening_progress(
  target_organization_id uuid,
  target_screening_id uuid,
  expected_version integer,
  target_current_step integer,
  submitted_answers jsonb
)
returns public.screenings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_screening public.screenings;
  answer_count integer;
  distinct_answer_count integer;
  normalized_answers jsonb;
begin
  select * into current_screening from public.screenings
    where id = target_screening_id and organization_id = target_organization_id for update;
  if current_screening.id is null
     or current_screening.owner_user_id <> auth.uid()
     or not private.has_org_role(target_organization_id, array['employee']::public.organization_role[]) then
    raise exception 'Screening not found' using errcode = '42501';
  end if;
  if current_screening.status <> 'in_progress' then
    raise exception 'Only an in-progress screening can be saved' using errcode = '22023';
  end if;
  if current_screening.version <> expected_version then
    raise exception 'Screening version conflict' using errcode = '40001';
  end if;
  if target_current_step not between 0 and 3 or jsonb_typeof(submitted_answers) <> 'array' then
    raise exception 'Invalid screening progress' using errcode = '22023';
  end if;

  select count(*), count(distinct item->>'questionId')
    into answer_count, distinct_answer_count
  from jsonb_array_elements(submitted_answers) item
  where item ? 'questionId' and item ? 'score'
    and (item->>'questionId') in ('comfort', 'distance', 'one-eye', 'distortion')
    and (item->>'score') ~ '^[0-3]$';
  if jsonb_array_length(submitted_answers) <> answer_count
     or answer_count <> distinct_answer_count
     or answer_count <> target_current_step then
    raise exception 'Progress answers must match the current step' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'questionId', item->>'questionId', 'score', (item->>'score')::integer
  ) order by item->>'questionId'), '[]'::jsonb)
    into normalized_answers from jsonb_array_elements(submitted_answers) item;

  insert into public.screening_measurements (
    screening_id, owner_user_id, organization_id, answers, current_step
  ) values (
    current_screening.id, auth.uid(), target_organization_id, normalized_answers, target_current_step
  ) on conflict (screening_id) do update set
    answers = excluded.answers, current_step = excluded.current_step, updated_at = now();

  update public.screenings set version = version + 1, updated_at = now()
    where id = current_screening.id returning * into current_screening;
  return current_screening;
end;
$$;

create or replace function public.complete_employee_screening(
  target_organization_id uuid,
  target_screening_id uuid,
  expected_version integer,
  submitted_answers jsonb
)
returns table (screening public.screenings, result public.screening_results)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_screening public.screenings;
  answer_count integer;
  distinct_answer_count integer;
  score integer;
  has_urgent boolean;
  computed_outcome public.screening_outcome;
  review_days integer;
  normalized_answers jsonb;
begin
  select * into current_screening from public.screenings
    where id = target_screening_id and organization_id = target_organization_id for update;
  if current_screening.id is null
     or current_screening.owner_user_id <> auth.uid()
     or not private.has_org_role(target_organization_id, array['employee']::public.organization_role[]) then
    raise exception 'Screening not found' using errcode = '42501';
  end if;

  if current_screening.status = 'completed' then
    return query select current_screening, r from public.screening_results r where r.screening_id = current_screening.id;
    return;
  end if;
  if current_screening.version <> expected_version then
    raise exception 'Screening version conflict' using errcode = '40001';
  end if;
  if jsonb_typeof(submitted_answers) <> 'array' then
    raise exception 'Answers must be an array' using errcode = '22023';
  end if;

  select count(*), count(distinct item->>'questionId'), coalesce(sum((item->>'score')::integer), 0),
    coalesce(bool_or((item->>'questionId') in ('one-eye', 'distortion') and (item->>'score')::integer = 3), false)
  into answer_count, distinct_answer_count, score, has_urgent
  from jsonb_array_elements(submitted_answers) item
  where item ? 'questionId' and item ? 'score'
    and (item->>'questionId') in ('comfort', 'distance', 'one-eye', 'distortion')
    and (item->>'score') ~ '^[0-3]$';

  if jsonb_array_length(submitted_answers) <> 4 or answer_count <> 4 or distinct_answer_count <> 4 or score not between 0 and 12 then
    raise exception 'Exactly four valid answers are required' using errcode = '22023';
  end if;

  select jsonb_agg(jsonb_build_object('questionId', item->>'questionId', 'score', (item->>'score')::integer) order by item->>'questionId')
  into normalized_answers from jsonb_array_elements(submitted_answers) item;

  computed_outcome := case when has_urgent then 'urgent'::public.screening_outcome
    when score >= 4 then 'review_recommended'::public.screening_outcome
    else 'routine'::public.screening_outcome end;
  review_days := case computed_outcome when 'urgent' then 0 when 'review_recommended' then 30 else 365 end;

  insert into public.screening_measurements (screening_id, owner_user_id, organization_id, answers, current_step)
  values (current_screening.id, auth.uid(), current_screening.organization_id, normalized_answers, 3)
  on conflict (screening_id) do update set answers = excluded.answers, current_step = excluded.current_step, updated_at = now();
  insert into public.screening_results (
    screening_id, owner_user_id, organization_id, outcome, total_score, review_within_days,
    protocol_version, scoring_version
  ) values (
    current_screening.id, auth.uid(), current_screening.organization_id, computed_outcome, score, review_days,
    current_screening.protocol_version, current_screening.scoring_version
  );
  update public.screenings set status = 'completed', version = version + 1,
    completed_at = now(), updated_at = now() where id = current_screening.id returning * into current_screening;

  insert into public.audit_events (actor_user_id, organization_id, action, resource_type, resource_id)
  values (auth.uid(), current_screening.organization_id, 'screening.completed', 'screening', current_screening.id::text);

  return query select current_screening, r from public.screening_results r where r.screening_id = current_screening.id;
end;
$$;

create or replace function public.get_employee_screening_result(
  target_organization_id uuid,
  target_screening_id uuid
)
returns table (screening public.screenings, result public.screening_results)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  current_screening public.screenings;
begin
  select * into current_screening from public.screenings
    where id = target_screening_id and organization_id = target_organization_id;
  if current_screening.id is null
     or current_screening.owner_user_id <> auth.uid()
     or not private.has_org_role(target_organization_id, array['employee']::public.organization_role[]) then
    raise exception 'Screening not found' using errcode = '42501';
  end if;
  return query select current_screening, r from public.screening_results r
    where r.screening_id = current_screening.id and r.organization_id = target_organization_id;
end;
$$;

create or replace function public.create_employee_referral(
  target_organization_id uuid,
  target_screening_id uuid,
  request_idempotency_key uuid
)
returns public.referrals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_screening public.screenings;
  source_result public.screening_results;
  pathway public.care_pathways;
  created_referral public.referrals;
begin
  select * into source_screening from public.screenings
    where id = target_screening_id and organization_id = target_organization_id for update;
  if source_screening.id is null or source_screening.owner_user_id <> auth.uid()
     or not private.has_org_role(target_organization_id, array['employee']::public.organization_role[]) then
    raise exception 'Screening not found' using errcode = '42501';
  end if;
  select * into source_result from public.screening_results where screening_id = source_screening.id;
  if source_result.screening_id is null or source_result.outcome = 'routine' then
    raise exception 'Referral is not recommended for this screening' using errcode = '22023';
  end if;

  insert into public.care_pathways (screening_id, organization_id, owner_user_id)
  values (source_screening.id, target_organization_id, auth.uid())
  on conflict (screening_id) do update set screening_id = excluded.screening_id
  returning * into pathway;

  select * into created_referral from public.referrals where care_pathway_id = pathway.id;
  if created_referral.id is not null then
    return created_referral;
  end if;

  insert into public.referrals (
    care_pathway_id, organization_id, owner_user_id, priority, respond_by, idempotency_key
  ) values (
    pathway.id, source_screening.organization_id, auth.uid(), source_result.outcome,
    case source_result.outcome when 'urgent' then now() else now() + interval '30 days' end,
    request_idempotency_key
  )
  on conflict (care_pathway_id) do nothing
  returning * into created_referral;

  if created_referral.id is null then
    select * into strict created_referral from public.referrals where care_pathway_id = pathway.id;
  else
    update public.care_pathways set status = 'referral_created', version = version + 1, updated_at = now()
      where id = pathway.id;
    insert into public.audit_events (actor_user_id, organization_id, action, resource_type, resource_id)
    values (auth.uid(), source_screening.organization_id, 'referral.created', 'referral', created_referral.id::text);
  end if;
  return created_referral;
end;
$$;

create or replace function public.get_employee_referral(
  target_organization_id uuid,
  target_referral_id uuid
)
returns public.referrals
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  current_referral public.referrals;
begin
  select * into current_referral from public.referrals
    where id = target_referral_id and organization_id = target_organization_id;
  if current_referral.id is null
     or current_referral.owner_user_id <> auth.uid()
     or not private.has_org_role(target_organization_id, array['employee']::public.organization_role[]) then
    raise exception 'Referral not found' using errcode = '42501';
  end if;
  return current_referral;
end;
$$;

revoke all on function public.start_employee_screening(uuid, uuid) from public;
revoke all on function public.save_employee_screening_progress(uuid, uuid, integer, integer, jsonb) from public;
revoke all on function public.complete_employee_screening(uuid, uuid, integer, jsonb) from public;
revoke all on function public.get_employee_screening_result(uuid, uuid) from public;
revoke all on function public.create_employee_referral(uuid, uuid, uuid) from public;
revoke all on function public.get_employee_referral(uuid, uuid) from public;
grant execute on function public.start_employee_screening(uuid, uuid) to authenticated;
grant execute on function public.save_employee_screening_progress(uuid, uuid, integer, integer, jsonb) to authenticated;
grant execute on function public.complete_employee_screening(uuid, uuid, integer, jsonb) to authenticated;
grant execute on function public.get_employee_screening_result(uuid, uuid) to authenticated;
grant execute on function public.create_employee_referral(uuid, uuid, uuid) to authenticated;
grant execute on function public.get_employee_referral(uuid, uuid) to authenticated;

commit;
