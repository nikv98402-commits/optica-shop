-- ViLu closed-pilot provisioning. Run with psql/supabase db shell as a trusted
-- operator and pass UUIDs with -v. This file never creates Auth users or care
-- data and never enables a feature flag.
-- Required variables:
--   pilot_marker
--   employer_org_id, provider_org_id
--   employee_user_id, employer_admin_user_id, provider_staff_user_id

\set ON_ERROR_STOP on
\set QUIET on

begin;

set local vilu_pilot.marker = :'pilot_marker';
set local vilu_pilot.employer_org_id = :'employer_org_id';
set local vilu_pilot.provider_org_id = :'provider_org_id';
set local vilu_pilot.employee_user_id = :'employee_user_id';
set local vilu_pilot.employer_admin_user_id = :'employer_admin_user_id';
set local vilu_pilot.provider_staff_user_id = :'provider_staff_user_id';

create table if not exists private.vilu_closed_pilot_registry (
  pilot_marker uuid primary key,
  employer_organization_id uuid not null unique references public.organizations(id) on delete restrict,
  provider_organization_id uuid not null unique references public.organizations(id) on delete restrict,
  employee_user_id uuid not null unique,
  employer_admin_user_id uuid not null unique,
  provider_staff_user_id uuid not null unique,
  created_at timestamptz not null default now(),
  check (employer_organization_id <> provider_organization_id),
  check (employee_user_id <> employer_admin_user_id),
  check (employee_user_id <> provider_staff_user_id),
  check (employer_admin_user_id <> provider_staff_user_id)
);

revoke all on private.vilu_closed_pilot_registry from public, anon, authenticated;

do $preflight$
declare
  expected_ids uuid[] := array[
    current_setting('vilu_pilot.employee_user_id')::uuid,
    current_setting('vilu_pilot.employer_admin_user_id')::uuid,
    current_setting('vilu_pilot.provider_staff_user_id')::uuid
  ];
begin
  perform current_setting('vilu_pilot.marker')::uuid;
  if cardinality(expected_ids) <> cardinality(array(
    select distinct user_id from unnest(expected_ids) as pilot_user(user_id)
  )) then
    raise exception 'Pilot Auth user IDs must be distinct';
  end if;
  perform id
  from auth.users
  where id = any(expected_ids)
  order by id
  for update;
  if (select count(*) from auth.users where id = any(expected_ids)) <> 3 then
    raise exception 'All three pilot Auth users must exist before provisioning';
  end if;
  if exists (
    select 1
    from auth.users
    where id = any(expected_ids)
      and coalesce(raw_app_meta_data ->> 'vilu_closed_pilot_marker', '')
        <> current_setting('vilu_pilot.marker')
  ) then
    raise exception 'All pilot Auth users must carry the matching closed-pilot marker';
  end if;
  if current_setting('vilu_pilot.employer_org_id')::uuid = current_setting('vilu_pilot.provider_org_id')::uuid then
    raise exception 'Pilot organization IDs must be distinct';
  end if;
  if exists (
    select 1
    from private.vilu_closed_pilot_registry
    where pilot_marker = current_setting('vilu_pilot.marker')::uuid
      and (
        employer_organization_id <> current_setting('vilu_pilot.employer_org_id')::uuid
        or provider_organization_id <> current_setting('vilu_pilot.provider_org_id')::uuid
        or employee_user_id <> current_setting('vilu_pilot.employee_user_id')::uuid
        or employer_admin_user_id <> current_setting('vilu_pilot.employer_admin_user_id')::uuid
        or provider_staff_user_id <> current_setting('vilu_pilot.provider_staff_user_id')::uuid
      )
  ) or exists (
    select 1
    from private.vilu_closed_pilot_registry
    where pilot_marker <> current_setting('vilu_pilot.marker')::uuid
      and (
        employer_organization_id = current_setting('vilu_pilot.employer_org_id')::uuid
        or provider_organization_id = current_setting('vilu_pilot.provider_org_id')::uuid
        or employee_user_id = any(expected_ids)
        or employer_admin_user_id = any(expected_ids)
        or provider_staff_user_id = any(expected_ids)
      )
  ) then
    raise exception 'Pilot marker is already bound to different organizations or users';
  end if;
  if not exists (
    select 1 from private.vilu_closed_pilot_registry
    where pilot_marker = current_setting('vilu_pilot.marker')::uuid
  ) and (
    exists (
      select 1 from public.organizations
      where id in (
        current_setting('vilu_pilot.employer_org_id')::uuid,
        current_setting('vilu_pilot.provider_org_id')::uuid
      )
    ) or exists (
      select 1 from public.organization_memberships where user_id = any(expected_ids)
    )
  ) then
    raise exception 'Fresh pilot identities must not reuse existing organizations or memberships';
  end if;
