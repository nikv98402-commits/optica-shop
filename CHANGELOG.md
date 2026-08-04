# Changelog

All notable ViLu MVP changes should be documented here.

## [0.6.1.0] - 2026-08-04

### Changed

- Accelerated bounded Common Corpus reads with columnar batches while
  preserving deterministic row order and the strict scan limit.
- Pushed the safe `(date >= 2015 OR date is unknown)` predicate into the
  pinned source scan, retaining undated records for downstream review.
- Persisted a metadata-only checkpoint at every progress interval so long
  acceptance runs always leave current, non-sensitive diagnostics.

### Fixed

- Recorded the complete base and alternative source filters in probe output
  and protected manifest provenance, keeping acceptance artifacts
  self-describing and reproducible.

### Tests

- Added regression coverage for batched source iteration, composed DNF
  filters, progress checkpoint cadence, and full filter provenance.
- Rechecked all 73 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, and the production build without running a corpus pilot.

## [0.6.0.0] - 2026-08-04

### Changed

- Reworked bounded Common Corpus selection to push safe metadata predicates
  into the pinned Parquet scan, project only required columns, and process
  records in bounded batches while preserving deterministic ordering.
- Kept the full ophthalmology relevance check as a compiled single-pass matcher
  and added continuous runtime, scan-limit, progress, and metadata-only
  checkpoint diagnostics for long acceptance runs.
- Added accepted-yield and candidate-yield forecasts as diagnostic warnings;
  only exact scan and runtime bounds can terminate selection, so a late cluster
  of valid licensed documents remains eligible.
- Preserved undated otherwise-valid records for manual review instead of
  rejecting them before downstream policy checks.

### Fixed

- Prevented low-yield statistical forecasts from aborting a deterministic scan
  that can still reach its acceptance target within the configured exact bounds.
- Hardened reachability reporting so failures retain aggregate reason codes and
  safe checkpoint metadata without publishing document text.

### Tests

- Added regression coverage for strict license and language filtering, pushed
  Parquet predicates, batched scanning, low-yield diagnostics, late-cluster
  success, exact scan/runtime exhaustion, progress checkpoints, deterministic
  output, and protected artifact boundaries.
- Rechecked 70 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, and the production build without running a corpus pilot.

## [0.5.7.0] - 2026-08-03

### Changed

- Made the bounded ViLu corpus pilot report steady progress and preserve a
  metadata-only diagnostic checkpoint, so stalled or failed runs can be
  diagnosed without exposing document text.
- Replaced repeated relevance-term scans with a compiled single-pass matcher,
  reducing representative 1,000-document scoring time by more than 50x while
  preserving Russian and English boundary, context, and title-bonus behavior.
- Added a 75-minute workflow timeout and an always-uploaded diagnostic artifact
  that remains separate from the protected, reproducible corpus outputs.

### Fixed

- Marked empty-source, source-read, deduplication, and output-write failures as
  failed checkpoints instead of leaving acceptance runs falsely marked as
  running.

### Tests

- Added regression coverage for successful progress checkpoints, empty inputs,
  source failures, downstream output failures, safe diagnostic metadata, and
  workflow artifact boundaries.
- Rechecked 56 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, and the production build without running a corpus pilot.

## [0.5.6.1] - 2026-08-03

### Fixed

- Applied the exact accepted-license allowlist to the pinned Common Corpus
  loader before bounded selection, preventing ambiguous license families from
  consuming the 1,000-candidate pilot quota while keeping downstream checks
  fail-closed.

### Tests

- Added regression coverage for the upstream loader contract, rejected
  ambiguous license families, and alignment between the upstream filter and
  the canonical accepted-license configuration.
- Rechecked all 52 corpus tests and Python compilation, TypeScript, lint, all
  260 frontend tests, checkout contracts, and the production build.
- Confirmed the four existing, unrelated Knowledge Assistant E2E expectation
  failures separately; this release does not change that UI or backend.

