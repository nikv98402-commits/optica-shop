import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { BackendResult, CreatePaymentIntentRequest, CreatePaymentIntentResponse } from '../types/backend';
import { assertBackendPayloadSafe } from './privacyGuard';

export async function createPaymentIntent(payload: CreatePaymentIntentRequest): Promise<BackendResult<CreatePaymentIntentResponse>> {
  if (!isSupabaseConfigured) {
    return { ok: false, reason: 'backend_disabled', message: 'Backend is not configured.' };
  }

  if (payload.serviceType !== 'visit_preparation' || payload.amountRub < 0) {
    return { ok: false, reason: 'validation_failed', message: 'Payment payload is incomplete.' };
  }

  try {
    assertBackendPayloadSafe(payload);
  } catch (error) {
    trackEvent(AnalyticsEvent.BackendPaymentIntentFailed, { source: payload.sourcePage, error_code: 'privacy_payload_rejected' });
    return {
      ok: false,
      reason: 'privacy_payload_rejected',
      message: error instanceof Error ? error.message : 'Payment payload contains forbidden fields.',
    };
  }

  const { data, error } = await supabase.functions.invoke<CreatePaymentIntentResponse>('create-payment-intent', {
    body: payload,
  });

  if (error || !data?.paymentIntentId) {
    trackEvent(AnalyticsEvent.BackendPaymentIntentFailed, { source: payload.sourcePage, error_code: error?.name || 'request_failed' });
    return { ok: false, reason: 'request_failed', message: error?.message || 'Payment intent request failed.' };
  }

  trackEvent(AnalyticsEvent.BackendPaymentIntentCreated, {
    source: payload.sourcePage,
    service_type: payload.serviceType,
    provider_mode: data.providerMode,
  });

  return { ok: true, data };
}
