# Offer Finder ingestion runtime (#54)

The ingestion boundary runs in Node.js/TypeScript through GitHub Actions. Supabase remains
the system of record. Browser code, Edge Functions, UI, product experience (#56), and launch
integration (#57) are outside this boundary. The downstream normalization stage is documented
in [Offer Finder normalization](offer-finder-normalization.md).

## Safety model

- Adapters declare observations; they never receive database credentials or a Supabase client.
- Every request passes through `RestrictedFetcher`: the exact HTTPS
  `approved_fetch_origins` allowlist, DNS/IP validation, redirect revalidation, timeout,
  response-size/content-type bounds, source rate and concurrency limits, bounded exponential
  retry with jitter, and an identifying user-agent.
- Customer-facing product links are checked independently against `approved_origins`. Feed
  hosts therefore never become approved outbound destinations merely because ingestion may
  request them.
- Cookies, application auth headers, database credentials, and user-provided destinations are
  never forwarded.
- Authentication, CAPTCHA, paywall, robots restrictions, unknown terms status, and disabled
  sources stop only that source. There is no bypass.
- Observations use canonical SHA-256 identities and a database upsert against
  `(source_id, external_offer_id, observation_hash)`. Reruns remain idempotent.
- Malformed records are quarantined into `offer_parser_incidents`. Diagnostics contain safe
  codes and redacted summaries, not URLs, tokens, raw HTML, or secrets.
- Fixture tests are blocking. Live canaries require explicit `workflow_dispatch`, a protected
  GitHub environment, a source ID, and `dry_run=false`.

## Source onboarding

1. Review the source terms and robots policy manually. Record `terms_reviewed_at` and
   `robots_status` in `offer_sources`.
2. Select the least invasive approved method: official API/feed, JSON-LD/embedded JSON,
   public HTML, or manual file.
3. Add exact feed/API hosts to `approved_fetch_origins` and exact customer-facing product
   hosts to `approved_origins`; never use wildcards or copy a feed host into the outbound list
   unless it is also the approved product destination.
4. Add one adapter module with a stable `key` and semantic `version`. URLs must be constants
   or derived only from trusted source configuration, never user input.
5. Add deterministic fixtures for normal, discounted, unavailable, variants, missing price,
   changed structure, oversized response, unexpected currency, duplicate observation,
   malicious redirect, and malformed payload.
6. Keep the source disabled. Run:

   ```text
   npx vitest run scripts/offer-finder/ingestion.test.ts
   node --experimental-strip-types scripts/offer-finder/canary.ts --dry-run
   ```

7. Execute a read-only live canary only after policy review. Inspect run counters and incidents.
8. Enable the source only after the source-enablement checklist passes. Default cadence is once
   per 24 hours; a faster schedule requires an explicit source approval.

## GitHub environment

Create a protected environment named `offer-finder-production` with:

- `OFFER_FINDER_SUPABASE_URL`
- `OFFER_FINDER_SUPABASE_SERVICE_ROLE_KEY`

Pull requests and forks run fixtures only and never receive these secrets. The scheduled job is
pinned in the workflow to the single approved ViLu public-catalog source UUID. Manual dispatch
still requires an explicit approved `source_id`; it cannot discover or fan out to other sources.
The same protected credentials are used by the downstream normalization runner. They must remain
scoped to the protected environment and must never be added to adapter configuration.
Production scheduling, alert thresholds, and recovery are documented in
[`offer-finder-operations.md`](./offer-finder-operations.md).

## Canary limitation

`vilu_fixture_canary` is a contract canary, not a production scraper. CI injects a deterministic
JSON fixture and performs no external request or database write. The live switch exists to prove
the protected execution boundary after an approved endpoint is configured; it must not be used
for bulk collection. After a successful bounded live canary, the workflow normalizes only the
same approved `source_id`; it does not run an unfiltered production batch.

`vilu_public_catalog` is the first real source and remains a bounded first-party canary.
Its decision record is in
[`offer-finder-sources/vilu-public-catalog.md`](./offer-finder-sources/vilu-public-catalog.md).
It performs one request to one exact `vilu.store` feed and rejects any response containing
anything other than the single approved Aurora Crystal offer. The daily workflow runs only this
bounded source; that schedule does not authorize additional sources, offers, or markets.

`vilu_github_raw_catalog` is the second owner-authorized source and is manual-only.
Its decision record is in
[`offer-finder-sources/vilu-github-raw-catalog.md`](./offer-finder-sources/vilu-github-raw-catalog.md).
It performs one request to the one exact GitHub raw feed for the same Aurora Crystal
offer. It does not change the first source, scheduled source, market, or geography.

## Rollback

Disable the affected row in `offer_sources` or disable the workflow. Existing observations and
price history remain untouched and age according to the 72-hour / 7-day policy.