## [0.5.6.0] - 2026-07-31

### Fixed

- Enumerated all parquet shards in the pinned Common Corpus revision and
  applied Open Science plus Russian/English metadata predicates before the
  bounded scanner, so licensed ophthalmology candidates are not hidden by the
  dataset's single-shard default configuration.
- Kept local language, license, open-science and relevance checks fail-closed,
  and recorded shard/filter provenance in probe and manifest outputs without
  exposing document text.

### Tests

- Added fail-closed filter and shard validation, exact mocked Hugging Face
  loader-contract coverage, metadata-only probe checks and deterministic
  manifest provenance coverage.
- Rechecked all 51 corpus tests, Python compilation, TypeScript, lint, all 260
  frontend tests, checkout tests and the production build.

## [0.5.5.0] - 2026-07-31

### Fixed

- Applied the bounded corpus candidate limit only after deterministic
  ophthalmology relevance filtering, so irrelevant records no longer prevent
  later eligible records from entering an acceptance pilot.
- Preserved metadata-only rejection diagnostics and aggregate reason counts for
  irrelevant records without weakening language, licensing, open-science or
  raw scan limits.

### Tests

- Added regression coverage for an irrelevant record preceding an eligible
  ophthalmology record, and rechecked all 40 corpus tests plus Python
  compilation.

## [0.5.4.0] - 2026-07-31

### Fixed

- Improved deterministic ophthalmology relevance recall with approved clinical
  aliases and explicit eye-care context, while preserving strict language,
  open-science, licensing, and bounded-selection gates.
- Kept generic terms such as refraction and screen time context-gated to avoid
  admitting unrelated documents, and added aggregate diagnostics for
  ophthalmic records that do not map to an approved taxonomy topic.

### Tests

- Added unit and integration coverage for accepted clinical aliases, unrelated
  computer-vision text, weak context-dependent terms, ambiguous body-only
  matches, and safe downstream rejection diagnostics.
- Rechecked all 39 corpus tests, Python compilation, all 260 frontend tests,
  TypeScript, lint, and the production build.

## [0.5.3.1] - 2026-07-30

### Fixed

- Made the checksum-pinned representative corpus fixture validate Git's
  canonical LF bytes, eliminating mixed-line-ending drift between Windows
  worktrees and Linux CI runners.

### Tests

- Rechecked the pinned representative regression, all corpus tests, Python
  compilation, TypeScript, lint, unit tests, and the production build.

## [0.5.3.0] - 2026-07-30

### Fixed

- Made failed ophthalmology corpus pilots explain why candidates were rejected
  downstream without exposing document text, so acceptance failures can be
  diagnosed before another authorized run.
- Kept review-only license, identifier, and date conditions inside the bounded
  candidate audit trail while preserving strict language, open-science,
  relevance, and raw-record limits.
- Preserved aggregate reports and protected workflow artifacts when validation
  thresholds fail, including candidate coverage and source-exhaustion state.

### Tests

- Added a checksum-pinned synthetic representative fixture and regression
  coverage for downstream reasons, candidate thresholds, source exhaustion,
  missing identifiers, report loading, and cross-platform line endings.
- Rechecked all 33 corpus tests, Python compilation, workflow YAML, all 260
  frontend tests, TypeScript, lint, and the production build.

## [0.5.2.0] - 2026-07-30

### Fixed

- Changed the bounded ophthalmology corpus pilot to select eligible candidates
  after deterministic language, open-science, license, and basic-quality
  filtering while retaining a strict raw-record scan limit.
- Added an acceptance threshold that stops the pilot when too few documents
  qualify, and recorded raw, candidate, and prefilter counts in the manifest
  for reproducible review.

### Tests

- Added regression coverage for strict scan bounds, deterministic manifests,
  and empty, insufficient, and successful acceptance samples.
- Rechecked all 29 corpus tests, Python compilation, workflow YAML, all 260
  frontend tests, TypeScript, lint, and the production build.

