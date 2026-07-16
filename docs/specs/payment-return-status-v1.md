# Payment return and test status contour v1

Issue: https://github.com/nikv98402-commits/optica-shop/issues/33

Status: implementation approved

Price: 429 RUB

Real charging: disabled

## Goal

Prepare the existing visit-preparation offer for a future YooKassa integration without enabling real charges. The browser may create an intent, read a minimal trusted status, and render return, success, and failure states. Registration remains optional.

## Current risks

1. `src/pages/TryOnPilot.tsx` owns the old 290 RUB price.
2. `src/services/paymentService.ts` sends amount and provider from the browser.
3. `create-payment-intent` trusts those values and can report `provider_created` without a provider payment.
4. There is no public-safe status lookup or payment-result route.

## Server-owned offer

```ts
const PAYMENT_OFFERS = {
  visit_preparation_v1: {
    serviceType: 'visit_preparation',
    amountRub: 429,
    currency: 'RUB',
  },
} as const;
```

The browser sends only `offerCode`, optional `leadId`, and `sourcePage`. Price, currency, provider, description, and status are server-owned.

## API contracts

### Create intent

```ts
type CreatePaymentIntentRequest = {
  offerCode: 'visit_preparation_v1';
  leadId?: string;
  sourcePage: '/tryon' | '/products';
  idempotencyKey: string;
};

type CreatePaymentIntentResponse = {
  paymentIntentId: string;
  publicToken: string;
  offerCode: 'visit_preparation_v1';
  amountRub: 429;
  currency: 'RUB';
  status: 'draft';
  providerMode: 'test_not_connected';
  returnUrl: string;
};
```

### Read status

`GET get-payment-status?token=<opaque-public-token>` returns only:

```ts
type PaymentPublicStatus = {
  offerCode: 'visit_preparation_v1';
  amountRub: 429;
  currency: 'RUB';
  status: 'draft' | 'provider_created' | 'paid' | 'cancelled' | 'failed';
  providerMode: 'test_not_connected';
};
```

No contact, internal payment UUID, provider payment ID, photo, prescription, symptom, answer, or exact location may be returned.

## Routes

- `/payment/return`: checks the trusted backend status.
- `/payment/success`: confirmed test-success presentation and local test access.
- `/payment/failed`: cancelled, failed, unavailable, and retry presentation.

The return URL never changes payment state. URL parameters cannot produce a production paid entitlement.

## Test mode

Local/dev builds may simulate `pending`, `paid`, `cancelled`, and `failed`. Every simulated result must be visibly labelled as test data, stored separately from verified entitlements, and excluded from verified revenue analytics.

## Database migration

Add forward-only fields and indexes to `payment_intents`:

- `offer_code text`;
- `public_token uuid unique`;
- `idempotency_key uuid unique`;
- `paid_at timestamptz`;
- `failure_code text`;
- unique `(provider, provider_payment_id)` when provider ID exists.

Existing RLS remains unchanged: anonymous clients do not read or write the table directly.

## Privacy and analytics

Allowed analytics: offer code, amount, currency, source, normalized UI status, safe error code. Forbidden: internal UUID, public token, provider ID, contact, photo, prescription, symptoms, answers, exact location, or card data.

## Acceptance criteria

1. All payment offer UI displays 429 RUB.
2. Browser input cannot modify server price, currency, provider, or status.
3. Repeated creation with one idempotency key returns one intent.
4. Payment result works without registration.
5. Forged URL parameters cannot create a production paid state.
6. RU is default and all new states fully translate to EN.
7. The selected-frame shortlist survives the return flow.
8. Layouts at 390 px and 1440 px have no clipping or horizontal overflow.
9. Try-on, Face-fit score, frame saving, nearby optics, and visit lead submission remain unchanged.
10. Test success is labelled and is not tracked as verified revenue.
11. Typecheck, lint, build, and route smoke checks pass.

## Out of scope

- YooKassa API call and confirmation URL.
- Production webhook and real charging.
- Fiscal receipts and refunds.
- Production merchant credentials.
- Bank-card storage, now or later.

## Rollback

Revert the implementation commit and disable payment mode. The migration is additive; retain audit records and do not drop payment data during a frontend rollback.
