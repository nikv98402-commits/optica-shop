import { AnalyticsEvent, trackEvent } from '../lib/analyticsEvents';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  BackendResult,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  PaymentIntentStatus,
  PublicPaymentStatusResponse,
} from '../types/backend';
import { assertBackendPayloadSafe } from './privacyGuard';

const PAYMENT_RECEIPT_PREFIX = 'vilu_payment_receipt_';

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getPaymentIdempotencyKey() {
  return randomId();
}

function receiptKey(publicToken: string) {
  return `${PAYMENT_RECEIPT_PREFIX}${publicToken}`;
}

function storeSafeReceipt(receipt: PublicPaymentStatusResponse) {
  try {
    window.localStorage.setItem(receiptKey(receipt.publicToken), JSON.stringify(receipt));
  } catch {
    // Status can still be fetched from the backend when storage is unavailable.
  }
}

function readSafeReceipt(publicToken: string): PublicPaymentStatusResponse | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(receiptKey(publicToken));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicPaymentStatusResponse;
  } catch {
    return null;
  }
}

function demoIntent(): CreatePaymentIntentResponse {
  const publicToken = `demo_${randomId()}`;
  const response: CreatePaymentIntentResponse = {
    paymentIntentId: `local_${randomId()}`,
    publicToken,
    offerCode: 'visit_preparation_v1',
    amountRub: 429,
    currency: 'RUB',
    status: 'draft',
    providerMode: 'test_not_connected',
    returnUrl: `/payment/return?token=${encodeURIComponent(publicToken)}`,
  };
  storeSafeReceipt(response);
  return response;
}

export async function createPaymentIntent(payload: CreatePaymentIntentRequest): Promise<BackendResult<CreatePaymentIntentResponse>> {
  if (payload.offerCode !== 'visit_preparation_v1' || !payload.leadId || !payload.idempotencyKey) {
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

  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV || import.meta.env.VITE_PAYMENT_DEMO_MODE === 'true') {
      return { ok: true, data: demoIntent() };
    }
    return { ok: false, reason: 'backend_disabled', message: 'Backend is not configured.' };
  }

  const { data, error } = await supabase.functions.invoke<CreatePaymentIntentResponse>('create-payment-intent', {
    body: payload,
  });

  if (error || !data?.paymentIntentId || !data.publicToken) {
    trackEvent(AnalyticsEvent.BackendPaymentIntentFailed, { source: payload.sourcePage, error_code: error?.name || 'request_failed' });
    return { ok: false, reason: 'request_failed', message: error?.message || 'Payment intent request failed.' };
  }

  storeSafeReceipt(data);
  trackEvent(AnalyticsEvent.BackendPaymentIntentCreated, {
    source: payload.sourcePage,
    offer_code: payload.offerCode,
    provider_mode: data.providerMode,
  });
  return { ok: true, data };
}

export async function getPaymentStatus(publicToken: string): Promise<BackendResult<PublicPaymentStatusResponse>> {
  if (!publicToken) return { ok: false, reason: 'validation_failed', message: 'Missing payment token.' };

  const localReceipt = readSafeReceipt(publicToken);
  if (publicToken.startsWith('demo_') && localReceipt) return { ok: true, data: localReceipt };
  if (!isSupabaseConfigured) return { ok: false, reason: 'backend_disabled', message: 'Backend is not configured.' };

  const { data, error } = await supabase.functions.invoke<PublicPaymentStatusResponse>('get-payment-status', {
    body: { token: publicToken },
  });
  if (error || !data?.publicToken) {
    return { ok: false, reason: 'request_failed', message: error?.message || 'Payment status request failed.' };
  }
  storeSafeReceipt(data);
  return { ok: true, data };
}

export function simulateLocalPaymentStatus(publicToken: string, status: PaymentIntentStatus) {
  if (!publicToken.startsWith('demo_')) return false;
  const receipt = readSafeReceipt(publicToken);
  if (!receipt) return false;
  storeSafeReceipt({ ...receipt, status, paidAt: status === 'paid' ? new Date().toISOString() : undefined });
  return true;
}
