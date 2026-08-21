begin;
create extension if not exists pgtap with schema extensions;
select plan(53);
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('13000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','passport-owner@example.test','',now(),now(),now()),
('13000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-employee@example.test','',now(),now(),now()),
('13000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','employer@example.test','',now(),now(),now()),
('13000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','provider@example.test','',now(),now(),now());
insert into public.organizations(id,name,organization_type,country_code) values
('23000000-0000-0000-0000-000000000001','Passport Org A','employer','RU'),
('23000000-0000-0000-0000-000000000002','Passport Org B','employer','GB'),
('23000000-0000-0000-0000-000000000003','Clinical Partner','provider','RU');
insert into public.organization_memberships(organization_id,user_id,role,status) values
('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','employee','active'),
('23000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000001','employee','active'),
('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000002','employee','active'),
('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000003','employer_admin','active'),
('23000000-0000-0000-0000-000000000003','13000000-0000-0000-0000-000000000004','provider_staff','active');
insert into public.vision_recommendations(organization_id,owner_user_id,title_key,due_at) values('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','review.annual',now()+interval '7 days');
insert into public.clinic_documents(organization_id,owner_user_id,provider_organization_id,document_type,title,storage_path,issued_at) values('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000003','visit_summary','Visit summary','23000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/summary.pdf',now());
select throws_ok($$insert into public.clinic_documents(organization_id,owner_user_id,provider_organization_id,document_type,title,storage_path,issued_at) values('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000003','visit_summary','Collision','23000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/summary.pdf',now())$$,'23514',null,'document path must carry its owning organization and user');
select throws_ok($$insert into public.clinic_documents(organization_id,owner_user_id,provider_organization_id,document_type,title,storage_path,issued_at) values('23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000003','visit_summary','Duplicate','23000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/summary.pdf',now())$$,'23505',null,'storage object path is globally unique');
insert into public.screenings(id,organization_id,owner_user_id,status,flow_id,protocol_version,scoring_version,idempotency_key,completed_at) values
('33000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','completed','adult-comfort','adult-comfort-v1','attention-v1','43000000-0000-0000-0000-000000000001',now()-interval '400 days'),
('33000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','completed','adult-comfort','adult-comfort-v1','attention-v1','43000000-0000-0000-0000-000000000002',now()-interval '10 days');
insert into public.screening_results(screening_id,owner_user_id,organization_id,outcome,total_score,review_within_days,protocol_version,scoring_version) values
('33000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','routine',0,365,'adult-comfort-v1','attention-v1'),
('33000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','review_recommended',4,30,'adult-comfort-v1','attention-v1');

set local role authenticated;
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.get_employee_vision_passport('23000000-0000-0000-0000-000000000001')$$,'owner reads passport in active organization');
select is((select jsonb_array_length(public.get_employee_vision_passport('23000000-0000-0000-0000-000000000001')->'recommendations')),1,'passport includes own recommendation');
select is((select jsonb_array_length(public.get_employee_vision_passport('23000000-0000-0000-0000-000000000002')->'recommendations')),0,'same role in second organization cannot cross boundary');
select ok((public.get_employee_vision_passport('23000000-0000-0000-0000-000000000001')->>'nextReviewAt')::timestamptz>now(),'next review ignores dates that are already in the past');
select is((public.get_employee_vision_passport('23000000-0000-0000-0000-000000000001')->>'nextReviewAt')::timestamptz,(select due_at from public.vision_recommendations where owner_user_id='13000000-0000-0000-0000-000000000001'),'next review selects the exact nearest future recommendation date');
select lives_ok($$select public.update_employee_profile_settings('23000000-0000-0000-0000-000000000001','{"displayName":"Owner","locale":"en","region":"GB","birthDate":"1990-04-12"}'::jsonb)$$,'owner updates allowed profile fields');
select throws_ok($$select public.update_employee_profile_settings('23000000-0000-0000-0000-000000000001','{"role":"employer_admin"}'::jsonb)$$,'22023',null,'profile update rejects role injection');
select is((public.get_employee_profile_settings('23000000-0000-0000-0000-000000000001')->>'birthDate'),'1990-04-12','birth date persists');
select lives_ok($$select public.set_employee_consent('23000000-0000-0000-0000-000000000001','research',true,null)$$,'owner grants research consent');
select lives_ok($$select public.set_employee_consent('23000000-0000-0000-0000-000000000001','research',false,null)$$,'owner revokes research consent');
select throws_ok($$select public.set_employee_consent('23000000-0000-0000-0000-000000000001','clinic_access',true,'23000000-0000-0000-0000-000000000002')$$,'22023',null,'employer organization cannot be granted clinic access');
select lives_ok($$select public.set_employee_consent('23000000-0000-0000-0000-000000000001','clinic_access',true,'23000000-0000-0000-0000-000000000003')$$,'owner grants a verified provider access');
select is((select count(*)::int from public.clinic_documents),1,'owner sees own clinic document');
select is((select jsonb_array_length(public.export_employee_data('23000000-0000-0000-0000-000000000001')->'visionPassport'->'documents')),1,'complete export includes passport documents');

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000002',true);
select is((select count(*)::int from public.vision_recommendations),0,'another employee in same organization sees no recommendation');
select is((select jsonb_array_length(public.get_employee_vision_passport('23000000-0000-0000-0000-000000000001')->'recommendations')),0,'another employee passport excludes owner data');

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.get_employee_vision_passport('23000000-0000-0000-0000-000000000001')$$,'42501',null,'employer cannot read employee passport');
select throws_ok($$select public.export_employee_data('23000000-0000-0000-0000-000000000001')$$,'42501',null,'employer cannot export employee data');
select is((select count(*)::int from public.data_consents),0,'employer sees no employee consents');
select is((select count(*)::int from public.clinic_documents),0,'employer sees no clinic documents');

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000004',true);
select is((select count(*)::int from public.clinic_documents),1,'clinical partner sees a consented document');
select is((select count(*)::int from public.data_consents),0,'clinical partner cannot enumerate employee consents');

