begin;

create schema if not exists private;

do $$ begin
  create type public.organization_type as enum ('employer', 'provider');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.organization_role as enum ('employee', 'employer_admin', 'provider_staff');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.membership_status as enum ('invited', 'active', 'suspended', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  locale text not null default 'ru' check (locale in ('ru', 'en')),
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  organization_type public.organization_type not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, role)
);

create index if not exists organization_memberships_user_active_idx
  on public.organization_memberships (user_id, organization_id, role)
  where status = 'active';

create or replace function public.enforce_membership_organization_type()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_type public.organization_type;
begin
  select organization_type into target_type
  from public.organizations
  where id = new.organization_id;

  if target_type is null then
    raise exception 'Organization % does not exist', new.organization_id using errcode = '23503';
  end if;

  if (new.role in ('employee', 'employer_admin') and target_type <> 'employer')
     or (new.role = 'provider_staff' and target_type <> 'provider') then
    raise exception 'Role % is not valid for organization type %', new.role, target_type
      using errcode = '23514';
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.organization_memberships m
    join public.organizations o on o.id = m.organization_id
    where (m.role in ('employee', 'employer_admin') and o.organization_type <> 'employer')
       or (m.role = 'provider_staff' and o.organization_type <> 'provider')
  ) then
    raise exception 'Existing organization memberships contain invalid role/type combinations';
  end if;
end;
$$;

drop trigger if exists organization_memberships_enforce_type on public.organization_memberships;
create trigger organization_memberships_enforce_type
  before insert or update of organization_id, role on public.organization_memberships
  for each row execute function public.enforce_membership_organization_type();

create table if not exists public.organization_feature_flags (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feature_key text not null check (feature_key in (
    'vilu_auth_v2',
    'vilu_employee_flow_v2',
    'vilu_provider_queue_v2',
    'vilu_passport_profile_v2',
    'vilu_employer_outcomes_v2'
  )),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (organization_id, feature_key)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  correlation_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Privacy-safe product telemetry deliberately has no free-form payload column:
-- medical results, contact details, and other personal data cannot be attached.
create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_name text not null check (event_name in (
    'auth_signed_in', 'workspace_opened', 'feature_unavailable', 'access_denied'
  )),
  surface_role public.organization_role not null,
  locale text not null check (locale in ('ru', 'en')),
  created_at timestamptz not null default now()
);

create index if not exists product_events_org_created_idx
  on public.product_events (organization_id, created_at desc);

create index if not exists audit_events_org_created_idx
  on public.audit_events (organization_id, created_at desc);
create index if not exists audit_events_actor_created_idx
  on public.audit_events (actor_user_id, created_at desc);

create or replace function private.is_active_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function private.has_org_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(allowed_roles)
      and (
        (m.role in ('employee', 'employer_admin') and o.organization_type = 'employer')
        or (m.role = 'provider_staff' and o.organization_type = 'provider')
      )
  );
$$;

revoke all on function private.is_active_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, public.organization_role[]) from public;
revoke all on function public.enforce_membership_organization_type() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_active_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role[]) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'ru' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_feature_flags enable row level security;
alter table public.audit_events enable row level security;
alter table public.product_events enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select_member on public.organizations
  for select to authenticated using (private.is_active_org_member(id));

create policy memberships_select_own_or_admin on public.organization_memberships
  for select to authenticated using (
    user_id = auth.uid()
    or private.has_org_role(organization_id, array['employer_admin', 'provider_staff']::public.organization_role[])
  );

create policy organization_feature_flags_select_member on public.organization_feature_flags
  for select to authenticated using (private.is_active_org_member(organization_id));

create policy product_events_insert_own_membership on public.product_events
  for insert to authenticated with check (
    actor_user_id = auth.uid()
    and private.is_active_org_member(organization_id)
    and private.has_org_role(organization_id, array[surface_role]::public.organization_role[])
  );

-- audit_events intentionally has no client policies. Writes happen only in
-- trusted RPCs/Edge Functions and reads through audited administrative tools.

grant select, update on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.organization_feature_flags to authenticated;
revoke all on public.audit_events from anon, authenticated;
grant insert on public.product_events to authenticated;
grant usage, select on sequence public.product_events_id_seq to authenticated;
revoke select, update, delete on public.product_events from anon, authenticated;

commit;
