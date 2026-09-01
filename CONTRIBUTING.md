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

The legacy storefront must work without Supabase environment variables. Demo data is the default fallback. Organization-scoped ViLu routes require configured Supabase Auth, the identity, employee-care, Passport/Profile, and Employer/Provider migrations, and explicit global and organization feature flags.

Use [`docs/deployment/vilu-workspaces.md`](docs/deployment/vilu-workspaces.md)
as the canonical Slice 0–3 operations runbook. It defines the route/role matrix,
migration order, two-level feature gates, production rollout, rollback and
canary checks. Do not infer a rollout sequence from migration filenames alone.

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
npm run test:performance
```

For changes to the closed-pilot provisioning, protected route entries or pilot
safety workflow, also run:

```bash
npm run test:pilot
npm run test:pilot:sql
npm run test:pages-routes
```

`test:pilot:sql` requires the local Supabase Docker stack. Every pull request
also runs `.github/workflows/pilot-safety.yml`, which must pass both
`test:rls` and `test:pilot:sql` before the pilot package can merge. The complete
operator sequence is in
[`docs/deployment/vilu-closed-pilot.md`](docs/deployment/vilu-closed-pilot.md).

`npm run test:rls` runs against the local Supabase database. It verifies allowed and denied access, cross-organization and cross-employee isolation, role-escalation and telemetry-role spoofing denial, draft ownership, concurrent idempotent referral creation, Passport/Profile access, provider consent, exports, documents, Employer Outcomes privacy suppression, Provider Queue operations and auditing, concurrent provider mutations, and the data-deletion queue. Start the local Supabase stack first; Docker must be available.

`npm run test:performance` builds the production bundle and enforces the anonymous Home budgets: initial JavaScript below 150 KiB gzip, initial CSS below 100 KiB raw and 25 KiB gzip, independently loadable Supabase/workspace/try-on/Face-fit chunks, non-blocking fonts, and deferred analytics. Run it whenever route imports, shared CSS, Home media, fonts, or analytics loading changes.

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
- Employer Outcomes must expose only frozen completed-month aggregates. Preserve the per-cell privacy threshold, complementary suppression, and one screened-referral-outcome cohort; never expose drill-downs or employee identifiers to an employer.
- Provider Queue detail reads and mutations must bind to the same route `organizationId`, current provider membership, and active clinic consent. Revalidate those boundaries before replaying an idempotency receipt.
- Keep booking, urgent escalation, and outcome confirmation optimistic-locking and idempotency-safe. Reusing one key with another payload must fail, while a concurrent same-key retry must return the original response without a second side effect.
- Audit sensitive Provider Queue reads and mutations without placing patient names, document paths, clinical reasons, or outcome details in audit metadata.
- The Profile UI may request deletion and poll status only. It must not invoke deletion processing directly or depend on an open browser.
- `process-data-deletion` is a server-only worker authenticated with `DATA_DELETION_DISPATCH_SECRET`. Its Supabase gateway JWT check is disabled per-function so the handler can validate that non-JWT scheduler secret. Preserve the handler check, internal service-role client, storage-first deletion order, observable statuses (`requested`, `processing`, `completed`, `cancelled`, `failed`), and recovery of expired `processing` leases. Cancellation is allowed only while a request is still `requested`, before processing begins.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` through `VITE_*`, browser code, logs, fixtures, or screenshots.
- Keep Ask ViLu `ModelAnswer` limits synchronized across `contracts.ts`, the provider JSON Schema, runtime validation, and the system instruction: at most two claims, exactly one evidence item per claim, 72-character claim text, 96-character quotes, and 48-character chunk IDs. Never repair or accept truncated JSON; retry only an explicit `content=null` response.
- Keep Ask ViLu browser history locale-bound. Direct load or reload must discard turns saved for the other locale while preserving valid shared preferences; locale-agnostic legacy v1 turns are cleared fail-closed. A response started before RU/EN changes must never write after the switch.
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

## Slice 3 local verification and rollout

Slice 3 is defined by these migrations:

- `supabase/migrations/20260821120000_create_vilu_employer_provider_operations.sql` — Employer Outcomes, provider assignment, queue reads, booking, escalation, outcome confirmation, idempotency receipts and audit events.
- `supabase/migrations/20260821130000_harden_vilu_slice3_deletion.sql` — deletion ordering for provider-operation receipts, appointments, escalations and clinical outcomes before their parent referral.

Apply the complete local migration chain and run the RLS suite:

```bash
npx --yes supabase@2.115.0 start
npx --yes supabase@2.115.0 db reset
npm run test:rls
```

The Slice 3 database regressions are split by boundary:

- `supabase/tests/employer_provider_operations_rls.test.sql` covers organization isolation, provider membership, clinic consent, audit events, outcome time bounds, privacy threshold and complementary suppression.
- `supabase/tests/provider_operations_concurrency.test.sql` uses two independent database sessions to cover same-key replay and different-key optimistic conflicts for booking, escalation and outcome confirmation.
- `supabase/tests/employer_provider_deletion.test.sql` verifies that the production deletion transaction removes provider-operation children before the referral and reaches an observable completed state.

Before production rollout, keep `VITE_FEATURE_VILU_EMPLOYER_OUTCOMES_V2` and `VITE_FEATURE_VILU_PROVIDER_QUEUE_V2` disabled. Apply both Slice 3 migrations, run the full RLS and application test suites, verify RU/EN and desktop/mobile routes, then enable the global flag followed by the matching organization flag for a pilot organization. Disable the flags first on failure; do not reverse a data-bearing migration.

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

After deployment, run the read-only matrix in
[`docs/deployment/vilu-workspaces.md`](docs/deployment/vilu-workspaces.md): RU/EN,
desktop/mobile 390×844, all three roles, direct protected routes, console and
HTTP checks. For Ask ViLu also verify opposite-locale reload, legacy-v1 cleanup,
shared preferences and RU→EN→RU during an unfinished request. Do not enable
feature flags, apply migrations or run deletion processing as part of canary
unless the release task grants that authority separately.