end
$preflight$;

insert into public.organizations (id, name, organization_type, country_code)
values
  (:'employer_org_id'::uuid, 'ViLu closed pilot employer', 'employer', 'RU'),
  (:'provider_org_id'::uuid, 'ViLu closed pilot provider', 'provider', 'RU')
on conflict (id) do nothing;

insert into private.vilu_closed_pilot_registry (
  pilot_marker,
  employer_organization_id,
  provider_organization_id,
  employee_user_id,
  employer_admin_user_id,
  provider_staff_user_id
)
values (
  :'pilot_marker'::uuid,
  :'employer_org_id'::uuid,
  :'provider_org_id'::uuid,
  :'employee_user_id'::uuid,
  :'employer_admin_user_id'::uuid,
  :'provider_staff_user_id'::uuid
)
on conflict (pilot_marker) do nothing;

do $registry_assertions$
begin
  if not exists (
    select 1
    from private.vilu_closed_pilot_registry
    where pilot_marker = current_setting('vilu_pilot.marker')::uuid
      and employer_organization_id = current_setting('vilu_pilot.employer_org_id')::uuid
      and provider_organization_id = current_setting('vilu_pilot.provider_org_id')::uuid
      and employee_user_id = current_setting('vilu_pilot.employee_user_id')::uuid
      and employer_admin_user_id = current_setting('vilu_pilot.employer_admin_user_id')::uuid
      and provider_staff_user_id = current_setting('vilu_pilot.provider_staff_user_id')::uuid
  ) then
    raise exception 'Pilot registry binding changed during provisioning';
  end if;
end
$registry_assertions$;

do $organization_assertions$
begin
  if not exists (
    select 1 from public.organizations
    where id = current_setting('vilu_pilot.employer_org_id')::uuid
      and name = 'ViLu closed pilot employer'
      and organization_type = 'employer'
      and country_code = 'RU'
  ) then
    raise exception 'Employer organization ID conflicts with an existing organization';
  end if;
  if not exists (
    select 1 from public.organizations
    where id = current_setting('vilu_pilot.provider_org_id')::uuid
      and name = 'ViLu closed pilot provider'
      and organization_type = 'provider'
      and country_code = 'RU'
  ) then
    raise exception 'Provider organization ID conflicts with an existing organization';
  end if;
end
$organization_assertions$;

insert into public.organization_memberships (organization_id, user_id, role, status)
values
  (:'employer_org_id'::uuid, :'employee_user_id'::uuid, 'employee', 'active'),
  (:'employer_org_id'::uuid, :'employer_admin_user_id'::uuid, 'employer_admin', 'active'),
  (:'provider_org_id'::uuid, :'provider_staff_user_id'::uuid, 'provider_staff', 'active')
on conflict (organization_id, user_id, role) do nothing;

do $membership_assertions$
begin
  if exists (
    select 1
    from public.organization_memberships
    where user_id in (
      current_setting('vilu_pilot.employee_user_id')::uuid,
      current_setting('vilu_pilot.employer_admin_user_id')::uuid,
      current_setting('vilu_pilot.provider_staff_user_id')::uuid
    )
      and (organization_id, user_id, role) not in (
        (current_setting('vilu_pilot.employer_org_id')::uuid, current_setting('vilu_pilot.employee_user_id')::uuid, 'employee'::public.organization_role),
        (current_setting('vilu_pilot.employer_org_id')::uuid, current_setting('vilu_pilot.employer_admin_user_id')::uuid, 'employer_admin'::public.organization_role),
        (current_setting('vilu_pilot.provider_org_id')::uuid, current_setting('vilu_pilot.provider_staff_user_id')::uuid, 'provider_staff'::public.organization_role)
      )
  ) then
    raise exception 'Pilot Auth users must not have memberships outside the registered pilot roles';
  end if;
  if (
    select count(*) from public.organization_memberships
    where status = 'active'
      and (organization_id, user_id, role) in (
        (current_setting('vilu_pilot.employer_org_id')::uuid, current_setting('vilu_pilot.employee_user_id')::uuid, 'employee'::public.organization_role),
        (current_setting('vilu_pilot.employer_org_id')::uuid, current_setting('vilu_pilot.employer_admin_user_id')::uuid, 'employer_admin'::public.organization_role),
        (current_setting('vilu_pilot.provider_org_id')::uuid, current_setting('vilu_pilot.provider_staff_user_id')::uuid, 'provider_staff'::public.organization_role)
      )
  ) <> 3 then
    raise exception 'Pilot memberships conflict with existing membership state';
  end if;
  if (
    select count(*) from public.organization_memberships
    where organization_id in (
      current_setting('vilu_pilot.employer_org_id')::uuid,
      current_setting('vilu_pilot.provider_org_id')::uuid
    )
  ) <> 3 then
    raise exception 'Closed pilot organizations must have exactly three memberships';
  end if;
