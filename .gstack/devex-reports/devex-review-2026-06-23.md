# DX Live Audit — ViLu Optica Shop

Date: 2026-06-23
Branch: `codex/next-product-updates-2026-06-23-followup`
Commit: `44bc1d7`
Product type: consumer React/Vite MVP with operator/developer workflows

## Scope

This audit reviewed the developer experience for a new engineer or operator who needs to run, verify, edit, and deploy ViLu without breaking the product.

Evidence sources:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.github/workflows/deploy-pages.yml`
- `package.json`
- `docs/`
- `public/`
- live local route smoke checks on `http://127.0.0.1:5176`
- command execution: `npm run typecheck`, `npm run lint`, `npm run build`

The browser screenshot tool was not available in this environment, so the live audit used HTTP smoke checks and repository artifacts.

## Getting Started Audit

| Step | What a developer does | Estimated time | Friction | Evidence |
|---|---|---:|---|---|
| 1 | Open README and identify stack | 30 sec | low | `README.md` starts with React, TypeScript, Vite, Tailwind |
| 2 | Install dependencies | 1-3 min | medium | README says `npm install`; CI uses `npm ci` |
| 3 | Start dev server | 30 sec | low | README says `npm run dev`; local `/tryon` returned 200 |
| 4 | Run checks | 2-4 min | medium | README lists typecheck/build/lint; all run locally |
| 5 | Understand deploy | 2-4 min | medium | README has GitHub Pages and DNS steps |

Measured local checks:

- `npm run typecheck`: pass
- `npm run lint`: pass with 4 existing Fast Refresh warnings
- `npm run build`: pass after allowing esbuild child process; initial sandbox run failed with Windows `spawn EPERM`
- local route smoke: `/`, `/tryon`, `/products`, `/face-fit-score`, `/ai-source`, `/privacy` returned 200

TTHW estimate:

- Warm repo with `node_modules`: 2-4 minutes
- Cold repo: 5-8 minutes, mostly dependency install and reading deploy/environment notes

Score: 7/10

What would make it 10:

- Add exact Node/npm version guidance.
- Add `.env.example`.
- Add a one-screen `docs/dev-quickstart.md`.
- Add a local route smoke script.

## API / CLI / SDK Ergonomics

This is not an SDK product, so the relevant surface is npm scripts and project commands.

Current scripts:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run preview`

Score: 6/10

Strengths:

- Minimal script surface.
- Commands map to CI.
- TypeScript and lint are first-class.

Gaps:

- No `npm test`.
- No `npm run check` that runs typecheck + lint + build in one command.
- No smoke script for critical routes.
- No script for validating sitemap/robots/llms files.

## Error Message Audit

Score: 6/10

Evidence:

- Build failure under sandbox produced `spawn EPERM`, which is environment-specific and confusing without troubleshooting docs.
- Lint warnings are non-blocking but noisy and recurring.
- App-level try-on states have user-facing fallback copy for unsupported photos and MediaPipe failure.

Gaps:

- No developer troubleshooting section for Windows/esbuild `spawn EPERM`.
- No documented interpretation of known lint warnings.
- No guide for testing MediaPipe photo failures: HEIC, no face, multiple faces, bad lighting.

## Documentation Audit

Score: 7/10

Strengths:

- README is unusually complete for an MVP: product scope, release flow, privacy, GenEO, analytics, deployment.
- `AGENTS.md` captures Codex workflow and product constraints.
- `CLAUDE.md` captures design-system guardrails.
- `docs/release-mediapipe-auto-fit.md` documents the auto-fit feature.
- `docs/specs/` contains 3D and fit-ready planning docs.

Gaps:

- No documentation index. A new engineer has to discover which doc matters.
- No `CONTRIBUTING.md`.
- No `CHANGELOG.md`.
- `public/frames/README.md` still shows `/optica-shop/frames/...`, but the app is now deployed at root `https://vilu.store/`.
- No single QA checklist for the try-on path.

