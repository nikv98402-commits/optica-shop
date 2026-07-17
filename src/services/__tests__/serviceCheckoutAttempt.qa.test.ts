import { beforeEach, describe, expect, it } from 'vitest';
import {
  SERVICE_CHECKOUT_ATTEMPT_STORAGE_KEY,
  clearServiceCheckoutAttempt,
  readServiceCheckoutAttempt,
  renewServiceCheckoutPaymentAttempt,
  saveServiceCheckoutAttempt,
} from '../serviceCheckout';

const attempt = {
  version: 1 as const,
  draftCreatedAt: '2026-07-17T09:00:00.000Z',
  leadId: 'lead-opaque-id',
  paymentCapabilityToken: 'capability-opaque-token',
  idempotencyKey: 'payment-idempotency-key',
};

describe('service checkout attempt persistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('restores opaque payment state only for the same checkout draft', () => {
    expect(saveServiceCheckoutAttempt(attempt)).toBe(true);
    expect(readServiceCheckoutAttempt(attempt.draftCreatedAt)).toEqual(attempt);

    expect(readServiceCheckoutAttempt('2026-07-17T10:00:00.000Z')).toBeNull();
    expect(window.sessionStorage.getItem(SERVICE_CHECKOUT_ATTEMPT_STORAGE_KEY)).toBeNull();
  });

  it('rejects malformed attempts instead of persisting partial state', () => {
    expect(saveServiceCheckoutAttempt({ ...attempt, paymentCapabilityToken: '' })).toBe(false);
    expect(window.sessionStorage.getItem(SERVICE_CHECKOUT_ATTEMPT_STORAGE_KEY)).toBeNull();
  });

  it('renews only the payment key after a terminal payment status', () => {
    expect(saveServiceCheckoutAttempt(attempt)).toBe(true);
    expect(renewServiceCheckoutPaymentAttempt(attempt.draftCreatedAt, 'next-payment-key')).toBe(true);
    expect(readServiceCheckoutAttempt(attempt.draftCreatedAt)).toEqual({
      ...attempt,
      idempotencyKey: 'next-payment-key',
    });

    clearServiceCheckoutAttempt();
    expect(readServiceCheckoutAttempt(attempt.draftCreatedAt)).toBeNull();
  });
});