end
$membership_assertions$;

insert into public.organization_feature_flags (organization_id, feature_key, enabled)
select organization_id, feature_key, false
from (
  values
    (:'employer_org_id'::uuid, 'vilu_auth_v2'),
    (:'employer_org_id'::uuid, 'vilu_employee_flow_v2'),
    (:'employer_org_id'::uuid, 'vilu_passport_profile_v2'),
    (:'employer_org_id'::uuid, 'vilu_employer_outcomes_v2'),
    (:'provider_org_id'::uuid, 'vilu_auth_v2'),
    (:'provider_org_id'::uuid, 'vilu_provider_queue_v2')
) as pilot_flags(organization_id, feature_key)
on conflict (organization_id, feature_key) do nothing;

do $flag_assertions$
begin
  if exists (
    select 1 from public.organization_feature_flags
    where organization_id in (
      current_setting('vilu_pilot.employer_org_id')::uuid,
      current_setting('vilu_pilot.provider_org_id')::uuid
    )
      and enabled
  ) then
    raise exception 'Provisioning refuses to run after pilot flags have been enabled';
  end if;
  if (
    select count(*) from public.organization_feature_flags
    where (organization_id = current_setting('vilu_pilot.employer_org_id')::uuid and feature_key in (
      'vilu_auth_v2', 'vilu_employee_flow_v2', 'vilu_passport_profile_v2',
      'vilu_employer_outcomes_v2'
    )) or (organization_id = current_setting('vilu_pilot.provider_org_id')::uuid and feature_key in (
      'vilu_auth_v2', 'vilu_provider_queue_v2'
    ))
  ) <> 6 then
    raise exception 'Pilot organization feature matrix is incomplete';
  end if;
  if exists (
    select 1 from public.organization_feature_flags
    where (organization_id = current_setting('vilu_pilot.employer_org_id')::uuid and feature_key not in (
      'vilu_auth_v2', 'vilu_employee_flow_v2', 'vilu_passport_profile_v2',
      'vilu_employer_outcomes_v2'
    )) or (organization_id = current_setting('vilu_pilot.provider_org_id')::uuid and feature_key not in (
      'vilu_auth_v2', 'vilu_provider_queue_v2'
    ))
  ) then
    raise exception 'Pilot organizations contain feature rows outside the approved matrix';
  end if;
  if exists (
    select 1 from public.organization_feature_flags
    where enabled
      and organization_id not in (
        current_setting('vilu_pilot.employer_org_id')::uuid,
        current_setting('vilu_pilot.provider_org_id')::uuid
      )
      and feature_key in (
        'vilu_auth_v2', 'vilu_employee_flow_v2', 'vilu_passport_profile_v2',
        'vilu_employer_outcomes_v2', 'vilu_provider_queue_v2'
      )
  ) then
    raise exception 'A protected ViLu feature is enabled outside the closed pilot allowlist';
  end if;
end
$flag_assertions$;

commit;

\set QUIET off
select id as pilot_organization_id, organization_type
from public.organizations
where id in (:'employer_org_id'::uuid, :'provider_org_id'::uuid)
order by organization_type;
select pilot_marker
from private.vilu_closed_pilot_registry
where pilot_marker = :'pilot_marker'::uuid;
select count(*) as active_pilot_memberships
from public.organization_memberships
where (organization_id = :'employer_org_id'::uuid and role in ('employee', 'employer_admin'))
   or (organization_id = :'provider_org_id'::uuid and role = 'provider_staff');
select count(*) as disabled_pilot_flags
from public.organization_feature_flags
where organization_id in (:'employer_org_id'::uuid, :'provider_org_id'::uuid)
  and not enabled;
