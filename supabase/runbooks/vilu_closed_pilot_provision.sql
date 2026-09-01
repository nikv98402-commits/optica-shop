-- ViLu closed-pilot provisioning. Run with psql/supabase db shell as a trusted
-- operator and pass UUIDs with -v. This file never creates Auth users or care
-- data and never enables a feature flag.
-- Required variables:
--   employer_org_id, provider_org_id
--   employee_user_id, employer_admin_user_id, provider_staff_user_id

\set ON_ERROR_STOP on
\set QUIET on

begin;

set local vilu_pilot.employer_org_id = :'employer_org_id';
set local vilu_pilot.provider_org_id = :'provider_org_id';
set local vilu_pilot.employee_user_id = :'employee_user_id';
set local vilu_pilot.employer_admin_user_id = :'employer_admin_user_id';
set local vilu_pilot.provider_staff_user_id = :'provider_staff_user_id';

do $preflight$
declare
  expected_ids uuid[] := array[
    current_setting('vilu_pilot.employee_user_id')::uuid,
    current_setting('vilu_pilot.employer_admin_user_id')::uuid,
    current_setting('vilu_pilot.provider_staff_user_id')::uuid
  ];
begin
  if cardinality(expected_ids) <> cardinality(array(
    select distinct user_id from unnest(expected_ids) as pilot_user(user_id)
  )) then
    raise exception 'Pilot Auth user IDs must be distinct';
  end if;
  if (select count(*) from auth.users where id = any(expected_ids)) <> 3 then
    raise exception 'All three pilot Auth users must exist before provisioning';
  end if;
  if current_setting('vilu_pilot.employer_org_id')::uuid = current_setting('vilu_pilot.provider_org_id')::uuid then
    raise exception 'Pilot organization IDs must be distinct';
  end if;
end
$preflight$;

insert into public.organizations (id, name, organization_type, country_code)
values
  (:'employer_org_id'::uuid, 'ViLu closed pilot employer', 'employer', 'RU'),
  (:'provider_org_id'::uuid, 'ViLu closed pilot provider', 'provider', 'RU')
on conflict (id) do nothing;

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
    ) and status = 'active'
  ) <> 3 then
    raise exception 'Closed pilot organizations must have exactly three active memberships';
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
select count(*) as active_pilot_memberships
from public.organization_memberships
where (organization_id = :'employer_org_id'::uuid and role in ('employee', 'employer_admin'))
   or (organization_id = :'provider_org_id'::uuid and role = 'provider_staff');
select count(*) as disabled_pilot_flags
from public.organization_feature_flags
where organization_id in (:'employer_org_id'::uuid, :'provider_org_id'::uuid)
  and not enabled;