select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.set_employee_consent('23000000-0000-0000-0000-000000000001','clinic_access',false,'23000000-0000-0000-0000-000000000003')$$,'owner revokes provider access');
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000004',true);
select is((select count(*)::int from public.clinic_documents),0,'clinical partner loses document access after revocation');
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.request_employee_data_deletion('23000000-0000-0000-0000-000000000001')$$,'employee requests deletion');
select throws_ok($$select public.request_employee_data_deletion('23000000-0000-0000-0000-000000000001')$$,'22023',null,'duplicate pending deletion is rejected');
select lives_ok($$select public.cancel_employee_data_deletion('23000000-0000-0000-0000-000000000001',(select id from public.data_deletion_requests where owner_user_id='13000000-0000-0000-0000-000000000001' and status='requested'))$$,'employee cancels a pending request');
select lives_ok($$select public.request_employee_data_deletion('23000000-0000-0000-0000-000000000001')$$,'employee can request deletion after cancellation');
select lives_ok($$select public.cancel_employee_data_deletion('23000000-0000-0000-0000-000000000001',(select id from public.data_deletion_requests where owner_user_id='13000000-0000-0000-0000-000000000001' and status='requested'))$$,'employee can cancel a later request too');
select lives_ok($$select public.request_employee_data_deletion('23000000-0000-0000-0000-000000000001')$$,'employee can retry after multiple cancelled requests');
select is((public.get_employee_data_deletion_status('23000000-0000-0000-0000-000000000001',(select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='requested'))->>'status'),'requested','owner observes queued deletion status');
select throws_ok($$select public.list_pending_employee_data_deletions(10)$$,'42501',null,'authenticated users cannot enumerate the deletion queue');
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.get_employee_data_deletion_status('23000000-0000-0000-0000-000000000001',(select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='requested'))$$,'42501',null,'another employee cannot observe the owner deletion status');
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);

reset role; set local role service_role;
select is((select jsonb_array_length(public.list_pending_employee_data_deletions(10))),1,'server dispatcher discovers the queued request');
reset role;
insert into public.data_deletion_requests(owner_user_id,owner_subject,organization_id,status,attempt_count,lease_expires_at,worker_token)
values('13000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000001','processing',5,now()-interval '1 minute',gen_random_uuid());
set local role service_role;
select is((select jsonb_array_length(public.list_pending_employee_data_deletions(10))),2,'dispatcher includes an exhausted lease so terminal failure remains alertable');
select lives_ok($$select public.claim_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000002'),'13000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000001')$$,'claim terminalizes an exhausted lease without rolling back the status');
select is((select status from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000002'),'failed','five crashed leases become observably failed instead of permanently processing');
select throws_ok($$select public.claim_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='requested'),'13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000002')$$,'42501',null,'worker cannot claim a request for a different organization');
select lives_ok($$select public.claim_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='requested'),'13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001')$$,'service role claims deletion');
select is((select status from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing'),'processing','claimed deletion remains observably processing until completion');
select lives_ok($$select public.fail_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing'),(select worker_token from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing'),'temporary_storage_error')$$,'transient worker failure is recorded');
select is((select status from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='requested'),'requested','transient worker failure is requeued');
reset role;
update public.data_deletion_requests set next_attempt_at=now()-interval '1 second' where owner_subject='13000000-0000-0000-0000-000000000001' and status='requested';
set local role service_role;
select lives_ok($$select public.claim_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='requested'),'13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001')$$,'scheduled retry reclaims a transient failure');
select throws_ok($$select public.claim_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing'),'13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001')$$,'55000',null,'a live worker lease prevents concurrent processing');
reset role;
update public.data_deletion_requests set lease_expires_at=now()-interval '1 minute' where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing';
set local role service_role;
select lives_ok($$select public.claim_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing'),'13000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001')$$,'expired worker lease is safely reclaimed');
select throws_ok($$select public.complete_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing'),'00000000-0000-0000-0000-000000000000')$$,'42501',null,'worker token cannot be forged');
select lives_ok($$select public.complete_employee_data_deletion((select id from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing'),(select worker_token from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='processing'))$$,'leased worker completes deletion');
reset role;
select is((select status from public.data_deletion_requests where owner_subject='13000000-0000-0000-0000-000000000001' and status='completed'),'completed','deletion status is completed');
select is((select count(*)::int from public.vision_recommendations where owner_user_id='13000000-0000-0000-0000-000000000001'),0,'organization health data is deleted');
select is((select count(*)::int from public.organization_memberships where organization_id='23000000-0000-0000-0000-000000000001' and user_id='13000000-0000-0000-0000-000000000001'),0,'deleted organization membership is removed');
select is((select count(*)::int from public.organization_memberships where organization_id='23000000-0000-0000-0000-000000000002' and user_id='13000000-0000-0000-0000-000000000001'),1,'membership in another organization remains');
select * from finish(); rollback;