## Upgrade Path Audit

Score: 4/10

Evidence:

- No `CHANGELOG.md`.
- No migration guide.
- Release notes exist for MediaPipe, but they are feature-specific and not a durable release history.

What would make it 10:

- Add `CHANGELOG.md` with product-facing release entries.
- Add “upgrade / rollback” notes for domain, analytics, MediaPipe model URL, and future 3D assets.

## Developer Environment Audit

Score: 7/10

Strengths:

- Vite + TS + Tailwind setup is standard.
- CI mirrors local checks.
- GitHub Pages workflow is explicit and includes static route copies.
- App runs without Supabase env vars.

Gaps:

- No tests or fixtures.
- No Playwright/Cypress smoke suite.
- No `.env.example`.
- No route-level regression check.
- No automated screenshot check for `/tryon` mobile layout, even though this page has had repeated layout regressions.

## Community / Collaboration Audit

Score: 3/10

Evidence:

- No `CONTRIBUTING.md`.
- No GitHub issue templates.
- No PR template.
- No ownership map for product areas.

This is acceptable for a solo MVP, but not enough for a second engineer, designer, or agency handoff.

## DX Measurement Audit

Score: 5/10

Evidence:

- `.gstack` reports exist locally.
- README includes operational analytics and GenEO measurement sections.
- Product events are centralized in `src/lib/analyticsEvents.ts`.

Gaps:

- DX itself is not measured.
- No onboarding checklist with expected pass/fail times.
- No “new engineer can ship in 30 minutes” target.

## Scorecard

| Dimension | Score | Method | Evidence |
|---|---:|---|---|
| Getting Started | 7/10 | TESTED + inferred | README, npm commands, local 200 route checks |
| API / CLI / SDK | 6/10 | INFERRED | `package.json` scripts |
| Error Messages | 6/10 | TESTED + inferred | build `spawn EPERM`, lint warnings, try-on fallbacks |
| Documentation | 7/10 | INFERRED | README, AGENTS, CLAUDE, docs |
| Upgrade Path | 4/10 | INFERRED | no changelog/migration guide |
| Dev Environment | 7/10 | TESTED + inferred | CI, typecheck, lint, build |
| Community | 3/10 | INFERRED | no contributing/templates |
| DX Measurement | 5/10 | INFERRED | local `.gstack` reports, no formal DX metrics |

Overall DX: 6.1/10

## Priority Fixes

1. Add `docs/dev-quickstart.md`.
   Include Node/npm versions, install, dev server, checks, route smoke, known Windows/esbuild caveat.

2. Add `.env.example`.
   Include `VITE_TALLY_FORM_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` with comments that Supabase is optional for the demo.

3. Add `CONTRIBUTING.md`.
   Include branch naming, commit style, required checks, privacy constraints, and “do not send PII to analytics”.

4. Add `CHANGELOG.md`.
   Start with current MediaPipe auto-fit and i18n/analytics/domain milestones.

5. Fix `public/frames/README.md`.
   Replace `/optica-shop/frames/...` with `/frames/...` for the current root-domain deploy.

6. Add a route smoke script.
   Suggested script: `npm run smoke` checks `/`, `/tryon`, `/products`, `/face-fit-score`, `/privacy`, `/llms.txt`, `/robots.txt`, `/sitemap.xml`.

7. Add a `/tryon` QA checklist.
   Must include mobile widths 320/390, supported JPEG/PNG/WebP, HEIC rejection, no face, multiple faces, MediaPipe unavailable, landmarks hidden by default, manual controls still usable.

## Verdict

DX is good enough for the current solo-founder MVP, but not yet good enough for predictable handoff. The biggest gap is not code quality; it is repeatability. The next engineer can probably run the app, but will need tribal knowledge to avoid breaking privacy, try-on layout, analytics, and domain deployment.

