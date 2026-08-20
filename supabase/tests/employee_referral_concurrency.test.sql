create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;

begin;
delete from public.audit_events where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.referrals where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.care_pathways where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.screenings where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.organization_memberships where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.organizations where id = '22000000-0000-0000-0000-000000000001';
delete from auth.users where id = '12000000-0000-0000-0000-000000000001';
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'concurrent-employee@example.test', '', now(), now(), now());
insert into public.organizations (id, name, organization_type, country_code)
values ('22000000-0000-0000-0000-000000000001', 'Concurrency Employer', 'employer', 'RU');
insert into public.organization_memberships (organization_id, user_id, role, status)
values ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'employee', 'active');
insert into public.screenings (
  id, organization_id, owner_user_id, flow_id, protocol_version, scoring_version,
  status, version, idempotency_key, completed_at
) values (
  '32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001', 'adult-comfort', 'adult-comfort-v1', 'attention-v1',
  'completed', 2, '42000000-0000-0000-0000-000000000001', now()
);
insert into public.screening_results (
  screening_id, owner_user_id, organization_id, outcome, total_score, review_within_days,
  protocol_version, scoring_version
) values (
  '32000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001', 'review_recommended', 4, 30,
  'adult-comfort-v1', 'attention-v1'
);
commit;

select plan(3);
select extensions.dblink_connect('referral_a', 'host=host.docker.internal port=55322 dbname=postgres user=postgres password=postgres');
select extensions.dblink_connect('referral_b', 'host=host.docker.internal port=55322 dbname=postgres user=postgres password=postgres');
select extensions.dblink_exec('referral_a', 'set role authenticated');
select extensions.dblink_exec('referral_b', 'set role authenticated');
select * from extensions.dblink(
  'referral_a',
  $$select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', false)$$
) as configured(value text);
select * from extensions.dblink(
  'referral_b',
  $$select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', false)$$
) as configured(value text);

select extensions.dblink_send_query(
  'referral_a',
  $$select (public.create_employee_referral(
    '22000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000002'
  )).id::text$$
);
select extensions.dblink_send_query(
  'referral_b',
  $$select (public.create_employee_referral(
    '22000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000003'
  )).id::text$$
);

create temporary table concurrent_referral_results (referral_id text);
insert into concurrent_referral_results select referral_id
  from extensions.dblink_get_result('referral_a') as result(referral_id text);
insert into concurrent_referral_results select referral_id
  from extensions.dblink_get_result('referral_b') as result(referral_id text);

select is((select count(*)::integer from concurrent_referral_results), 2,
  'both concurrent referral requests complete successfully');
select is((select count(distinct referral_id)::integer from concurrent_referral_results), 1,
  'both concurrent requests return the same referral');
select is(
  (select format('%s/%s', count(distinct p.id), count(distinct r.id))
   from public.care_pathways p join public.referrals r on r.care_pathway_id = p.id
   where p.screening_id = '32000000-0000-0000-0000-000000000001'),
  '1/1', 'concurrent requests create exactly one pathway and one referral'
);

select extensions.dblink_disconnect('referral_a');
select extensions.dblink_disconnect('referral_b');
select * from finish();

begin;
delete from public.audit_events where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.referrals where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.care_pathways where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.screenings where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.organization_memberships where organization_id = '22000000-0000-0000-0000-000000000001';
delete from public.organizations where id = '22000000-0000-0000-0000-000000000001';
delete from auth.users where id = '12000000-0000-0000-0000-000000000001';
commit;
