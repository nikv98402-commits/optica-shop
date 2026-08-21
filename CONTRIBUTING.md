# Contributing to ViLu

This project is a consumer MVP for online eyewear try-on, Face-fit score, and nearby optical-store intent signals.

## Working Branches

- Use a feature branch for every meaningful change.
- Prefer branch names like `codex/fix-tryon-autofit`, `codex/add-store-directory`, or `codex/content-knowledge-base`.
- Keep unrelated changes out of the same branch.
- Do not commit local test photos, generated screenshots, or private exports unless they are intentionally part of a documented fixture.

## Local Setup

```bash
npm install
npm run dev
```

The legacy storefront must work without Supabase environment variables. Demo data is the default fallback. Organization-scoped ViLu routes require configured Supabase Auth, the identity, employee-care, and Passport/Profile migrations, and explicit global and organization feature flags.

## Required Checks

Run these before opening or merging a PR:

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:checkout
npm run test:rls
npm run test:e2e
```

`npm run test:rls` runs against the local Supabase database. It verifies allowed and denied access, cross-organization and cross-employee isolation, role-escalation and telemetry-role spoofing denial, draft ownership, concurrent idempotent referral creation, Passport/Profile access, provider consent, exports, documents, and the data-deletion queue. Start the local Supabase stack first; Docker must be available.

For route-level smoke testing, start the dev server and run:

```bash
npm run smoke
```

Known lint state: the project may show existing Fast Refresh warnings in context and knowledge-base files. Do not introduce new warnings.

### Corpus pipeline changes

For changes under `tools/vilu-corpus`, run the isolated Python checks as well:

```bash
cd tools/vilu-corpus
uv sync --locked --extra dev
uv run pytest
```

Do not run the manual bounded pilot, publish corpus artifacts, create embeddings,
or write to production Supabase unless the task explicitly authorizes it.

## Product Safety Rules

- Photos for try-on must stay in the browser.
- Do not upload face photos, prescription data, complaints, or exact location. Names and contact values may cross the backend boundary only through the approved consented lead flow.
- Never place names or contact values in browser storage, URL parameters, clipboard fallbacks, logs, or analytics.
- Keep legacy dashboard data in demo/local mode. On Slice 0 routes, read profiles, memberships, roles, feature flags, and audit-safe product events only through the migration's RLS boundary.
- Resolve role and feature access against the same explicit `organizationId` from the route. Never infer an active organization from role alone.
- In the employee care flow, pass the same explicit `organizationId` to every screening and referral read or RPC. Never load a result or referral by its record ID alone.
- Keep screening drafts resumable and version-checked. Completion is immutable, and referral creation must remain atomic and idempotent under concurrent requests.
- Passport/Profile reads and mutations must use the same active organization context as route guards and feature flags.
- Grant clinic access only to an organization whose `organization_type` is `provider`, and require an explicit, revocable consent record.
- The Profile UI may request deletion and poll status only. It must not invoke deletion processing directly or depend on an open browser.
- `process-data-deletion` is a server-only worker authenticated with `DATA_DELETION_DISPATCH_SECRET`. Its Supabase gateway JWT check is disabled per-function so the handler can validate that non-JWT scheduler secret. Preserve the handler check, internal service-role client, storage-first deletion order, observable statuses (`requested`, `processing`, `completed`, `failed`), and recovery of expired `processing` leases.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` through `VITE_*`, browser code, logs, fixtures, or screenshots.
- Employers, other employees, and members of another organization must never receive an employee's screening answers, result, or referral.
- Do not send PII, prescription values, complaints, or uploaded-photo details to analytics.
- User-facing copy must not promise diagnosis, exact PD measurement, or guaranteed fit.
- Final frame fit, PD, bridge comfort, lens compatibility, and prescription suitability must be checked by an optical specialist.

## Slice 2 local verification and deployment

The Passport/Profile schema is defined in `supabase/migrations/20260820120000_create_vilu_passport_profile.sql`; its integration coverage is in `supabase/tests/passport_profile_rls.test.sql`.

Run the local database and the complete RLS suite before opening a PR:

```bash
npx --yes supabase@2.115.0 start
npx --yes supabase@2.115.0 db reset
npm run test:rls
```

Production deletion processing has two server-side parts:

- `supabase/functions/process-data-deletion`: Edge Function that claims queued work, removes clinical files from Storage, and completes database deletion.
- `.github/workflows/data-deletion-dispatch.yml`: scheduled/manual dispatcher that invokes the function even when the user has closed the app.

The Edge runtime must provide `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATA_DELETION_DISPATCH_SECRET`. GitHub Actions must provide `SUPABASE_URL` and the same `DATA_DELETION_DISPATCH_SECRET`; never send the service-role key over HTTP. Frontend deployments continue to use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The global `VITE_FEATURE_VILU_PASSPORT_PROFILE_V2` and organization flag `vilu_passport_profile_v2` must remain off by default.

Deploy in this order:

1. Confirm the target project ref, backups, and disabled flags.
2. Apply the migration with a linked Supabase CLI (`supabase db push`).
3. Deploy `process-data-deletion` and configure the GitHub secrets.
4. Run the dispatcher manually and verify status transitions plus physical Storage deletion with disposable test data.
5. Run RLS and RU/EN smoke tests, then enable the global and organization flags in that order for the pilot organization.

If verification fails, disable the flags first. Do not reverse a data-bearing migration; repair the worker and resume the durable queue, including expired leases.

## Analytics Rules

Use `src/lib/analyticsEvents.ts` for analytics events.

Allowed analytics examples:

- `tryon_opened`
- `photo_uploaded`
- `face_landmarker_analyzed`
- `fit_score_viewed`
- `frame_saved`
- `nearby_optics_opened`
- `route_clicked`
- `call_clicked`
- `whatsapp_clicked`
- `telegram_clicked`
- `selection_copied`

Do not send:

- name
- phone
- email
- password
- photo
- prescription values
- complaints
- exact location

## Try-On Change Checklist

For any change touching `/tryon`, `src/pages/TryOnPilot.tsx`, or `src/lib/faceFitEngine.ts`:

1. Check desktop and mobile layout.
2. Check 320px and 390px widths.
3. Verify landmarks are hidden by default.
4. Verify manual controls still work when MediaPipe fails.
5. Verify unsupported HEIC/HEIF copy is clear.
6. Verify Face-fit score still leads to save-selection and nearby optics.
7. Run the checklist in `docs/tryon-qa-checklist.md`.

## Design Rules

Read `DESIGN.md` before visual changes.

The UI should feel like a calm premium utility, not a debug tool. Use customer language:

- Good: `Автопосадка оправы`, `Качество фото`, `Предварительная оценка`.
- Avoid: `MediaPipe`, `landmarker`, `intent`, `Tally`, `lead`.

## Pull Request Description

Every PR should include:

- What changed.
- Why it changed.
- How it was verified.
- Screenshots for UI changes when possible.
- Any known risks or follow-ups.

## Deployment

Production is deployed to:

https://vilu.store/

GitHub Pages deploy is configured in `.github/workflows/deploy-pages.yml` and runs on push to `main`.

