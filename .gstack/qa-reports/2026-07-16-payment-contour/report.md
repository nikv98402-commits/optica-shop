# QA report: payment test contour

Date: 2026-07-16  
Branch: `codex/payment-test-contour-429`  
Target: `http://127.0.0.1:5182`

## Result

PASS after fixes. The 429 RUB test-payment contour is suitable for the next `ship` step. It still does not charge money or call YooKassa; that remains intentionally outside this test contour.

## Fixed during QA

1. **Selection was lost after returning from payment status pages.**
   Selected frame IDs are now persisted locally, validated against the current catalog, limited to three, and restored after returning to `/tryon`.
2. **Payment dialog was clipped on an iPhone viewport.**
   The dialog is now a scrollable mobile bottom sheet with safe-area padding and sticky actions. Desktop remains centered.
3. **Payment dialog keyboard and screen-reader behavior was incomplete.**
   Added `role="dialog"`, `aria-modal`, an accessible title, localized close label, initial focus, focus trap, Escape handling, body scroll lock, and focus restoration.
4. **Test success copy could imply a real charge.**
   Demo success now says that interest was saved and no charge was made. Production success copy remains separate.
5. **The payment entry CTA used internal research wording.**
   Replaced with a user-facing offer: `Подготовить визит за 429 ₽` / `Prepare the visit for 429 RUB`.

## Browser verification

- English default state renders `Fit.Score.Store.` and the 429 RUB CTA.
- Selecting a frame enables the payment CTA.
- Payment dialog opens with focus on the close button.
- Escape closes the dialog and returns focus to the payment CTA.
- Body scroll is locked only while the dialog is open.
- Mobile viewport `390x844`: dialog starts at the top, remains scrollable, and actions stay reachable.
- Failed test flow returns to `/tryon` with the selected frame preserved.
- Success test flow renders `Interest saved` and explicitly states that no charge was made.
- Browser console: no errors or warnings during the verified flow.

## Automated checks

- `npm run typecheck`: PASS
- `npm run lint`: PASS with 4 pre-existing Fast Refresh warnings and 0 errors
- `npm run build`: PASS
- `BASE_URL=http://127.0.0.1:5182 npm run smoke`: PASS, 15/15 routes returned 200

## Build observations

- Main JavaScript bundle is about 772 kB minified (230 kB gzip), so code splitting remains a performance follow-up.
- Browserslist data is outdated. This is maintenance work, not a release blocker for the payment test contour.

## Evidence

- `screenshots/desktop-initial.png`
- `screenshots/issue-001-modal-before.png`
- `screenshots/mobile-modal-before.png`
- `screenshots/mobile-modal-after.png`
- `screenshots/mobile-return.png`
- `screenshots/mobile-tryon.png`

## Release recommendation

Proceed with `ship`, then use `land-and-deploy` only after CI and PR review are green. Do not present this contour as real payment acceptance until server-side YooKassa intent creation and webhook confirmation are implemented.
