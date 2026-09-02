begin;

create or replace function public.get_employee_referral_detail(
  target_organization_id uuid,
  target_referral_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  current_referral public.referrals;
begin
  select * into current_referral
  from public.referrals
  where id = target_referral_id
    and organization_id = target_organization_id;

  if current_referral.id is null
     or current_referral.owner_user_id <> auth.uid()
     or not private.has_org_role(
       target_organization_id,
       array['employee']::public.organization_role[]
     ) then
    raise exception 'Referral not found' using errcode = '42501';
  end if;

  return to_jsonb(current_referral) || jsonb_build_object(
    'appointment_at', (
      select a.scheduled_at
      from public.referral_appointments as a
      where a.referral_id = current_referral.id
    )
  );
end;
$$;

revoke all on function public.get_employee_referral_detail(uuid, uuid) from public;
grant execute on function public.get_employee_referral_detail(uuid, uuid) to authenticated;

create or replace function public.get_employee_vision_passport(target_organization_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employee']::public.organization_role[]) then raise exception 'Employee membership required' using errcode='42501'; end if;
 return jsonb_build_object(
  'screenings',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'completedAt',s.completed_at,'outcome',r.outcome,'reviewWithinDays',r.review_within_days) order by s.completed_at desc) from public.screenings s join public.screening_results r on r.screening_id=s.id where s.organization_id=target_organization_id and s.owner_user_id=auth.uid()),'[]'::jsonb),
  'referrals',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'status',case when r.provider_status='unassigned' then r.status::text else r.provider_status end,'priority',r.priority,'respondBy',r.respond_by,'appointmentAt',a.scheduled_at,'createdAt',r.created_at) order by r.created_at desc) from public.referrals r left join public.referral_appointments a on a.referral_id=r.id where r.organization_id=target_organization_id and r.owner_user_id=auth.uid()),'[]'::jsonb),
  'recommendations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'titleKey',title_key,'status',status,'dueAt',due_at) order by created_at desc) from public.vision_recommendations where organization_id=target_organization_id and owner_user_id=auth.uid()),'[]'::jsonb),
  'documents',coalesce((select jsonb_agg(jsonb_build_object('id',id,'type',document_type,'title',title,'storagePath',storage_path,'issuedAt',issued_at) order by issued_at desc) from public.clinic_documents where organization_id=target_organization_id and owner_user_id=auth.uid()),'[]'::jsonb),
  'nextReviewAt',(select min(candidate_at) from (
    select s.completed_at+make_interval(days=>r.review_within_days) as candidate_at
      from public.screenings s join public.screening_results r on r.screening_id=s.id
      where s.organization_id=target_organization_id and s.owner_user_id=auth.uid()
        and r.review_within_days>0 and s.completed_at+make_interval(days=>r.review_within_days)>now()
    union all
    select due_at from public.vision_recommendations
      where organization_id=target_organization_id and owner_user_id=auth.uid()
        and status='active' and due_at>now()
  ) future_reviews));
end $$;

commit;
