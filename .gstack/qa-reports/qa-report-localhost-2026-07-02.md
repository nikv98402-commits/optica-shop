# QA-only Report: ViLu Latest Changes

Date: 2026-07-02  
Branch: `codex/vision-lifestyle-investor-positioning`  
Target: `http://127.0.0.1:5173`  
Mode: Diff-aware smoke / report-only  
Scope: latest `/vision-care` and `/eye-check` work  

## Summary

Health score: 82/100

The latest changes are buildable and the new routes respond locally. The new `ViLu Eye Check` page is registered as a route, indexed in `sitemap.xml`, described in `llms.txt`, and has analytics safety filters for answer/health/medical-like parameters.

Browser-based visual QA was partially blocked by local tooling: gstack browse is not built in this checkout, project-level Playwright is not installed, and the system Chrome launch path was blocked by Windows/sandbox `spawn EPERM`. Because this is `/qa-only`, no fixes or dependency setup were performed.

## Pages Checked

| Page | Result |
| --- | --- |
| `/` | 200 |
| `/vision-care` | 200 |
| `/eye-check` | 200 |
| `/products` | 200 |
| `/tryon` | 200 |
| `/privacy` | 200 |
| `/disclaimer` | 200 |
| `/llms.txt` | 200 |
| `/sitemap.xml` | 200 |

## Build

Result: pass with escalation.

`npm run build` succeeds outside sandbox. The sandboxed build fails with Windows `spawn EPERM` while starting esbuild, which matches the known local environment issue rather than a code compile error.

Build warnings:

- `caniuse-lite` is outdated.
- Vite reports one JS chunk above 500 kB after minification.

## Findings

### QA-001: Browser screenshot/click QA could not be completed in this environment

Severity: Medium  
Category: QA coverage

Evidence:

- gstack browse check returned `NEEDS_SETUP`.
- Playwright via system Chrome failed with `spawn EPERM`.
- Project does not expose Playwright as a local dependency for `node -e` browser smoke.

Impact:

The route/build layer looks healthy, but interactive click-through of `/eye-check` could not be fully verified here. The flow should still be manually checked in the open browser: select a flow, start self-check, answer through completion, save locally, click try-on CTA.

### QA-002: Production build depends on running outside sandbox on this Windows machine

Severity: Low  
Category: Developer environment

Evidence:

- Sandboxed `npm run build` fails with `spawn EPERM`.
- Escalated `npm run build` succeeds.

Impact:

Not a product bug, but future QA/build runs in this environment need the same elevated execution path.

### QA-003: Bundle size warning remains

Severity: Low  
Category: Performance

Evidence:

- Vite output reports `assets/index-lnoBe0Wv.js` at `525.34 kB` minified.

Impact:

Not blocking release, but if more investor/health modules are added, route-level code splitting should be considered before the SPA grows further.

## Privacy / Safety Checks

Passed:

- `llms.txt` states Eye Check is non-diagnostic and browser-only.
- `sitemap.xml` includes `/eye-check`.
- Analytics filters include `answer`, `symptom`, `child`, `age`, `birth`, `diagnos`, `medical`, and `health`.
- Local result storage stores only `flowId`, `riskLevel`, `totalScore`, `recommendedActions`, and `createdAt`.

Residual risk:

- Full Network-tab verification was not possible without browser automation. Manual QA should confirm no answer text is sent to Yandex Metrika or any remote endpoint during the full Eye Check flow.

## Recommended Manual Smoke

1. Open `http://127.0.0.1:5173/eye-check`.
2. Select each of the four scenarios.
3. Start a scenario and answer all questions.
4. Verify result card appears.
5. Click “Сохранить на устройстве”.
6. Refresh page and check local summary behavior if surfaced.
7. Click “Перейти к примерке” and confirm navigation to `/tryon`.
8. Open DevTools → Network and confirm no answer text or health-context values are sent.

## Top 3 Things To Fix / Verify Next

1. Run manual browser click-through for `/eye-check` because automated browser QA was blocked.
2. Verify Network tab during Eye Check completion and local save.
3. Consider code splitting after this investor/health expansion to reduce the main JS bundle warning.

