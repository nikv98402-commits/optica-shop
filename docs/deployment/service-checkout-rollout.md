# Service Checkout Rollout

This runbook covers the public visit-preparation checkout and its test payment contour.

## Safety properties

- The frontend never receives a Supabase service-role key.
- `submit-visit-lead` accepts browser requests only from `ALLOWED_WEB_ORIGINS`, requires the project anon API key, limits request size, and applies a best-effort edge rate limit.
- If the backend contract is unavailable during rollout, the frontend opens the configured Tally form. If Tally is not configured, the existing local copy flow remains available.
- Payment creation is possible only after a lead response includes both `leadId` and `paymentCapabilityToken`.
- A failed or cancelled payment keeps the lead but rotates the payment idempotency key before retry.

## Required configuration

Supabase Edge Function secrets:

```text
ALLOWED_WEB_ORIGINS=https://vilu.store,https://www.vilu.store
```

GitHub Actions repository variable:

```text
VITE_TALLY_FORM_URL=https://tally.so/r/FORM_ID
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied by the Supabase runtime. Never expose the service-role key through a `VITE_*` variable.

## Recommended rollout

1. Configure `VITE_TALLY_FORM_URL` and verify the fallback form.
2. Apply Supabase migrations, including `20260717120000_harden_checkout_integrity.sql`.
3. Deploy `submit-visit-lead`.
4. Deploy `create-payment-intent` and `get-payment-status`.
5. Deploy the frontend.
6. Run `npm run test:checkout`.
7. Complete one Russian and one English checkout in desktop and mobile viewports.

The fallback makes intermediate mixed versions non-fatal, but the sequence above minimizes time spent in degraded mode.

## Rollback

1. Roll back the frontend first.
2. Keep Tally enabled while investigating.
3. Do not remove the capability column or unique idempotency index while any new frontend may still be cached.
4. Roll back Edge Functions only after the frontend rollback has propagated.

## Release checks

- An unauthorized origin receives `403`.
- A request without the project `apikey` receives `401`.
- Oversized JSON receives `413`.
- More than five submissions from one client address within ten minutes receives `429` in the same Edge isolate.
- A transient payment error retries the same intent.
- Returning from `failed` or `cancelled` creates a new payment intent without creating a duplicate lead.
- No photo, prescription, symptom, complaint, health, or exact-coordinate fields are sent.
