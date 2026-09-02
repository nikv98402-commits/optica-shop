begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
select ('14000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','slice3-'||i||'@example.test','',now(),now(),now() from generate_series(1,24)i;
insert into public.organizations(id,name,organization_type,country_code) values
('24000000-0000-0000-0000-000000000001','Employer A','employer','RU'),('24000000-0000-0000-0000-000000000002','Employer B','employer','GB'),
('24000000-0000-0000-0000-000000000003','Provider A','provider','RU'),('24000000-0000-0000-0000-000000000004','Provider B','provider','GB');
insert into public.organization_memberships(organization_id,user_id,role,status,created_at,updated_at)
select '24000000-0000-0000-0000-000000000001',('14000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'employee','active',date_trunc('month',now())-interval '2 months',now() from generate_series(1,20)i;
insert into public.organization_memberships(organization_id,user_id,role,status,created_at,updated_at) values
('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000021','employer_admin','active',now(),now()),
('24000000-0000-0000-0000-000000000002','14000000-0000-0000-0000-000000000021','employer_admin','active',now(),now()),
('24000000-0000-0000-0000-000000000003','14000000-0000-0000-0000-000000000022','provider_staff','active',now(),now()),
('24000000-0000-0000-0000-000000000004','14000000-0000-0000-0000-000000000023','provider_staff','active',now(),now());
insert into public.screenings(id,organization_id,owner_user_id,flow_id,protocol_version,scoring_version,status,idempotency_key,completed_at) values
('34000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','adult-comfort','v1','v1','completed','44000000-0000-0000-0000-000000000001',date_trunc('month',now())-interval '15 days');
insert into public.screening_results values('34000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','review_recommended',5,30,'v1','v1',date_trunc('month',now())-interval '15 days');
insert into public.screenings(id,organization_id,owner_user_id,flow_id,protocol_version,scoring_version,status,idempotency_key,completed_at)
select ('34000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'24000000-0000-0000-0000-000000000001',('14000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'adult-comfort','v1','v1','completed',('44000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,date_trunc('month',now())-interval '15 days'
from generate_series(2,18)i;
insert into public.screening_results(screening_id,owner_user_id,organization_id,outcome,total_score,review_within_days,protocol_version,scoring_version,created_at)
select ('34000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,('14000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'24000000-0000-0000-0000-000000000001','review_recommended',5,30,'v1','v1',date_trunc('month',now())-interval '15 days'
from generate_series(2,18)i;
insert into public.care_pathways(id,screening_id,organization_id,owner_user_id,status) values('54000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','referral_created');
insert into public.referrals(id,care_pathway_id,organization_id,owner_user_id,priority,respond_by,idempotency_key,created_at,updated_at) values('64000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','review_recommended',now()+interval '7 days','74000000-0000-0000-0000-000000000001',date_trunc('month',now())-interval '15 days',date_trunc('month',now())-interval '15 days');
insert into public.care_pathways(id,screening_id,organization_id,owner_user_id,status)
select ('54000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,('34000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'24000000-0000-0000-0000-000000000001',('14000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'referral_created'
from generate_series(2,16)i;
insert into public.referrals(id,care_pathway_id,organization_id,owner_user_id,priority,respond_by,idempotency_key,created_at,updated_at)
select ('64000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,('54000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'24000000-0000-0000-0000-000000000001',('14000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'review_recommended',now()+interval '7 days',('74000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,date_trunc('month',now())-interval '15 days',date_trunc('month',now())-interval '15 days'
from generate_series(2,16)i;

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.consent_and_assign_employee_referral_provider('24000000-0000-0000-0000-000000000001','64000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000003',1,'75000000-0000-0000-0000-000000000001')$$,'employee explicitly consents and assigns one provider atomically');
select lives_ok($$select public.consent_and_assign_employee_referral_provider('24000000-0000-0000-0000-000000000001','64000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000003',1,'75000000-0000-0000-0000-000000000001')$$,'combined consent and assignment is idempotent');
select ok(exists(select 1 from public.data_consents where organization_id='24000000-0000-0000-0000-000000000001' and owner_user_id='14000000-0000-0000-0000-000000000001' and provider_organization_id='24000000-0000-0000-0000-000000000003' and granted),'combined action records explicit clinic consent');
select public.set_employee_consent('24000000-0000-0000-0000-000000000001','clinic_access',false,'24000000-0000-0000-0000-000000000003');
select throws_ok($$select public.consent_and_assign_employee_referral_provider('24000000-0000-0000-0000-000000000001','64000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000003',1,'75000000-0000-0000-0000-000000000001')$$,'42501',null,'cached employee assignment cannot bypass revoked clinic consent');
select public.set_employee_consent('24000000-0000-0000-0000-000000000001','clinic_access',true,'24000000-0000-0000-0000-000000000003');
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000021',true);
select lives_ok($$select public.get_employer_outcomes('24000000-0000-0000-0000-000000000001',date_trunc('month',now())-interval '1 month',date_trunc('month',now()))$$,'employer reads a completed fixed calendar month');
select is(public.get_employer_outcomes('24000000-0000-0000-0000-000000000001',date_trunc('month',now())-interval '1 month',date_trunc('month',now()))->>'screened',null::text,'screened cell is suppressed when its complement is too small');
select is(public.get_employer_outcomes('24000000-0000-0000-0000-000000000001',date_trunc('month',now())-interval '1 month',date_trunc('month',now()))->>'screeningRate',null::text,'screening rate is suppressed with its count cell');
select is(public.get_employer_outcomes('24000000-0000-0000-0000-000000000001',date_trunc('month',now())-interval '1 month',date_trunc('month',now()))->>'nextStep',null::text,'next-step cell is suppressed when the preceding funnel complement is too small');
select throws_ok($$select public.get_employer_outcomes('24000000-0000-0000-0000-000000000001',now()-interval '30 days',now())$$,'22023',null,'arbitrary overlapping windows cannot be used for differencing');
select lives_ok($$select public.get_employer_outcomes('24000000-0000-0000-0000-000000000002',date_trunc('month',now())-interval '1 month',date_trunc('month',now()))$$,'small same-role organization receives a safe suppression response');
select is(public.get_employer_outcomes('24000000-0000-0000-0000-000000000002',date_trunc('month',now())-interval '1 month',date_trunc('month',now()))->>'privacySuppressed','true','small cohort response is explicitly suppressed');
select ok(not public.get_employer_outcomes('24000000-0000-0000-0000-000000000002',date_trunc('month',now())-interval '1 month',date_trunc('month',now())) ? 'cohortSize','small cohort response does not expose its size');
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000024',true);
select throws_ok($$select public.get_employer_outcomes('24000000-0000-0000-0000-000000000001',date_trunc('month',now())-interval '1 month',date_trunc('month',now()))$$,'42501',null,'missing employer membership remains a real access denial');
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000021',true);
select is((select count(*)::int from public.screening_results),0,'employer cannot read medical results directly');
select is((select count(*)::int from public.referrals),0,'employer cannot read referrals directly');

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000022',true);
select is((public.get_provider_queue('24000000-0000-0000-0000-000000000003',null,null,null,25,0)->>'total')::int,1,'consented provider sees assigned referral');
select lives_ok($$select public.book_provider_appointment('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001',2,now()+interval '2 minutes','84000000-0000-0000-0000-000000000001')$$,'provider books appointment');
select lives_ok($$select public.book_provider_appointment('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001',2,now()+interval '2 minutes','84000000-0000-0000-0000-000000000001')$$,'appointment operation is idempotent');
select is((select count(*)::int from public.referral_appointments),1,'idempotent booking creates one appointment');
select throws_ok($$select public.book_provider_appointment('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001',2,now()+interval '3 days','84000000-0000-0000-0000-000000000001')$$,'22023',null,'idempotency key cannot be reused with different input');
select lives_ok($$select public.get_provider_referral('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001')$$,'provider opens consented referral detail');
select lives_ok($$select public.escalate_provider_referral('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001',3,'clinical_red_flag','84000000-0000-0000-0000-000000000003')$$,'provider escalation uses the locked referral version');
select throws_ok($$select public.confirm_provider_outcome('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001',4,'exam_completed',now(),'84000000-0000-0000-0000-000000000004')$$,'22023',null,'outcome cannot predate its booked appointment');
select lives_ok($$select public.confirm_provider_outcome('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001',4,'exam_completed',now()+interval '3 minutes','84000000-0000-0000-0000-000000000004')$$,'provider outcome uses the next locked referral version');

reset role;
update public.data_consents set granted=false where organization_id='24000000-0000-0000-0000-000000000001' and owner_user_id='14000000-0000-0000-0000-000000000001' and provider_organization_id='24000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000022',true);
select throws_ok($$select public.book_provider_appointment('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001',2,now()+interval '2 minutes','84000000-0000-0000-0000-000000000001')$$,'42501',null,'cached provider operation cannot bypass revoked clinic consent');
reset role;
update public.data_consents set granted=true where organization_id='24000000-0000-0000-0000-000000000001' and owner_user_id='14000000-0000-0000-0000-000000000001' and provider_organization_id='24000000-0000-0000-0000-000000000003';
update public.organization_memberships set status='suspended' where organization_id='24000000-0000-0000-0000-000000000003' and user_id='14000000-0000-0000-0000-000000000022';
set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000022',true);
select throws_ok($$select public.book_provider_appointment('24000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000001',2,now()+interval '2 minutes','84000000-0000-0000-0000-000000000001')$$,'42501',null,'cached provider operation cannot bypass inactive provider membership');
reset role;
update public.organization_memberships set status='active' where organization_id='24000000-0000-0000-0000-000000000003' and user_id='14000000-0000-0000-0000-000000000022';
set local role authenticated;

select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000023',true);
select throws_ok($$select public.get_provider_referral('24000000-0000-0000-0000-000000000004','64000000-0000-0000-0000-000000000001')$$,'42501',null,'other provider organization cannot open referral');
select throws_ok($$select public.escalate_provider_referral('24000000-0000-0000-0000-000000000004','64000000-0000-0000-0000-000000000001',2,'clinical_red_flag','84000000-0000-0000-0000-000000000002')$$,'42501',null,'other provider cannot mutate referral');

reset role;
select ok((select count(*) from public.audit_events where action='provider.referral_sensitive_read')=1,'provider detail sensitive read is audited');
select ok((select count(*) from public.audit_events where action='provider.queue_sensitive_read')=1,'provider queue sensitive read is audited');
select ok((select count(*) from public.employer_outcome_reports)=1,'aggregate report is snapshotted against repeat-query differencing');
insert into public.data_deletion_requests(id,owner_user_id,owner_subject,organization_id) values('94000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001');
select lives_ok($$select public.claim_employee_data_deletion('94000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001')$$,'production worker claims deletion lease');
select lives_ok($$select public.complete_employee_data_deletion('94000000-0000-0000-0000-000000000001',(select worker_token from public.data_deletion_requests where id='94000000-0000-0000-0000-000000000001'))$$,'worker deletes Slice 3 referral children before parent');
select is((select count(*)::int from public.referral_appointments where owner_user_id='14000000-0000-0000-0000-000000000001'),0,'worker removes appointment data');
select is((select count(*)::int from public.referral_escalations where owner_user_id='14000000-0000-0000-0000-000000000001'),0,'worker removes escalation data');
select is((select count(*)::int from public.clinical_outcomes where owner_user_id='14000000-0000-0000-0000-000000000001'),0,'worker removes outcome data');
select * from finish();rollback;
