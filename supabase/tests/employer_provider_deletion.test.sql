begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('15000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','slice3-delete@example.test','',now(),now(),now());
insert into public.organizations(id,name,organization_type,country_code) values
('25000000-0000-0000-0000-000000000001','Deletion Employer','employer','RU'),
('25000000-0000-0000-0000-000000000002','Deletion Provider','provider','RU');
insert into public.organization_memberships(organization_id,user_id,role,status) values
('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','employee','active');
insert into public.screenings(id,organization_id,owner_user_id,flow_id,protocol_version,scoring_version,status,idempotency_key,completed_at) values
('35000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','adult-comfort','v1','v1','completed','45000000-0000-0000-0000-000000000001',now());
insert into public.care_pathways(id,screening_id,organization_id,owner_user_id,status) values
('55000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','referral_created');
insert into public.referrals(id,care_pathway_id,organization_id,owner_user_id,priority,respond_by,idempotency_key,provider_organization_id,provider_status) values
('65000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','review_recommended',now()+interval '7 days','75000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000002','outcome_confirmed');
insert into public.referral_appointments(referral_id,provider_organization_id,employee_organization_id,owner_user_id,scheduled_at) values
('65000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000002','25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001',now()+interval '1 day');
insert into public.referral_escalations(referral_id,provider_organization_id,employee_organization_id,owner_user_id,reason_code) values
('65000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000002','25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','clinical_red_flag');
insert into public.clinical_outcomes(referral_id,provider_organization_id,employee_organization_id,owner_user_id,outcome_code,completed_at) values
('65000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000002','25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','exam_completed',now());
insert into public.data_deletion_requests(id,owner_user_id,owner_subject,organization_id,status) values
('85000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','requested');

set local role service_role;
select lives_ok($$select public.claim_employee_data_deletion('85000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001')$$,'production worker claims a Slice 3 deletion');
select lives_ok($$select public.complete_employee_data_deletion('85000000-0000-0000-0000-000000000001',(select worker_token from public.data_deletion_requests where id='85000000-0000-0000-0000-000000000001'))$$,'production worker completes with RESTRICT children present');
reset role;

select is((select count(*)::int from public.referral_appointments where owner_user_id='15000000-0000-0000-0000-000000000001'),0,'appointments are physically deleted');
select is((select count(*)::int from public.referral_escalations where owner_user_id='15000000-0000-0000-0000-000000000001'),0,'escalations are physically deleted');
select is((select count(*)::int from public.clinical_outcomes where owner_user_id='15000000-0000-0000-0000-000000000001'),0,'clinical outcomes are physically deleted');
select is((select count(*)::int from public.referrals where owner_user_id='15000000-0000-0000-0000-000000000001'),0,'parent referral is deleted after its children');
select is((select status from public.data_deletion_requests where id='85000000-0000-0000-0000-000000000001'),'completed','request is completed only after clinical deletion');
select is((select count(*)::int from public.organization_memberships where organization_id='25000000-0000-0000-0000-000000000001' and user_id='15000000-0000-0000-0000-000000000001'),0,'employee membership is removed');

select * from finish();
rollback;
