# ViLu Developer Quickstart

This guide is for a new engineer or operator who needs to run, verify, and safely edit the ViLu MVP.

## Prerequisites

- Node.js 20 or newer.
- npm 11 or compatible npm bundled with your Node installation.
- Git.

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

## Checks

Run before a PR or release:

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:checkout
npm run test:e2e
```

`npm test` runs the Vitest suite, `npm run test:checkout` checks the checkout/backend contract, and `npm run test:e2e` runs the Playwright RU/EN desktop and iPhone-profile flows.

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