## [0.5.1.0] - 2026-07-29

### Fixed

- Restored the complete deterministic `uv.lock` for the ViLu ophthalmology
  corpus pipeline after the merged lockfile was found to be truncated.
- Added strict UTF-8 and SHA-256 lockfile verification before the manual corpus
  workflow installs dependencies.

### Tests

- Rechecked lockfile integrity, the negative tamper path, all 26 corpus tests,
  all 260 frontend unit tests, TypeScript, lint, and the production build.

## [0.5.0.0] - 2026-07-29

### Added

- Added a reproducible ophthalmology corpus pipeline in `tools/vilu-corpus`
  for the first bounded pilot of Epic #91.
- Added fail-closed source schemas, RU/EN and Open Science selection rules,
  strict license review, taxonomy scoring, exact and MinHash/LSH
  deduplication, deterministic chunking, manifests, validation, and run
  reports.
- Added a manual-only GitHub Actions pilot that processes at most 1,000 source
  records and stores protected build artifacts for seven days.

### Security

- Pinned the Hugging Face source to an exact hexadecimal commit SHA and kept
  raw or cleaned document text out of logs, review queues, Git, the frontend,
  and production Supabase.
- Kept unknown licenses and malformed or ambiguous records in review or reject
  queues instead of admitting them to the accepted corpus.

### Tests

- Added unit and integration coverage for schema validation, selection,
  licensing, cleaning, deterministic deduplication, bounded chunking,
  manifests, and output validation.
- Rechecked 26 corpus tests with 86% coverage, all 260 frontend unit tests,
  TypeScript, lint, and the production build.

## [0.4.6.0] - 2026-07-28

### Fixed

- Separated ingestion feed origins from outbound product URL origins in Offer
  Finder, so the bounded GitHub feed can publish the approved ViLu product URL
  without weakening the network fetch boundary.
- Added a backward-compatible source loader that works before and after the
  production migration is applied.

### Security

- Kept fetch requests restricted to the exact approved feed origin while
  independently validating customer-facing product links.
- Preserved the first source policy, disabled scheduling for the second source,
  and retained one-request/one-concurrency limits.

### Tests

- Added focused regression coverage for split origin policies and migration
  invariants.
- Rechecked 78 focused tests, all 260 unit tests, TypeScript, lint, and the
  production build.

## [0.4.5.0] - 2026-07-27

### Added

- Added a second owner-authorized, bounded Offer Finder source for the existing
  Aurora Crystal offer in the Russian market.
- Added a separate fail-closed adapter for the exact public GitHub raw feed,
  without changing the first source, geography, or scheduler.

### Security

- Kept the source limited to one exact URL, one offer, one request per minute,
  one concurrent request, and manual canary execution only.
- Added a forward migration that verifies the first source remains unchanged
  while registering the second source with no schedule.

### Tests

- Added adapter, normalization, deduplication, path-override, destination, and
  scope-regression coverage.
- Rechecked all 252 tests, TypeScript, lint, and the production build.

## [0.4.4.0] - 2026-07-27

### Fixed

- Restored direct GitHub Pages product links, including
  `/products/aurora-crystal`, by publishing static entries for every current
  catalog product.
- Added a safe forward migration that restores the single approved bounded
  ViLu Offer Finder source under the production workflow's canonical ID while
  refusing to rewrite a source that already has dependent data.

### Tests

- Added regression coverage that keeps GitHub Pages product routes aligned
  with the catalog and preserves the bounded source's origin, limits, schedule,
  and stable identifier.
- Rechecked all 249 tests, TypeScript, lint, and the production build.

## [0.4.3.0] - 2026-07-27

### Fixed

- Restored HTTP 200 responses for direct product links on Vercel while keeping
  clean URLs enabled.
- Made the bounded Offer Finder production check use the single approved ViLu
  source and fail clearly when that source publishes no fresh offer.
- Matched Aurora Crystal to its confirmed Offer Finder offer without changing
  the customer-facing ViLu Atelier brand name.

