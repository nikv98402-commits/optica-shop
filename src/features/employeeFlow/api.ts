import { supabase } from '../../lib/supabase';
import type { Referral, ReferralProviderOption, Screening, ScreeningAnswer, ScreeningProgress, ScreeningResult } from './types';

type RpcRow = { screening: Screening; result: ScreeningResult };

export async function getLatestScreening(organizationId: string) {
  const { data, error } = await supabase.from('screenings').select('*')
    .eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as Screening | null;
}

export async function startScreening(organizationId: string) {
  const { data, error } = await supabase.rpc('start_employee_screening', {
    target_organization_id: organizationId,
    request_idempotency_key: crypto.randomUUID(),
  }).single();
  if (error) throw error;
  return data as Screening;
}

export async function getScreeningProgress(organizationId: string, screeningId: string) {
  const { data, error } = await supabase.from('screening_measurements')
    .select('screening_id,current_step,answers,updated_at')
    .eq('organization_id', organizationId).eq('screening_id', screeningId).maybeSingle();
  if (error) throw error;
  return data as ScreeningProgress | null;
}

export async function saveScreeningProgress(
  organizationId: string,
  screening: Screening,
  currentStep: number,
  answers: ScreeningAnswer[],
) {
  const { data, error } = await supabase.rpc('save_employee_screening_progress', {
    target_organization_id: organizationId,
    target_screening_id: screening.id,
    expected_version: screening.version,
    target_current_step: currentStep,
    submitted_answers: answers,
  }).single();
  if (error) throw error;
  return data as Screening;
}

export async function completeScreening(organizationId: string, screening: Screening, answers: ScreeningAnswer[]) {
  const { data, error } = await supabase.rpc('complete_employee_screening', {
    target_organization_id: organizationId,
    target_screening_id: screening.id,
    expected_version: screening.version,
    submitted_answers: answers,
  });
  if (error) throw error;
  return (data as RpcRow[])[0];
}

export async function getScreeningResult(organizationId: string, screeningId: string) {
  const { data, error } = await supabase.rpc('get_employee_screening_result', {
    target_organization_id: organizationId,
    target_screening_id: screeningId,
  });
  if (error) throw error;
  return (data as RpcRow[])[0];
}

export async function createReferral(organizationId: string, screeningId: string) {
  const { data, error } = await supabase.rpc('create_employee_referral', {
    target_organization_id: organizationId,
    target_screening_id: screeningId,
    request_idempotency_key: crypto.randomUUID(),
  }).single();
  if (error) throw error;
  return data as Referral;
}

export async function getReferral(organizationId: string, referralId: string) {
  const { data, error } = await supabase.rpc('get_employee_referral', {
    target_organization_id: organizationId,
    target_referral_id: referralId,
  }).single();
  if (error) throw error;
  return data as Referral;
}

export async function getReferralProviderOptions(organizationId: string) {
  const { data, error } = await supabase.rpc('get_employee_profile_settings', { target_organization_id: organizationId });
  if (error) throw error;
  return ((data as { providers?: ReferralProviderOption[] } | null)?.providers ?? []);
}

export async function consentAndAssignReferral(organizationId: string, referral: Referral, providerOrganizationId: string, idempotencyKey: string) {
  const { data, error } = await supabase.rpc('consent_and_assign_employee_referral_provider', {
    target_organization_id: organizationId, target_referral_id: referral.id,
    target_provider_organization_id: providerOrganizationId, expected_version: referral.version,
    request_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as Referral;
}
