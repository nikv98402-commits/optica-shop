# ViLu QA report

Date: 2026-07-18
Branch: `codex/periorbital-product-implementation`
Scope: Eye Map Sprint 0 production boundary and adjacent RU/EN customer flows

## Result

Health score: 98/100

The Sprint 0 boundary is intact: `/eye-map` does not expose an Eye Map product UI, the production feature flag remains off, and no ML dependency is included. Eye Map benchmark counts and inference artifacts are now validated more strictly. The main try-on and checkout flows work on desktop and mobile without horizontal overflow.

## Browser coverage

Tested with the in-app Chromium browser:

- `/` at desktop and 375px mobile widths
- mobile navigation and RU/EN switching
- `/tryon` at desktop and mobile widths
- scenario selection, frame selection, paid-service modal, and checkout transition
- `/checkout` at mobile width
- direct `/eye-map` navigation
- browser console logs

No runtime console errors were observed.

## Fixed findings

### 1. Benchmark counts could exceed the governed photo set

Severity: High

Fix: the benchmark gate now rejects `qualityPassedImageCount` values above `governedPhotoCount`. Added a regression unit test.

Commit: `3b9017c`

### 2. Successful inference artifacts could omit geometry and correlation

Severity: High

Fix: successful structure results now require `normalizedArea` or landmark `points`, and every inference artifact requires a non-sensitive `correlationId`. Types, technical specs, and regression tests were updated together.

Commit: `286333d`

## Earlier fixed findings

### 1. Home page kept a Russian Vision care label in English mode

Severity: Medium

Fix: added the missing English translation in `LanguageDomBridge`.

Commit: `d0b8940`

### 2. Dynamic try-on content was only partially translated

Severity: High

Symptoms:

- `Фото: needs check`
- `Вариант 1`
- Russian frame colors and use cases inside the saved selection

Fix: dynamic status, option labels, frame colors, and use cases are now rendered directly from the active language instead of relying on DOM post-processing.

Commit: `5636b04`

### 3. Checkout displayed a stored Russian use case in English mode

Severity: High

Fix: stored use-case values are normalized and localized at render time. Added a regression unit test.

Commit: `ec139b6`

## Automated verification

- `npm test`: 7 files, 39 tests passed
- `npm run typecheck`: passed
- `npm run lint`: passed with 4 pre-existing Fast Refresh warnings
- `npm run build`: passed
- `npm run test:checkout`: passed
- `npm run test:eye-map-boundary`: passed
- `npm run test:e2e`: 4/4 passed for desktop/mobile and RU/EN

## Residual risk

- The production bundle is about 796 kB before gzip and triggers the existing Vite chunk-size warning.
- Browserslist data is outdated and should be refreshed in a separate dependency-maintenance change.
- The direct `/eye-map` URL renders the safe application fallback while preserving the URL. This does not expose the feature, but a dedicated 404 redirect can be considered later for clearer navigation semantics.