### Tests

- Added regression coverage for Vercel SPA routing, production canary health
  behavior, and canonical Offer Finder brand matching.
- Rechecked all 245 tests, TypeScript, lint, and the production build.

## [0.4.2.0] - 2026-07-26

### Fixed

- Restored direct product links such as `/products/aurora-crystal`, so a
  confirmed Offer Finder result now opens the matching ViLu product instead of
  a 404 page.
- Kept the canonical product URL in the browser during in-app navigation and
  safely handled encoded product identifiers.

### Tests

- Added regression coverage for direct, encoded, malformed, and in-app product
  links.
- Rechecked all tests, TypeScript, lint, and the production build.

## [0.4.1.0] - 2026-07-26

### Added

- Connected the first owner-authorized Offer Finder source for one Aurora
  Crystal offer in the Russian market.
- Published a bounded first-party JSON feed that lets Offer Finder verify the
  confirmed price, availability, catalog identity, and product destination.
- Added an idempotent Supabase migration for the single ViLu merchant, product,
  variant, and unscheduled source.

### Changed

- Restricted the canary to one request, one offer, one exact feed URL, and one
  exact product URL; additional sources, products, and markets remain blocked.
- Documented the source authorization, robots and terms review, request limits,
  freshness rules, and rollback boundary.

### Tests

- Added adapter, normalization, price, destination, and scope-regression
  coverage for the bounded real-source canary.
- Rechecked all 235 tests, TypeScript, lint, and the production build.

## [0.4.0.5] - 2026-07-26

### Fixed

- Prioritized store routes and phone calls over merchant websites in Offer
  Finder responses, so every available next-step action can reach the product
  card instead of being masked by the mandatory source URL.

### Tests

- Added Edge contract coverage for route, phone, and website fallback priority.
- Added product-card coverage for safe `tel:` and Google Maps destinations.
- Rechecked all 231 tests, TypeScript, lint, and the production build.

## [0.4.0.4] - 2026-07-26

### Added

- Added scheduled, single-source Offer Finder production operations with a
  bounded live canary, normalization, health checks, and clear workflow alerts.
- Added service-only health reporting for data freshness, parser success,
  quarantine volume, fresh offers, open incidents, and stalled runs.
- Added an operations runbook covering protected configuration, manual canary
  checks, recovery, interruption handling, and rollback.

### Changed

- Protected each source from overlapping queued or running ingestion jobs at
  both the workflow and database layers.
- Added bounded retry with exponential backoff and jitter for canary,
  normalization, and health-check failures.
- Limited production credentials to the execution step that requires them.

### Tests

- Added scheduler operations tests and SQL integration coverage for active-run
  exclusivity, source health counters, health alerts, and RPC permissions.
- Rechecked all 229 tests, TypeScript, lint, SQL integration tests, and the
  production build.

## [0.4.0.3] - 2026-07-26

### Fixed

- Allowed the Offer Finder Edge API to authenticate browser requests with both
  Supabase legacy anonymous keys and current publishable keys.
- Kept secret API keys excluded while supporting publishable-key rotation from
  Supabase platform metadata.

### Tests

- Added compatibility coverage for legacy, current, rotated, and secret key
  formats and rechecked all 225 tests, TypeScript, and the production build.

## [0.4.0.2] - 2026-07-26

### Added

- Added a service-role-only Offer Finder product projection and versioned
  read-only Edge API for fresh, published offers and minimum confirmed prices.
- Added product-card states for loading, unavailable data, errors, verified
  offer sources, availability, currencies, and website, phone, or route actions.

### Security

- Kept operational Offer Finder tables behind the Edge BFF, with strict request
  validation, origin controls, bounded rate limiting, and no browser access to
  the service-role credential.
- Excluded quarantined, unpublished, stale, and expired observations from
  product-card results.

### Tests

- Added API contract, Edge integration, frontend state, and SQL permission
  coverage for the Offer Finder product-card flow.
