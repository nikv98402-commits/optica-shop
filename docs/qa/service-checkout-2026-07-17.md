# QA report: service checkout

Date: 2026-07-17
Branch: `codex/service-checkout-v1`
Target: `http://127.0.0.1:5182`
Tier: standard

## Result

PASS after one medium-severity UX fix. The service checkout, 429 RUB test-payment transition, status pages, localization, and mobile layout are ready for review.

Health score: 94/100.

## Fixed during QA

### QA-001: Empty checkout submission had no field-level feedback

Severity: Medium

Before the fix, an empty submission showed only a generic alert at the bottom of the summary. Focus stayed on the submit button, so users, especially on mobile, could not immediately see which fields required attention.

Fix commit: `d3197ed fix(qa): add field-level checkout validation`

Verified behavior:

- Contact and consent now receive localized inline errors.
- Invalid controls expose `aria-invalid` and `aria-describedby`.
- Focus moves to the first invalid control.
- Invalid styling is visible without changing the checkout layout.
- Russian and English validation messages both render correctly.

## Browser verification

- Product selection opens the service checkout with the selected frame.
- Checkout explains the 429 RUB service and keeps frame pricing separate.
- Empty submit is blocked with field-level feedback.
- Valid contact plus consent opens the pending test-payment return page.
- Pending state exposes explicit retry controls.
- Successful test opens `/payment/success` and states that no charge was made.
- Failed test opens `/payment/failed` and states that money was not charged.
- A return URL without a token shows an actionable error state.
- RU and EN checkout copy, validation, and status pages switch correctly.
- Mobile viewport `390x844`: checkout and payment success have no horizontal overflow.
- Browser console contains no errors or warnings during the verified flow.

## Automated checks

- `npm run typecheck`: PASS
- `npm run test:checkout`: PASS
- `npm run lint`: PASS with 4 pre-existing Fast Refresh warnings and 0 errors
- `npm run build`: PASS
- `BASE_URL=http://127.0.0.1:5182 npm run smoke`: PASS

## Remaining non-blocking observations

- The main JavaScript bundle is about 790 kB minified (237 kB gzip). Route-level code splitting remains a performance follow-up.
- Browserslist data is outdated.
- Production YooKassa processing, webhook confirmation, fiscal receipts, and refunds remain intentionally outside this test contour.

## Release recommendation

Proceed to review and ship. This contour must continue to be labeled as a test flow until server-side YooKassa payment creation and webhook-confirmed status are implemented.
