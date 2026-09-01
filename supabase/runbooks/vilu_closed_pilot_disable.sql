-- Data-preserving closed-pilot kill switch. This only disables organization
-- flags. It does not delete users, memberships, clinical data, or files.
\set ON_ERROR_STOP on
\set QUIET on

begin;

set local vilu_pilot.marker = :'pilot_marker';
set local vilu_pilot.employer_org_id = :'employer_org_id';
set local vilu_pilot.provider_org_id = :'provider_org_id';

do $preflight$
begin
  perform current_setting('vilu_pilot.marker')::uuid;
  if current_setting('vilu_pilot.employer_org_id')::uuid = current_setting('vilu_pilot.provider_org_id')::uuid then
    raise exception 'Pilot organization IDs must be distinct';
  end if;
  if not exists (
    select 1
    from private.vilu_closed_pilot_registry
    where pilot_marker = current_setting('vilu_pilot.marker')::uuid
      and employer_organization_id = current_setting('vilu_pilot.employer_org_id')::uuid
      and provider_organization_id = current_setting('vilu_pilot.provider_org_id')::uuid
  ) then
    raise exception 'Pilot marker is not bound to the supplied organizations';
  end if;
end
$preflight$;

update public.organization_feature_flags
set enabled = false, updated_at = now()
where organization_id in (:'employer_org_id'::uuid, :'provider_org_id'::uuid)
  and feature_key in (
    'vilu_auth_v2',
    'vilu_employee_flow_v2',
    'vilu_passport_profile_v2',
    'vilu_employer_outcomes_v2',
    'vilu_provider_queue_v2'
  );

do $assertions$
begin
  if exists (
    select 1 from public.organization_feature_flags
    where organization_id in (
      current_setting('vilu_pilot.employer_org_id')::uuid,
      current_setting('vilu_pilot.provider_org_id')::uuid
    )
      and feature_key in (
        'vilu_auth_v2',
        'vilu_employee_flow_v2',
        'vilu_passport_profile_v2',
        'vilu_employer_outcomes_v2',
        'vilu_provider_queue_v2'
      )
      and enabled
  ) then
    raise exception 'Pilot rollback did not disable every organization feature flag';
  end if;
end
$assertions$;

commit;

\set QUIET off
select organization_id, count(*) as disabled_flags
from public.organization_feature_flags
where organization_id in (:'employer_org_id'::uuid, :'provider_org_id'::uuid)
  and not enabled
group by organization_id
order by organization_id;