- Rechecked TypeScript, lint, all 224 unit and integration tests, checkout
  contracts, SQL migrations, and the production build.

## [0.4.0.1] - 2026-07-25

### Added

- Added deterministic Offer Finder normalization for price, currency,
  availability, product identity, catalog matching, and 72-hour / 7-day
  freshness classification.
- Added a bounded normalization runner connected to the approved ingestion
  canary, with exact-match publication and review or quarantine routing for
  ambiguous, anomalous, and invalid observations.
- Added service-role-only SQL contracts for pending batches, idempotent review
  work, atomic offer publication, and audited comparable split or merge actions.

### Security

- Serialized publication per logical offer to prevent concurrent price-anomaly
  bypasses, enforced source-market package boundaries, and retained sanitized
  source URLs only after removing sensitive query parameters and fragments.
- Kept all normalization mutations unavailable to browser roles and preserved
  immutable raw-observation provenance for every published price or review.

### Tests

- Added fixture, runner, and SQL integration coverage for exact and fuzzy
  matching, malformed input, ambiguity, freshness, retry idempotency, market
  boundaries, ACLs, provenance, and split or merge regressions.

## [0.4.0.0] - 2026-07-25

### Added

- Added the Offer Finder ingestion runtime with isolated source adapters,
  idempotent raw observations, parser quarantine, and run accounting.
- Added bounded source access with exact HTTPS allowlists, robots and terms
  gates, SSRF protection, rate and concurrency limits, timeouts, response-size
  limits, and retry backoff.
- Added a fixture-only canary, a protected manual live-canary workflow, source
  onboarding guidance, and security and adapter contract coverage.

### Tests

- Rechecked 26 ingestion security and contract tests, strict TypeScript for the
  runtime, the full 176-test unit suite, lint, checkout contracts, and the
  production build.
- Recorded four pre-existing Knowledge Assistant E2E expectation failures
  separately; this release does not change its UI or backend.

## [0.3.0.3] - 2026-07-24

### Added

- Added the normalized Supabase foundation for Offer Finder markets, sources,
  stores, products, observations, prices, freshness, and ingestion runs.
- Added RLS policies, indexes, immutable raw observations, protected SQL search
  functions, shared TypeScript contracts, and SQL integration coverage.
- Added operational documentation for the Offer Finder data boundary,
  retention, security model, testing, and rollback.

### Tests

- Rechecked TypeScript, lint, unit tests, production build, contract tests, and
  the Offer Finder SQL security invariants.

## [0.3.0.2] - 2026-07-24

### Changed

- Standardized the home page on a deterministic dark/light section cadence.
- Added the Optical Orbits grid to both surfaces and restored readable
  typography and controls in the knowledge, showcase, and dashboard sections.

### Fixed

- Removed late cascade overrides that flattened dark sections into a blank
  light surface and made section labels and actions effectively invisible.
- Consolidated the release CSS so the final cadence rules have one source of
  truth.

### Tests

- Rechecked TypeScript, lint, unit tests, production build, and the home page
  at 1440, 390, and 320 px without horizontal overflow.

## [0.3.0.1] - 2026-07-24

### Changed

- Unified dark hero dimensions, warm-light surfaces, bordered functional cards,
  typography scale, and responsive spacing across Optical Orbits pages.
- Clarified the Store Locator map and redesigned compact and full Knowledge
  Assistant composers as unmistakable conversational interfaces.

### Fixed

- Added working Focus Dot, 20-20-20, and Palming exercise modes with distinct
  instructions, timers, and motion behavior.
- Prevented the Store Locator overlay from colliding with navigation.
- Made the catalog visit-preparation action available and routed unfinished
  preparation to a dedicated, recoverable “in development” page.

### Tests

- Rechecked TypeScript, lint, 145 unit tests, production build, responsive
  layouts, exercise switching, Store Locator, catalog navigation, and assistant
  loading/error states.

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
