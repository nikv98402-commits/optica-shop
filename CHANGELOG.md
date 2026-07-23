# Changelog

All notable ViLu MVP changes should be documented here.

## [0.3.0.0] - 2026-07-23

### Added

- Added a feature-flagged RU/EN Knowledge Assistant with local-only history,
  reviewed citations, safe abstention, urgent guidance, and privacy-filtered
  analytics.
- Added isolated pgvector retrieval storage, a server-only Edge Function,
  separate chat and multilingual embedding provider adapters, and a
  fail-closed reviewed source registry/indexer.
- Added desktop/mobile tests, provider and citation contract coverage, secret
  boundary scanning, and operational documentation for preview rollout and
  rollback.
- Added the Optical Orbits v5 design system across the home page, try-on,
  vision tracker, catalog, product detail, mission, brand, store locator,
  dashboard, and Knowledge Assistant experiences.
- Added reusable atomic headings, optical orbit motion, responsive layouts,
  structured assistant answers, and consistent next-step navigation.

### Changed

- Migrated shared typography, color, spacing, focus, motion, and mobile
  behavior to the Optical Orbits v5 product rules.
- Switched Knowledge Assistant generation and embeddings to the free
  Cloudflare Workers AI configuration while preserving the Supabase retrieval
  and safety boundaries.

### Fixed

- Kept the assistant route and home widget unavailable when the feature flag is
  disabled.
- Prevented provider diagnostics from crossing the public Edge Function error
  boundary.
- Corrected assistant suggestion overflow, readable body-copy sizing,
  accessibility motion behavior, and Cyrillic heading tracking.

### Tests

- Expanded route, provider, assistant, Store Locator, AtomicHeading, feature
  flag, responsive, and error-state regression coverage.

## [0.2.0.1] - 2026-07-20

### Changed

- Added regression coverage that keeps checkout contact guidance fully
  English after the customer switches languages.
- Clarified that the Eye Map client experience remains hidden until the
  periorbital product specification receives a signed `Go` decision.

## [0.2.0.0] - 2026-07-20

### Added

- Added browser-side guided camera capture to try-on with live MediaPipe
  feedback for distance, head level, centering, and one-face framing.
- Kept captured frames local and routed camera JPEGs through the same
  auto-fit pipeline as uploaded photos, with RU/EN and mobile coverage.
- Added a guarded, local-only Eye Map experience with clear quality states,
  cohort comparison language, local history, and privacy-safe analytics.
- Added release gates and automated boundary checks that keep Eye Map hidden
  until its product, evidence, and governance requirements are approved.
- Added focused regression coverage for camera cleanup, browser fallbacks,
  focus restoration, duplicate capture prevention, latest-photo wins, and
  Eye Map storage and result handling.

### Changed

- Made the selected try-on scenario remain visibly and programmatically
  selected while the customer continues through the fitting flow.

### Fixed

- Prevented camera streams from remaining active after playback errors or
  dialog closure.
- Prevented stale face-analysis results from replacing a newer uploaded or
  captured photo.
- Ensured temporary camera frames are always released and live analysis
  automatically retries after an unexpected failure.

## [0.1.0.0] - 2026-07-19

### Added

- Added the guarded Eye Map Sprint 0 foundation: feature flag, typed quality,
  inference, benchmark, governance, and go/no-go contracts with automated tests.
- Added the periorbital architecture, private ML repository boundary, golden-set
  governance, artifact manifest, benchmark templates, review rubric, and source
  technical specification required for an auditable research spike.
- Added a production-boundary check that keeps Eye Map disabled, unrouted, and
  free of server-side ML dependencies until the release gates are approved.

### Changed

- Improved Russian and English localization of try-on scenarios, frame details,
  checkout use cases, and vision-care labels.
- Hardened the ML trust boundary by returning sanitized inference objects and
  rejecting impossible benchmark counts, negative latency, and regression data.

### Fixed

- Prevented unknown ML response fields and internal debug data from crossing the
  validated Eye Map inference boundary.
- Prevented incomplete artifact manifests and invalid benchmark samples from
  producing a false go decision.

## Unreleased

- Hardened the service-checkout release gate: terminal payment retries now rotate idempotency keys, the lead endpoint enforces origin/auth/size/rate boundaries, and Tally fallback protects mixed-version rollouts.
- Removed personal contact values from Tally fallback URLs and added strict server-side validation for every selected-frame field.
- Removed contact data from the try-on Tally fallback and validated locale, contact channel, source page, and UTM fields at the Edge boundary.

### Added

- Vitest/React Testing Library coverage for checkout validation, lead/payment orchestration, retry identity, and bounded payment-status polling.
- Playwright RU/EN desktop and iPhone-profile checkout overflow checks.
- Safe 429 RUB payment test contour with server-owned pricing, idempotent intent creation, opaque status tokens, and RU/EN return, success, and failure pages.
- Public-safe payment status Edge Function and forward-only database hardening migration.
- Engineering runbook for the planned YooKassa integration, including architecture, API contracts, payment states, security boundaries, test matrix, rollout, and rollback.
- Developer experience review report for the current MVP branch.
- Product UX wrapper for MediaPipe-powered auto-fit try-on.
- Route smoke-test script for key app pages and public SEO files.
- Developer quickstart, contributing guide, environment template, and try-on QA checklist.

### Changed

- Transient payment-intent retry now reuses the successful lead and original idempotency key; retry after a terminal failed or cancelled status keeps the lead but rotates the key.
- Pending payment status now checks at 0, 2, 5, 10, and 20 seconds, then exposes a manual refresh.
- Payment-result routes are excluded from search indexing and never treat a browser redirect as proof of payment.
- Payment analytics record only technical funnel states and never payment tokens or personal data.
- Auto-fit try-on copy now uses customer-facing language instead of implementation language.
- Frame asset documentation now uses root-domain paths for `https://vilu.store/`.

### Known

- Real charging remains disabled until the server owns offer pricing, YooKassa webhooks are verified, and the payment Definition of Done is complete.
- The project currently has non-blocking Fast Refresh lint warnings in existing context and knowledge-base files.
- Production build can need normal process permissions on Windows because Vite/esbuild starts a child process.

## 2026-06-23

### Added

- MediaPipe Face Landmarker integration for browser-side face landmark detection.
- Auto-fit frame placement based on eye position, bridge position, and face-width hints.
- Unsupported HEIC/HEIF handling for browser photo uploads.
- Optional face-landmark overlay hidden by default.
- Release note: `docs/release-mediapipe-auto-fit.md`.

### Changed

- Try-on flow now frames MediaPipe as `Автопосадка оправы`.
- Face-fit score is linked to the auto-fit result.
- Uploaded photos remain local to the browser and are not sent to the ViLu server.

## 2026-06-18

### Added

- ViLu Knowledge Base pages for Face-fit score, frame size, PD, high prescriptions, online try-on limits, face shape, and AI source references.
- `robots.txt`, `sitemap.xml`, and `llms.txt`.
- GitHub Pages custom-domain setup for `vilu.store`.
- Yandex Metrica integration with safe analytics-event filtering.

### Changed

- Deployment base moved to root domain paths for `https://vilu.store/`.

