begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-employee@example.test', '', now(), now(), now()),
  ('11000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-admin@example.test', '', now(), now(), now()),
  ('11000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pilot-provider@example.test', '', now(), now(), now()),
  ('11000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'non-pilot@example.test', '', now(), now(), now());

insert into public.organizations (id, name, organization_type, country_code)
values
  ('21000000-0000-4000-8000-000000000001', 'ViLu closed pilot employer', 'employer', 'RU'),
  ('21000000-0000-4000-8000-000000000002', 'ViLu closed pilot provider', 'provider', 'RU'),
  ('21000000-0000-4000-8000-000000000003', 'Non-pilot employer', 'employer', 'RU')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, status)
values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'employee', 'active'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 'employer_admin', 'active'),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000003', 'provider_staff', 'active')
on conflict (organization_id, user_id, role) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, status)
values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'employee', 'active'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 'employer_admin', 'active'),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000003', 'provider_staff', 'active')
on conflict (organization_id, user_id, role) do nothing;

insert into public.organization_feature_flags (organization_id, feature_key, enabled)
values
  ('21000000-0000-4000-8000-000000000001', 'vilu_auth_v2', false),
  ('21000000-0000-4000-8000-000000000001', 'vilu_employee_flow_v2', false),
  ('21000000-0000-4000-8000-000000000001', 'vilu_passport_profile_v2', false),
  ('21000000-0000-4000-8000-000000000001', 'vilu_employer_outcomes_v2', false),
  ('21000000-0000-4000-8000-000000000002', 'vilu_auth_v2', false),
  ('21000000-0000-4000-8000-000000000002', 'vilu_provider_queue_v2', false)
on conflict (organization_id, feature_key) do nothing;

select is((select count(*)::int from public.organizations where id in (
  '21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002'
)), 2, 'provisioning creates exactly two pilot organizations');
select is((select count(*)::int from public.organization_memberships where organization_id in (
  '21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002'
)), 3, 'repeated provisioning creates no duplicate memberships');
select is((select count(*)::int from public.organization_feature_flags where organization_id in (
  '21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002'
)), 6, 'feature matrix contains only the six required pilot rows');
select is((select count(*)::int from public.organization_feature_flags where organization_id in (
  '21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002'
) and enabled), 0, 'provisioning leaves every pilot flag disabled');
select is((select count(*)::int from public.organization_feature_flags where organization_id =
  '21000000-0000-4000-8000-000000000003'), 0, 'non-pilot organization receives no feature rows');
select throws_ok(
  $$insert into public.organization_memberships (organization_id, user_id, role, status) values ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 'provider_staff', 'active')$$,
  '23514', null, 'provider role cannot be provisioned in employer organization'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.organizations), 1, 'employee sees only the employer pilot organization');
select is((select count(*)::int from public.organization_feature_flags), 4, 'employee sees only employer feature rows');
select is((select count(*)::int from public.organizations where id = '21000000-0000-4000-8000-000000000002'), 0, 'employee cannot see provider pilot organization');

select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.organizations), 1, 'provider sees only the provider pilot organization');
select is((select count(*)::int from public.organization_feature_flags), 2, 'provider sees only provider feature rows');

select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000004', true);
select is((select count(*)::int from public.organizations), 0, 'non-pilot user sees no organizations');

reset role;
select * from finish();
rollback;
