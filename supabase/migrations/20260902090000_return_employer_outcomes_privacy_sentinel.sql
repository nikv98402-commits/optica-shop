begin;

create or replace function public.get_employer_outcomes(target_organization_id uuid,target_from timestamptz,target_to timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare cohort_size integer; screened integer; next_step integer; completed integer; result jsonb;
begin
 if auth.uid() is null or not private.has_org_role(target_organization_id,array['employer_admin']::public.organization_role[]) then raise exception 'Employer membership required' using errcode='42501'; end if;
 if target_from<>(date_trunc('month',target_from at time zone 'UTC') at time zone 'UTC') or target_to<>target_from+interval '1 month' or target_to>date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' then
  raise exception 'Only completed UTC calendar months are available' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',target_organization_id::text,target_from::text,target_to::text),0));
 select response into result from public.employer_outcome_reports where organization_id=target_organization_id and period_from=target_from and period_to=target_to;
 if result is not null then
  insert into public.audit_events(actor_user_id,organization_id,action,resource_type,metadata) values(auth.uid(),target_organization_id,'employer.outcomes_viewed','aggregate_report',jsonb_build_object('from',target_from,'to',target_to,'snapshot',true));
  return result;
 end if;
 select count(*) into cohort_size from public.organization_memberships where organization_id=target_organization_id and role='employee' and status='active' and created_at<target_to;
 if cohort_size<20 then
  insert into public.audit_events(actor_user_id,organization_id,action,resource_type,metadata) values(auth.uid(),target_organization_id,'employer.outcomes_suppressed','aggregate_report',jsonb_build_object('from',target_from,'to',target_to,'privacyThreshold',20));
  return jsonb_build_object('privacySuppressed',true,'privacyThreshold',20,'from',target_from,'to',target_to);
 end if;
 with screened_cohort as (
  select distinct s.owner_user_id from public.screenings s where s.organization_id=target_organization_id and s.status='completed' and s.completed_at>=target_from and s.completed_at<target_to
 ), next_step_cohort as (
  select distinct r.id,r.owner_user_id from public.referrals r join screened_cohort sc on sc.owner_user_id=r.owner_user_id
  where r.organization_id=target_organization_id and r.priority in('review_recommended','urgent') and r.created_at>=target_from and r.created_at<target_to
 )
 select (select count(*) from screened_cohort),(select count(*) from next_step_cohort),
  (select count(*) from next_step_cohort n where exists(select 1 from public.clinical_outcomes o where o.referral_id=n.id and o.completed_at<target_to))
 into screened,next_step,completed;
 result:=jsonb_build_object(
  'cohortSize',cohort_size,
  'screened',case when screened>=5 and cohort_size-screened>=5 then to_jsonb(screened) else 'null'::jsonb end,
  'nextStep',case when next_step>=5 and screened-next_step>=5 then to_jsonb(next_step) else 'null'::jsonb end,
  'completedCareLoops',case when next_step>=5 and completed>=5 and next_step-completed>=5 then to_jsonb(completed) else 'null'::jsonb end,
  'screeningRate',case when screened>=5 and cohort_size-screened>=5 then to_jsonb(round(100.0*screened/cohort_size,1)) else 'null'::jsonb end,
  'completionRate',case when next_step>=5 and completed>=5 and next_step-completed>=5 then to_jsonb(round(100.0*completed/next_step,1)) else 'null'::jsonb end,
  'privacyThreshold',20,'cellSuppressionThreshold',5,'from',target_from,'to',target_to);
 insert into public.employer_outcome_reports(organization_id,period_from,period_to,response) values(target_organization_id,target_from,target_to,result);
 insert into public.audit_events(actor_user_id,organization_id,action,resource_type,metadata) values(auth.uid(),target_organization_id,'employer.outcomes_viewed','aggregate_report',jsonb_build_object('from',target_from,'to',target_to,'cohortSize',cohort_size));
 return result;
end $$;

revoke all on function public.get_employer_outcomes(uuid,timestamptz,timestamptz) from public;
grant execute on function public.get_employer_outcomes(uuid,timestamptz,timestamptz) to authenticated;

commit;
