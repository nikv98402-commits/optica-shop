# ViLu Developer Quickstart

This guide is for a new engineer or operator who needs to run, verify, and safely edit the ViLu MVP.

## Prerequisites

- Node.js 20 or newer.
- npm 11 or compatible npm bundled with your Node installation.
- Git.
- Docker Desktop or another Docker-compatible runtime when running local Supabase RLS tests.

The GitHub Actions workflow uses Node.js 20.

## Install

```bash
npm install
```

For CI-like clean installs:

```bash
npm ci
```

## Run Locally

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```txt
http://127.0.0.1:5173/
```

If another server is already using that port, Vite will choose the next available port.

## Key Routes

- `/`
- `/products`
- `/tryon`
- `/face-fit-score`
- `/ai-source`
- `/privacy`
- `/terms`
- `/disclaimer`

Slice 0 workspace routes are feature-gated and include both locale and organization:

- `/:locale/organizations/:organizationId/employee/today`
- `/:locale/organizations/:organizationId/employer/outcomes`
- `/:locale/organizations/:organizationId/provider/queue`

Slice 1 and Slice 2 add employee routes under the same organization boundary:

- `/:locale/organizations/:organizationId/employee/screenings/:screeningId/result`
- `/:locale/organizations/:organizationId/employee/referrals/:referralId`
- `/:locale/organizations/:organizationId/employee/passport`
- `/:locale/organizations/:organizationId/employee/profile`

## Environment Variables

Copy `.env.example` to `.env.local` only when you need optional integrations.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

The app must still work when `.env.local` is missing.

The legacy storefront stays available without Supabase. Protected workspace routes need `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, the Slice 0-2 migrations, and the relevant `VITE_FEATURE_VILU_*` values. All flags default to `false`; Passport/Profile requires both global `VITE_FEATURE_VILU_PASSPORT_PROFILE_V2` and organization flag `vilu_passport_profile_v2`.

Start and reset local Supabase before the RLS suite:

```bash
npx --yes supabase@2.115.0 start
npx --yes supabase@2.115.0 db reset
npm run test:rls
```

## Checks

Run before a PR or release:

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

`npm test` runs the Vitest suite, `npm run test:checkout` checks the checkout/backend contract, `npm run test:rls` runs local Supabase pgTAP coverage for organization and role boundaries, and `npm run test:e2e` runs the Playwright RU/EN desktop and iPhone-profile flows. `npm run test:performance` creates a production build and checks the anonymous Home initial JavaScript and CSS budgets, lazy route chunks, non-blocking fonts, and deferred analytics.

Known state: `npm run lint` can show existing Fast Refresh warnings. Treat new warnings as regressions.

## Route Smoke Test

Start the dev server first, then run:

```bash
npm run smoke
```

By default the script checks:

```txt
http://127.0.0.1:5176
```

To test another port or production:

```bash
BASE_URL=http://127.0.0.1:5173 npm run smoke
BASE_URL=https://vilu.store npm run smoke
```

On Windows PowerShell:

```powershell
$env:BASE_URL='http://127.0.0.1:5173'; npm run smoke
```

## MediaPipe / Try-On QA

For any change in `/tryon`, run the checklist:

```txt
docs/tryon-qa-checklist.md
```

The core rule: MediaPipe can fail without breaking the product. Manual try-on must still work.

## Windows Build Caveat

In restricted environments, `npm run build` may fail with:

```txt
Error: spawn EPERM
```

This usually means Vite/esbuild could not start a child process because of sandbox or antivirus restrictions. It is not automatically a code failure. Re-run in a normal terminal or approved execution environment.

## Deploy

Production URL:

```txt
https://vilu.store/
```

Deploy workflow:

```txt
.github/workflows/deploy-pages.yml
```

The workflow runs on pushes to `main` and publishes GitHub Pages.

## Safe-Change Rules

- Do not send names, phone numbers, emails, prescriptions, complaints, exact location, or uploaded photos to analytics.
- Do not persist face photos on a server.
- Do not promise exact fit, diagnosis, or exact PD.
- Keep landmarks hidden by default.
- Keep fallback copy clear when MediaPipe is unavailable.

