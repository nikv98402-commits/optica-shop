# Changelog

All notable ViLu MVP changes should be documented here.

## Unreleased

### Added

- Engineering runbook for the planned YooKassa integration, including architecture, API contracts, payment states, security boundaries, test matrix, rollout, and rollback.
- Developer experience review report for the current MVP branch.
- Product UX wrapper for MediaPipe-powered auto-fit try-on.
- Route smoke-test script for key app pages and public SEO files.
- Developer quickstart, contributing guide, environment template, and try-on QA checklist.

### Changed

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

