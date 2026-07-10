# CANARY REPORT - https://vilu.store

Date: 2026-06-18
Duration: quick 2-pass check with 60s interval
Pages monitored: 10
Status: HEALTHY

## Summary

The deploy is serving the main app, product page, GEO/AI pages, legal pages, and discovery files. The previous SPA route-status issue is fixed: direct route URLs now return `200 OK` instead of GitHub Pages `404` fallback.

## Per-page result

| Page | Round 1 | Round 2 | Notes |
| --- | ---: | ---: | --- |
| / | 200 | 200 | Metrika present |
| /products | 200 | 200 | Metrika present |
| /face-fit-score | 200 | 200 | Metrika present |
| /ai-source | transient timeout | 200 | Did not repeat |
| /privacy | 200 | 200 | Metrika present |
| /terms | 200 | 200 | Metrika present |
| /disclaimer | transient SSL error | 200 | Did not repeat |
| /robots.txt | 200 | 200 | Search/AI bot rules available |
| /sitemap.xml | 200 | 200 | Sitemap available |
| /llms.txt | 200 | 200 | LLM map available |

## Alerts

No persistent CRITICAL or HIGH alerts.

Transient observations:
- `/ai-source` timed out once in round 1, then recovered in round 2.
- `/disclaimer` had one SSL connection error in round 1, then recovered in round 2.

Because both recovered on the next check, they are treated as network noise rather than deploy failure.

## Limitations

The gstack browse binary exists locally, but it cannot run because the installed package is missing `server.ts`. Browser screenshots and console-error checks were not available in this run. This canary used HTTP/HTML checks instead.

## Verdict

DEPLOY IS HEALTHY with one tooling concern: restore/build gstack browse if we want screenshot and console canaries.
