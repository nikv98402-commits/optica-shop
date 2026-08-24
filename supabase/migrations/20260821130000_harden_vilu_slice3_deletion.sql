begin;

create or replace function public.complete_employee_data_deletion(target_request_id uuid,target_worker_token uuid)
returns public.data_deletion_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare request_row public.data_deletion_requests; subject uuid;
begin
 select * into request_row from public.data_deletion_requests
  where id=target_request_id and status='processing' and worker_token=target_worker_token
  for update;
 if request_row.id is null then raise exception 'Active deletion lease not found' using errcode='42501'; end if;
 subject:=request_row.owner_subject;

 -- Slice 3 records use RESTRICT references so they must be erased before the
 -- referral. Keeping this work in the leased completion transaction means a
 -- failure cannot report the request as completed with clinical rows retained.
 delete from public.provider_operation_receipts where subject_user_id=subject and referral_id in
  (select id from public.referrals where organization_id=request_row.organization_id and owner_user_id=subject);
 delete from public.referral_appointments where employee_organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.referral_escalations where employee_organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.clinical_outcomes where employee_organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.referrals where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.care_pathways where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.screening_results where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.screening_measurements where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.screenings where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.vision_recommendations where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.clinic_documents where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.data_consents where organization_id=request_row.organization_id and owner_user_id=subject;
 delete from public.organization_memberships where organization_id=request_row.organization_id and user_id=subject and role='employee';
 update public.data_deletion_requests
  set status='completed',processed_at=now(),owner_user_id=null,worker_token=null,lease_expires_at=null
  where id=request_row.id returning * into request_row;
 return request_row;
end $$;

revoke all on function public.complete_employee_data_deletion(uuid,uuid) from public;
grant execute on function public.complete_employee_data_deletion(uuid,uuid) to service_role;

commit;
