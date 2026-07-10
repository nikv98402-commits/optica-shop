# BENCHMARK REPORT - https://vilu.store

Date: 2026-06-18
Mode: HTTP fallback benchmark, no browser perf API
Status: PASS
Baseline: created

## Summary

The production site is light and fast for the current MVP. All checked routes returned 200. The app has one JS bundle and one CSS bundle.

## Page timings

| Page | Status | Avg TTFB | Avg total | Range | HTML |
| --- | ---: | ---: | ---: | ---: | ---: |
| / | 200 | 337 ms | 338 ms | 217-493 ms | 2.2 KB |
| /products | 200 | 418 ms | 418 ms | 227-528 ms | 2.2 KB |
| /face-fit-score | 200 | 423 ms | 423 ms | 182-551 ms | 2.2 KB |
| /ai-source | 200 | 304 ms | 304 ms | 214-445 ms | 2.2 KB |
| /privacy | 200 | 402 ms | 402 ms | 227-528 ms | 2.2 KB |

## Resource sizes

| Resource | Type | Size |
| --- | --- | ---: |
| index-0NFpC6mT.js | JS | 330,008 B / 322 KB |
| index-BOSszlw6.css | CSS | 38,542 B / 38 KB |

Total app assets: 368,550 B / 360 KB.

## Budget check

| Budget | Result |
| --- | --- |
| TTFB under 800 ms | PASS |
| JS under 500 KB | PASS |
| CSS under 100 KB | PASS |
| App assets under 1 MB | PASS |
| Direct routes return 200 | PASS |

## SEO/supporting files

| File | Status | Size |
| --- | ---: | ---: |
| robots.txt | 200 | 332 B |
| sitemap.xml | 200 | 1,213 B |
| llms.txt | 200 | 1,635 B |

## Limitations

Browser metrics such as FCP, LCP, DOM Complete, screenshots and console errors were not available in this run. Local gstack browse exists but cannot start because the package is missing server.ts, and Playwright browser launch is blocked in this environment. This report uses HTTP timing and resource-size checks.

## Verdict

DEPLOY PERFORMANCE BASELINE IS HEALTHY.

Next benchmark should compare against .gstack/benchmark-reports/baselines/baseline.json.
