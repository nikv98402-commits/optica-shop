create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;

begin;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'provider-concurrency-employee@example.test', '', now(), now(), now()),
  ('16000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'provider-concurrency-staff@example.test', '', now(), now(), now());

insert into public.organizations (id, name, organization_type, country_code)
values
  ('26000000-0000-0000-0000-000000000001', 'Provider Concurrency Employer', 'employer', 'RU'),
  ('26000000-0000-0000-0000-000000000002', 'Provider Concurrency Clinic', 'provider', 'RU');

insert into public.organization_memberships (organization_id, user_id, role, status)
values
  ('26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'employee', 'active'),
  ('26000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000002', 'provider_staff', 'active');

insert into public.data_consents (
  organization_id, owner_user_id, consent_type, provider_organization_id, granted
) values (
  '26000000-0000-0000-0000-000000000001',
  '16000000-0000-0000-0000-000000000001',
  'clinic_access',
  '26000000-0000-0000-0000-000000000002',
  true
);

insert into public.screenings (
  id, organization_id, owner_user_id, flow_id, protocol_version, scoring_version,
  status, version, idempotency_key, completed_at
) values
  ('36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'adult-comfort', 'adult-comfort-v1', 'attention-v1', 'completed', 2, '46000000-0000-0000-0000-000000000001', now()),
  ('36000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'adult-comfort', 'adult-comfort-v1', 'attention-v1', 'completed', 2, '46000000-0000-0000-0000-000000000002', now()),
  ('36000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'adult-comfort', 'adult-comfort-v1', 'attention-v1', 'completed', 2, '46000000-0000-0000-0000-000000000003', now()),
  ('36000000-0000-0000-0000-000000000004', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'adult-comfort', 'adult-comfort-v1', 'attention-v1', 'completed', 2, '46000000-0000-0000-0000-000000000004', now()),
  ('36000000-0000-0000-0000-000000000005', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'adult-comfort', 'adult-comfort-v1', 'attention-v1', 'completed', 2, '46000000-0000-0000-0000-000000000005', now()),
  ('36000000-0000-0000-0000-000000000006', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'adult-comfort', 'adult-comfort-v1', 'attention-v1', 'completed', 2, '46000000-0000-0000-0000-000000000006', now());

insert into public.care_pathways (
  id, screening_id, organization_id, owner_user_id, status
) values
  ('56000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'referral_created'),
  ('56000000-0000-0000-0000-000000000002', '36000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'referral_created'),
  ('56000000-0000-0000-0000-000000000003', '36000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'referral_created'),
  ('56000000-0000-0000-0000-000000000004', '36000000-0000-0000-0000-000000000004', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'referral_created'),
  ('56000000-0000-0000-0000-000000000005', '36000000-0000-0000-0000-000000000005', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'referral_created'),
  ('56000000-0000-0000-0000-000000000006', '36000000-0000-0000-0000-000000000006', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'referral_created');

insert into public.referrals (
  id, care_pathway_id, organization_id, owner_user_id, priority, respond_by,
  idempotency_key, provider_organization_id, provider_status, version, created_at, updated_at
) values
  ('66000000-0000-0000-0000-000000000001', '56000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'review_recommended', now() + interval '7 days', '76000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000002', 'queued', 2, now(), now()),
  ('66000000-0000-0000-0000-000000000002', '56000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'review_recommended', now() + interval '7 days', '76000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000002', 'queued', 2, now(), now()),
  ('66000000-0000-0000-0000-000000000003', '56000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'urgent', now() + interval '1 day', '76000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000002', 'queued', 2, now(), now()),
  ('66000000-0000-0000-0000-000000000004', '56000000-0000-0000-0000-000000000004', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'urgent', now() + interval '1 day', '76000000-0000-0000-0000-000000000004', '26000000-0000-0000-0000-000000000002', 'queued', 2, now(), now()),
  ('66000000-0000-0000-0000-000000000005', '56000000-0000-0000-0000-000000000005', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'review_recommended', now() + interval '7 days', '76000000-0000-0000-0000-000000000005', '26000000-0000-0000-0000-000000000002', 'appointment_booked', 2, date_trunc('day', now()) - interval '3 days', date_trunc('day', now()) - interval '3 days'),
  ('66000000-0000-0000-0000-000000000006', '56000000-0000-0000-0000-000000000006', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'review_recommended', now() + interval '7 days', '76000000-0000-0000-0000-000000000006', '26000000-0000-0000-0000-000000000002', 'appointment_booked', 2, date_trunc('day', now()) - interval '3 days', date_trunc('day', now()) - interval '3 days');

insert into public.referral_appointments (
  referral_id, provider_organization_id, employee_organization_id, owner_user_id, scheduled_at, status
) values
  ('66000000-0000-0000-0000-000000000005', '26000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', date_trunc('day', now()) - interval '2 days', 'completed'),
  ('66000000-0000-0000-0000-000000000006', '26000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', date_trunc('day', now()) - interval '2 days', 'completed');

-- Remote calls return structured success/failure data so an expected optimistic-lock
-- conflict never aborts the pgTAP session while collecting dblink results.
create or replace function public._test_provider_operation(operation_name text, target_referral_id uuid, request_key uuid)
returns text language plpgsql security invoker set search_path=public,pg_temp as $$
declare operation_response jsonb;
begin
  case operation_name
    when 'book' then
      operation_response := public.book_provider_appointment(
        '26000000-0000-0000-0000-000000000002', target_referral_id, 2,
        date_trunc('day', now()) + interval '30 days', request_key);
    when 'escalate' then
      operation_response := public.escalate_provider_referral(
        '26000000-0000-0000-0000-000000000002', target_referral_id, 2,
        'clinical_red_flag', request_key);
    when 'outcome' then
      operation_response := public.confirm_provider_outcome(
        '26000000-0000-0000-0000-000000000002', target_referral_id, 2,
        'exam_completed', date_trunc('day', now()) - interval '1 day', request_key);
    else
      raise exception 'unknown test operation';
  end case;
  return jsonb_build_object('ok', true, 'response', operation_response)::text;
exception when others then
  return jsonb_build_object('ok', false, 'sqlstate', sqlstate)::text;
end;
$$;
grant execute on function public._test_provider_operation(text,uuid,uuid) to authenticated;
commit;

select plan(27);
select extensions.dblink_connect('provider_a', 'host=host.docker.internal port=55322 dbname=postgres user=postgres password=postgres');
select extensions.dblink_connect('provider_b', 'host=host.docker.internal port=55322 dbname=postgres user=postgres password=postgres');
select extensions.dblink_exec('provider_a', 'set role authenticated');
select extensions.dblink_exec('provider_b', 'set role authenticated');
select * from extensions.dblink(
  'provider_a',
  $$select set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000002', false)$$
) as configured(value text);
select * from extensions.dblink(
  'provider_b',
  $$select set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000002', false)$$
) as configured(value text);

create temporary table provider_concurrency_results (operation text, payload text);

-- Identical concurrent retries must both receive one cached operation result.
select extensions.dblink_send_query('provider_a', $$select public._test_provider_operation('book', '66000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001')$$);
select extensions.dblink_send_query('provider_b', $$select public._test_provider_operation('book', '66000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001')$$);
insert into provider_concurrency_results select 'book_same', payload from extensions.dblink_get_result('provider_a') as result(payload text);
insert into provider_concurrency_results select 'book_same', payload from extensions.dblink_get_result('provider_b') as result(payload text);
select * from extensions.dblink_get_result('provider_a') as drained(payload text);
select * from extensions.dblink_get_result('provider_b') as drained(payload text);
select is((select count(*)::integer from provider_concurrency_results where operation='book_same'), 2, 'both concurrent booking retries succeed');
select is((select count(distinct payload)::integer from provider_concurrency_results where operation='book_same'), 1, 'concurrent booking retries return one cached response');
select is((select count(*)::integer from public.referral_appointments where referral_id='66000000-0000-0000-0000-000000000001'), 1, 'concurrent booking retries create one appointment');
select is((select count(*)::integer from public.provider_operation_receipts where operation='appointment.book' and referral_id='66000000-0000-0000-0000-000000000001'), 1, 'concurrent booking retries create one receipt');

select extensions.dblink_send_query('provider_a', $$select public._test_provider_operation('escalate', '66000000-0000-0000-0000-000000000003', '86000000-0000-0000-0000-000000000003')$$);
select extensions.dblink_send_query('provider_b', $$select public._test_provider_operation('escalate', '66000000-0000-0000-0000-000000000003', '86000000-0000-0000-0000-000000000003')$$);
insert into provider_concurrency_results select 'escalate_same', payload from extensions.dblink_get_result('provider_a') as result(payload text);
insert into provider_concurrency_results select 'escalate_same', payload from extensions.dblink_get_result('provider_b') as result(payload text);
select * from extensions.dblink_get_result('provider_a') as drained(payload text);
select * from extensions.dblink_get_result('provider_b') as drained(payload text);
select is((select count(*)::integer from provider_concurrency_results where operation='escalate_same'), 2, 'both concurrent escalation retries succeed');
select is((select count(distinct payload)::integer from provider_concurrency_results where operation='escalate_same'), 1, 'concurrent escalation retries return one cached response');
select is((select count(*)::integer from public.referral_escalations where referral_id='66000000-0000-0000-0000-000000000003'), 1, 'concurrent escalation retries create one escalation');
select is((select count(*)::integer from public.provider_operation_receipts where operation='referral.escalate' and referral_id='66000000-0000-0000-0000-000000000003'), 1, 'concurrent escalation retries create one receipt');

select extensions.dblink_send_query('provider_a', $$select public._test_provider_operation('outcome', '66000000-0000-0000-0000-000000000005', '86000000-0000-0000-0000-000000000005')$$);
select extensions.dblink_send_query('provider_b', $$select public._test_provider_operation('outcome', '66000000-0000-0000-0000-000000000005', '86000000-0000-0000-0000-000000000005')$$);
insert into provider_concurrency_results select 'outcome_same', payload from extensions.dblink_get_result('provider_a') as result(payload text);
insert into provider_concurrency_results select 'outcome_same', payload from extensions.dblink_get_result('provider_b') as result(payload text);
select * from extensions.dblink_get_result('provider_a') as drained(payload text);
select * from extensions.dblink_get_result('provider_b') as drained(payload text);
select is((select count(*)::integer from provider_concurrency_results where operation='outcome_same'), 2, 'both concurrent outcome retries succeed');
select is((select count(distinct payload)::integer from provider_concurrency_results where operation='outcome_same'), 1, 'concurrent outcome retries return one cached response');
select is((select count(*)::integer from public.clinical_outcomes where referral_id='66000000-0000-0000-0000-000000000005'), 1, 'concurrent outcome retries create one clinical outcome');
select is((select count(*)::integer from public.provider_operation_receipts where operation='outcome.confirm' and referral_id='66000000-0000-0000-0000-000000000005'), 1, 'concurrent outcome retries create one receipt');

-- Different idempotency keys racing the same expected version must mutate once.
select extensions.dblink_send_query('provider_a', $$select public._test_provider_operation('book', '66000000-0000-0000-0000-000000000002', '86000000-0000-0000-0000-000000000021')$$);
select extensions.dblink_send_query('provider_b', $$select public._test_provider_operation('book', '66000000-0000-0000-0000-000000000002', '86000000-0000-0000-0000-000000000022')$$);
insert into provider_concurrency_results select 'book_race', payload from extensions.dblink_get_result('provider_a') as result(payload text);
insert into provider_concurrency_results select 'book_race', payload from extensions.dblink_get_result('provider_b') as result(payload text);
select * from extensions.dblink_get_result('provider_a') as drained(payload text);
select * from extensions.dblink_get_result('provider_b') as drained(payload text);
select is((select count(*)::integer from provider_concurrency_results where operation='book_race'), 2, 'both competing booking results are collected');
select is((select count(*)::integer from provider_concurrency_results where operation='book_race' and (payload::jsonb->>'ok')::boolean), 1, 'one competing booking wins the optimistic-version race');
select is((select count(*)::integer from provider_concurrency_results where operation='book_race' and payload::jsonb->>'sqlstate'='40001'), 1, 'losing booking reports an optimistic-lock conflict');
select is((select count(*)::integer from public.referral_appointments where referral_id='66000000-0000-0000-0000-000000000002'), 1, 'booking race creates one appointment');
select is((select count(*)::integer from public.provider_operation_receipts where operation='appointment.book' and referral_id='66000000-0000-0000-0000-000000000002'), 1, 'booking race records one successful receipt');

select extensions.dblink_send_query('provider_a', $$select public._test_provider_operation('escalate', '66000000-0000-0000-0000-000000000004', '86000000-0000-0000-0000-000000000041')$$);
select extensions.dblink_send_query('provider_b', $$select public._test_provider_operation('escalate', '66000000-0000-0000-0000-000000000004', '86000000-0000-0000-0000-000000000042')$$);
insert into provider_concurrency_results select 'escalate_race', payload from extensions.dblink_get_result('provider_a') as result(payload text);
insert into provider_concurrency_results select 'escalate_race', payload from extensions.dblink_get_result('provider_b') as result(payload text);
select * from extensions.dblink_get_result('provider_a') as drained(payload text);
select * from extensions.dblink_get_result('provider_b') as drained(payload text);
select is((select count(*)::integer from provider_concurrency_results where operation='escalate_race'), 2, 'both competing escalation results are collected');
select is((select count(*)::integer from provider_concurrency_results where operation='escalate_race' and (payload::jsonb->>'ok')::boolean), 1, 'one competing escalation wins the optimistic-version race');
select is((select count(*)::integer from provider_concurrency_results where operation='escalate_race' and payload::jsonb->>'sqlstate'='40001'), 1, 'losing escalation reports an optimistic-lock conflict');
select is((select count(*)::integer from public.referral_escalations where referral_id='66000000-0000-0000-0000-000000000004'), 1, 'escalation race creates one escalation');
select is((select count(*)::integer from public.provider_operation_receipts where operation='referral.escalate' and referral_id='66000000-0000-0000-0000-000000000004'), 1, 'escalation race records one successful receipt');

select extensions.dblink_send_query('provider_a', $$select public._test_provider_operation('outcome', '66000000-0000-0000-0000-000000000006', '86000000-0000-0000-0000-000000000061')$$);
select extensions.dblink_send_query('provider_b', $$select public._test_provider_operation('outcome', '66000000-0000-0000-0000-000000000006', '86000000-0000-0000-0000-000000000062')$$);
insert into provider_concurrency_results select 'outcome_race', payload from extensions.dblink_get_result('provider_a') as result(payload text);
insert into provider_concurrency_results select 'outcome_race', payload from extensions.dblink_get_result('provider_b') as result(payload text);
select * from extensions.dblink_get_result('provider_a') as drained(payload text);
select * from extensions.dblink_get_result('provider_b') as drained(payload text);
select is((select count(*)::integer from provider_concurrency_results where operation='outcome_race'), 2, 'both competing outcome results are collected');
select is((select count(*)::integer from provider_concurrency_results where operation='outcome_race' and (payload::jsonb->>'ok')::boolean), 1, 'one competing outcome wins the optimistic-version race');
select is((select count(*)::integer from provider_concurrency_results where operation='outcome_race' and payload::jsonb->>'sqlstate'='40001'), 1, 'losing outcome reports an optimistic-lock conflict');
select is((select count(*)::integer from public.clinical_outcomes where referral_id='66000000-0000-0000-0000-000000000006'), 1, 'outcome race creates one clinical outcome');
select is((select count(*)::integer from public.provider_operation_receipts where operation='outcome.confirm' and referral_id='66000000-0000-0000-0000-000000000006'), 1, 'outcome race records one successful receipt');

select extensions.dblink_disconnect('provider_a');
select extensions.dblink_disconnect('provider_b');
select * from finish();

begin;
drop function if exists public._test_provider_operation(text,uuid,uuid);
delete from public.audit_events where organization_id in ('26000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000002');
delete from public.provider_operation_receipts where provider_organization_id='26000000-0000-0000-0000-000000000002';
delete from public.clinical_outcomes where employee_organization_id='26000000-0000-0000-0000-000000000001';
delete from public.referral_escalations where employee_organization_id='26000000-0000-0000-0000-000000000001';
delete from public.referral_appointments where employee_organization_id='26000000-0000-0000-0000-000000000001';
delete from public.referrals where organization_id='26000000-0000-0000-0000-000000000001';
delete from public.care_pathways where organization_id='26000000-0000-0000-0000-000000000001';
delete from public.screenings where organization_id='26000000-0000-0000-0000-000000000001';
delete from public.data_consents where organization_id='26000000-0000-0000-0000-000000000001';
delete from public.organization_memberships where organization_id in ('26000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000002');
delete from public.organizations where id in ('26000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000002');
delete from auth.users where id in ('16000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002');
commit;
