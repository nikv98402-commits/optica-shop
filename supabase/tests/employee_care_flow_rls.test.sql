begin;

create extension if not exists pgtap with schema extensions;
select plan(39);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'employee-one@example.test', '', now(), now(), now()),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'employee-two@example.test', '', now(), now(), now()),
  ('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.test', '', now(), now(), now()),
  ('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'employee-same-org@example.test', '', now(), now(), now());

insert into public.organizations (id, name, organization_type, country_code) values
  ('21000000-0000-0000-0000-000000000001', 'Employer One', 'employer', 'RU'),
  ('21000000-0000-0000-0000-000000000002', 'Employer Two', 'employer', 'GB');
insert into public.organization_memberships (organization_id, user_id, role, status) values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'employee', 'active'),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'employee', 'active'),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'employee', 'active'),
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'employer_admin', 'active'),
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'employee', 'active');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.start_employee_screening('21000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001')$$,
  'employee can start a screening in the active organization'
);
select lives_ok(
  $$select public.start_employee_screening('21000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001')$$,
  'repeating start with the same idempotency key succeeds'
);
select is((select count(*)::int from public.screenings), 1, 'repeating start does not duplicate a screening');
select lives_ok(
  $$select public.start_employee_screening('21000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000003')$$,
  'repeating start with a fresh request key returns the active screening'
);
select is((select count(*)::int from public.screenings), 1, 'a fresh request key does not duplicate an active screening');
select set_config('test.screening_id', (select id::text from public.screenings limit 1), true);
select throws_ok(
  $$select public.start_employee_screening('21000000-0000-0000-0000-000000000099', '31000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'employee cannot start a screening in an organization without membership'
);
select throws_ok(
  $$insert into public.screening_results (screening_id, owner_user_id, organization_id, outcome, total_score, review_within_days, protocol_version, scoring_version)
    values (gen_random_uuid(), '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'routine', 0, 365, 'forged', 'forged')$$,
  '42501', null, 'employee cannot forge a screening result directly'
);
select throws_ok(
  $$select public.complete_employee_screening(
    '21000000-0000-0000-0000-000000000001', current_setting('test.screening_id')::uuid, 1,
    '[{"questionId":"comfort","score":1},{"questionId":"comfort","score":1},{"questionId":"comfort","score":1},{"questionId":"comfort","score":1}]'::jsonb
  )$$,
  '22023', null, 'completion rejects duplicated question identifiers'
);

select lives_ok(
  $$select public.save_employee_screening_progress(
    '21000000-0000-0000-0000-000000000001', current_setting('test.screening_id')::uuid, 1, 1,
    '[{"questionId":"comfort","score":2}]'::jsonb
  )$$,
  'employee can save draft progress in the active organization'
);
select is((select current_step from public.screening_measurements limit 1), 1, 'draft stores the current step');
select is((select answers from public.screening_measurements limit 1),
  '[{"score": 2, "questionId": "comfort"}]'::jsonb, 'draft stores normalized answers');
select throws_ok(
  $$select public.save_employee_screening_progress(
    '21000000-0000-0000-0000-000000000002', current_setting('test.screening_id')::uuid, 2, 2,
    '[{"questionId":"comfort","score":2},{"questionId":"distance","score":1}]'::jsonb
  )$$,
  '42501', null, 'employee cannot save a draft through another active organization'
);
select throws_ok(
  $$select public.complete_employee_screening(
    '21000000-0000-0000-0000-000000000002', current_setting('test.screening_id')::uuid, 2,
    '[{"questionId":"comfort","score":2},{"questionId":"distance","score":2},{"questionId":"one-eye","score":0},{"questionId":"distortion","score":0}]'::jsonb
  )$$,
  '42501', null, 'same-role employee cannot complete through a different active organization'
);

select lives_ok(
  $$select public.complete_employee_screening(
    '21000000-0000-0000-0000-000000000001', current_setting('test.screening_id')::uuid, 2,
    '[{"questionId":"comfort","score":2},{"questionId":"distance","score":2},{"questionId":"one-eye","score":0},{"questionId":"distortion","score":0}]'::jsonb
  )$$,
  'employee can complete a valid screening'
);
select is((select outcome::text from public.screening_results limit 1), 'review_recommended', 'server derives the review recommendation');
select lives_ok(
  $$select public.complete_employee_screening(
    '21000000-0000-0000-0000-000000000001', current_setting('test.screening_id')::uuid, 1,
    '[{"questionId":"comfort","score":2},{"questionId":"distance","score":2},{"questionId":"one-eye","score":0},{"questionId":"distortion","score":0}]'::jsonb
  )$$,
  'repeating completion returns the existing result'
);
select is((select count(*)::int from public.screening_results), 1, 'repeating completion does not duplicate a result');
select throws_ok(
  $$select public.get_employee_screening_result(
    '21000000-0000-0000-0000-000000000002', current_setting('test.screening_id')::uuid
  )$$,
  '42501', null, 'same-role employee cannot read a result through a different active organization'
);
select lives_ok(
  $$select public.create_employee_referral('21000000-0000-0000-0000-000000000001', current_setting('test.screening_id')::uuid, '41000000-0000-0000-0000-000000000001')$$,
  'employee can create a recommended referral'
);
select set_config('test.referral_id', (select id::text from public.referrals limit 1), true);
select lives_ok(
  $$select public.create_employee_referral('21000000-0000-0000-0000-000000000001', current_setting('test.screening_id')::uuid, '41000000-0000-0000-0000-000000000001')$$,
  'repeating referral creation succeeds'
);
select lives_ok(
  $$select public.create_employee_referral('21000000-0000-0000-0000-000000000001', current_setting('test.screening_id')::uuid, '41000000-0000-0000-0000-000000000002')$$,
  'repeating referral creation with a fresh request key returns the existing route'
);
select is((select count(*)::int from public.referrals), 1, 'repeating referral creation does not duplicate the referral');
select ok(
  position(
    'on conflict (screening_id) do update'
    in lower(pg_get_functiondef('public.create_employee_referral(uuid,uuid,uuid)'::regprocedure))
  ) > 0,
  'pathway creation uses an atomic conflict handler for concurrent requests'
);
select throws_ok(
  $$select public.create_employee_referral(
    '21000000-0000-0000-0000-000000000002', current_setting('test.screening_id')::uuid,
    '41000000-0000-0000-0000-000000000003'
  )$$,
  '42501', null, 'same-role employee cannot create a referral through a different active organization'
);
select throws_ok(
  $$select public.get_employee_referral(
    '21000000-0000-0000-0000-000000000002', current_setting('test.referral_id')::uuid
  )$$,
  '42501', null, 'same-role employee cannot read a referral through a different active organization'
);

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.screenings), 0, 'employee in another organization sees no screenings');
select is((select count(*)::int from public.screening_measurements), 0, 'employee in another organization sees no draft answers');
select is((select count(*)::int from public.referrals), 0, 'employee in another organization sees no referrals');
select throws_ok(
  $$select public.save_employee_screening_progress(
    '21000000-0000-0000-0000-000000000001',
    current_setting('test.screening_id')::uuid,
    2, 2, '[{"questionId":"comfort","score":2},{"questionId":"distance","score":1}]'::jsonb
  )$$,
  '42501', null, 'employee in another organization cannot save draft progress'
);

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000004', true);
select is((select count(*)::int from public.screenings), 0, 'another employee in the same organization sees no screenings');
select is((select count(*)::int from public.screening_measurements), 0, 'another employee in the same organization sees no draft answers');
select is((select count(*)::int from public.referrals), 0, 'another employee in the same organization sees no referrals');
select throws_ok(
  $$select public.get_employee_screening_result(
    '21000000-0000-0000-0000-000000000001', current_setting('test.screening_id')::uuid
  )$$,
  '42501', null, 'another employee in the same organization cannot read the screening result'
);

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000003', true);
select is((select count(*)::int from public.screenings), 0, 'employer admin sees no employee screenings');
select is((select count(*)::int from public.screening_measurements), 0, 'employer admin sees no employee answers');
select is((select count(*)::int from public.screening_results), 0, 'employer admin sees no employee results');
select is((select count(*)::int from public.care_pathways), 0, 'employer admin sees no employee care pathways');
select is((select count(*)::int from public.referrals), 0, 'employer admin sees no employee referrals');
select throws_ok(
  $$select public.save_employee_screening_progress(
    '21000000-0000-0000-0000-000000000001',
    current_setting('test.screening_id')::uuid,
    2, 2, '[{"questionId":"comfort","score":2},{"questionId":"distance","score":1}]'::jsonb
  )$$,
  '42501', null, 'employer admin cannot save employee draft progress'
);

select * from finish();
rollback;
