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

## Approved design direction

The payment contour uses a calm, confidence-building service flow. It must look and behave like an existing ViLu workflow, not a generic checkout or an internal experiment dashboard.

### Information hierarchy

```text
Selected 2-3 frames
        |
Prepare the visit for 429 RUB
        |
Selected frames -> service deliverables -> total price
        |
No photo or prescription shared -> test mode disclosure
        |
Continue to test payment
        |
Pending -> success / failure / unknown -> one clear next action
```

The user-facing entry point is value-led: `Prepare the visit for 429 RUB` / `Подготовить визит за 429 ₽`. Internal research language such as `Проверить готовность платить` is forbidden in the primary user journey.

### Offer modal

The modal shows, in this order:

1. Service title and a one-sentence outcome.
2. A compact strip of the selected frames.
3. One ordered list of service deliverables.
4. `Total / Итого: 429 RUB`.
5. A compact trust note: no photo or prescription is sent.
6. A test-mode disclosure immediately before the primary action.
7. Primary and secondary actions.

Do not use a symmetric dashboard grid for `price / shortlist / data`. The selected frames are the visual anchor. Lime is reserved for the primary action and successful progress; supporting information uses ink, paper, cream, and the existing trust green.

### Interaction states

| Feature | Loading | Empty | Error | Success | Partial / unknown |
|---|---|---|---|---|---|
| Offer entry | Preserve button width; show `Готовим переход...`; disable repeat clicks | Disable payment entry until frames are selected; explain how to save 2-3 frames | Keep shortlist and show a retry action | Navigate to trusted return URL | Do not create a second intent for the same idempotency key |
| Payment return | Show neutral progress and `Проверяем результат оплаты` | Treat missing token as unknown, not success | Explain that status could not be checked; allow retry or return | Render the verified result state | Show `Статус пока не получен` with a manual recheck action |
| Test success | N/A | N/A | N/A | Clearly state `Интерес сохранен, списания нет`; return to shortlist | Never present test success as paid revenue or entitlement |
| Real success, future mode | N/A | N/A | N/A | State `Оплата подтверждена`; open visit preparation | Only render after trusted backend confirmation |
| Failed / cancelled | N/A | N/A | Use plain language and preserve context | N/A | Offer retry and return without losing selected frames |

Status pages must differ through iconography, heading, explanation, and action, not color alone. URL parameters never determine success presentation.

### User journey and tone

| Step | User action | Intended feeling | Interface support |
|---|---|---|---|
| 1 | Saves frames | Confidence | The shortlist remains visible and specific |
| 2 | Opens the offer | Interest | Outcome and price are immediately clear |
| 3 | Reviews the service | Control | Deliverables, data boundaries, and total are explicit |
| 4 | Starts the test | Safety | `No charge` is stated before the action |
| 5 | Waits for status | Calm | The UI names the current state and blocks duplicate action |
| 6 | Receives a result | Completion | One honest next action is presented |

Tone is calm, expert, and direct. Do not use urgency, artificial scarcity, discount theatre, or internal analytics language.

### Test controls and mode-specific completion

- Payment simulation controls exist only in development/test builds behind an explicit test flag.
- Production UI never exposes `simulate success`, `simulate failure`, internal IDs, tokens, or provider diagnostics.
- Test success says that interest was recorded and no charge occurred; its CTA returns to the saved shortlist.
- Future real-payment success says that payment was confirmed; its CTA opens visit preparation.
- Test and real completion copy must never share a component state that could accidentally imply a verified charge.

### Responsive and accessibility contract

- At desktop widths, use a centered dialog.
- At mobile widths, use a near-full-height bottom sheet with internal scrolling and a sticky action area.
- The dialog has `role="dialog"`, `aria-modal="true"`, and an accessible title relationship.
- Focus moves into the dialog, is trapped while open, returns to the trigger on close, and supports Escape.
- Background scrolling is locked while the dialog is open.
- Interactive targets are at least 44 px; primary text is at least 16 px with 4.5:1 contrast.
- At 390 px and 1440 px, frame names, price, trust text, and actions do not clip or overflow.
- RU and EN layouts are tested independently; all async, error, and accessibility copy is localized.
- Non-essential motion respects `prefers-reduced-motion`.
- Failure and success are never communicated by color alone.

### Design system constraints

- Reuse the existing ViLu lime primary CTA, trust note, dark status panel, shortlist item, and status-page shell.
- Do not add a payment-specific typeface, gradient, card vocabulary, or competing accent palette.
- Use lime for the primary action and successful progress, not as decoration on every element.
- Keep text legible on dark surfaces: white or lime text only; never ink-on-ink.
- Keep text legible on light surfaces: ink text with existing muted ink variants that meet contrast requirements.

## Out of scope

- YooKassa API call and confirmation URL.
- Production webhook and real charging.
- Fiscal receipts and refunds.
- Production merchant credentials.
- Bank-card storage, now or later.

## Rollback

Revert the implementation commit and disable payment mode. The migration is additive; retain audit records and do not drop payment data during a frontend rollback.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | - | Not run for this revision |
| Codex Review | `/codex review` | Independent second opinion | 0 | - | Not run |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | REQUIRED | Re-run after the design contract is implemented |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | Score: 6/10 -> 10/10, 8 approved decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | - | Not run |

**VERDICT:** DESIGN CLEARED - implementation may proceed; engineering review remains required before shipping.

NO UNRESOLVED DECISIONS
