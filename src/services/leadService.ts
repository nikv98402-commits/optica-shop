import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { BackendResult, SubmitVisitLeadRequest, SubmitVisitLeadResponse } from '../types/backend';
import { assertBackendPayloadSafe } from './privacyGuard';

export async function submitVisitLead(payload: SubmitVisitLeadRequest): Promise<BackendResult<SubmitVisitLeadResponse>> {
  if (!isSupabaseConfigured) {
    return { ok: false, reason: 'backend_disabled', message: 'Backend is not configured.' };
  }

  if (!payload.consentPersonalData || payload.contactValue.trim().length < 3 || payload.selectedFrames.length < 1) {
    return { ok: false, reason: 'validation_failed', message: 'Lead payload is incomplete.' };
  }

  try {
    assertBackendPayloadSafe(payload);
  } catch (error) {
    trackEvent(AnalyticsEvent.BackendLeadSubmitFailed, { source: 'tryon', error_code: 'privacy_payload_rejected' });
    return {
      ok: false,
      reason: 'privacy_payload_rejected',
      message: error instanceof Error ? error.message : 'Lead payload contains forbidden fields.',
    };
  }

  trackEvent(AnalyticsEvent.BackendLeadSubmitStarted, {
    source: 'tryon',
    frame_count: payload.selectedFrames.length,
    service_type: 'visit_preparation',
  });

  const { data, error } = await supabase.functions.invoke<SubmitVisitLeadResponse>('submit-visit-lead', {
    body: payload,
  });

  if (error || !data?.leadId) {
    trackEvent(AnalyticsEvent.BackendLeadSubmitFailed, { source: 'tryon', error_code: error?.name || 'request_failed' });
    return { ok: false, reason: 'request_failed', message: error?.message || 'Lead request failed.' };
  }

  trackEvent(AnalyticsEvent.BackendLeadSubmitSucceeded, {
    source: 'tryon',
    frame_count: payload.selectedFrames.length,
    service_type: 'visit_preparation',
  });

  return { ok: true, data };
}
