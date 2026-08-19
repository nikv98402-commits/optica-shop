begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'employee-a@example.test', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@example.test', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'provider-b@example.test', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.test', '', now(), now(), now());

insert into public.organizations (id, name, organization_type, country_code)
values
  ('20000000-0000-0000-0000-000000000001', 'Employer A', 'employer', 'RU'),
  ('20000000-0000-0000-0000-000000000002', 'Provider B', 'provider', 'GB');

insert into public.organization_memberships (organization_id, user_id, role, status)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'employee', 'active'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'employer_admin', 'active'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'provider_staff', 'active');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*)::int from public.profiles), 1, 'user can select own profile');
select is((select count(*)::int from public.profiles where id = '10000000-0000-0000-0000-000000000002'), 0, 'user cannot select another profile');
select is((select count(*)::int from public.organizations), 1, 'employee sees only own organization');
select is((select count(*)::int from public.organization_memberships), 1, 'employee sees only own membership');
select lives_ok(
  $$insert into public.product_events (organization_id, event_name, surface_role, locale) values ('20000000-0000-0000-0000-000000000001', 'workspace_opened', 'employee', 'ru')$$,
  'member can write privacy-safe telemetry for own organization'
);
select throws_ok(
  $$insert into public.product_events (organization_id, event_name, surface_role, locale) values ('20000000-0000-0000-0000-000000000001', 'workspace_opened', 'employer_admin', 'ru')$$,
  '42501', null, 'member cannot claim another role in telemetry'
);
select throws_ok(
  $$insert into public.product_events (organization_id, event_name, surface_role, locale) values ('20000000-0000-0000-0000-000000000002', 'workspace_opened', 'employee', 'ru')$$,
  '42501', null, 'member cannot write telemetry for another organization'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.organization_memberships), 2, 'employer admin sees memberships in own organization');
select is((select count(*)::int from public.organization_memberships where organization_id = '20000000-0000-0000-0000-000000000002'), 0, 'employer admin cannot see provider organization memberships');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*)::int from public.organizations), 1, 'provider staff sees only provider organization');
select is((select count(*)::int from public.organization_memberships), 1, 'provider staff cannot see employer organization memberships');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is((select count(*)::int from public.organizations), 0, 'outsider sees no organizations');
select throws_ok(
  $$insert into public.organization_memberships (organization_id, user_id, role, status) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'employer_admin', 'active')$$,
  '42501', null, 'authenticated user cannot elevate own role'
);

reset role;
select throws_ok(
  $$insert into public.organization_memberships (organization_id, user_id, role, status) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'provider_staff', 'active')$$,
  '23514', null, 'provider role is rejected in employer organization'
);
select throws_ok(
  $$insert into public.organization_memberships (organization_id, user_id, role, status) values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'employer_admin', 'active')$$,
  '23514', null, 'employer role is rejected in provider organization'
);

select * from finish();
rollback;
