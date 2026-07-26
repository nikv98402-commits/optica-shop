# Offer Finder normalization (#55)

The normalization stage converts immutable raw observations from the ingestion runtime into
comparable Offer Finder records. It runs in Node.js/TypeScript after an approved bounded
ingestion canary. Supabase remains the system of record.

Normalization does not scrape sources, expose data to the browser, or make fuzzy catalog
matches automatically. The downstream product API consumes accepted results through its own
Edge boundary; its contract is documented in
[Offer Finder foundation](offer-finder-foundation.md#product-api-56). Task #57 remains outside
this stage.

## Data flow

1. `offer_list_pending_normalization_v1` returns unprocessed raw observations to
   `normalization-runner.ts`.
2. The runner normalizes text, product identity, currency, integer minor-unit prices,
   availability, brands, models, and store fields.
3. Exact catalog identifiers can produce an automatic match. Fuzzy title similarity is only
   review evidence and is never enough to publish an offer.
4. Accepted exact matches are written atomically through
   `offer_publish_normalized_observation_v1`.
5. Ambiguous, unmatched, anomalous, or invalid records are written through
   `offer_record_match_review_v1` for manual review or quarantine.
6. Approved split/merge decisions are auditable through
   `offer_apply_comparable_review_v1`.

The runner returns counts for `processed`, `published`, `review`, and `quarantined`. It does
not include raw payloads, URLs, or credentials in the summary.

## Matching and comparison rules

- Comparable identity precedence is exact SKU, exact product ID, exact service type, then a
  manually approved package.
- Catalog SKU, merchant SKU, GTIN, and MPN matches can be automatic.
- Fuzzy title similarity can suggest a candidate but always requires review.
- Price values are stored as integer minor units. Invalid, negative, unsupported, or ambiguous
  currency/price evidence is quarantined.
- A price more than three times the established comparison value is held for review.
- Freshness boundaries remain inclusive:
  - fresh: age at most 72 hours;
  - stale: older than 72 hours and at most 7 days;
  - expired: older than 7 days and excluded from public results.
- Minimum-price comparison is valid only inside the same exact `comparable_key`.

## Security boundary

- The runner requires `OFFER_FINDER_SUPABASE_URL` and
  `OFFER_FINDER_SUPABASE_SERVICE_ROLE_KEY`; credentials are never available to adapters or
  browser code.
- Normalization SQL functions revoke access from `public`, `anon`, and `authenticated` and
  grant execution only to `service_role`.
- Publication verifies that the observation belongs to an enabled source and that its
  protected URL has an exact approved HTTPS origin.
- Raw observation linkage and normalization rule version are retained for audit.
- Reprocessing is idempotent: duplicate raw evidence does not create duplicate current offers
  or price-history rows.
- Error messages are length-bounded and redact token-like values.

## Operations

The protected GitHub environment `offer-finder-production` must contain:

- `OFFER_FINDER_SUPABASE_URL`
- `OFFER_FINDER_SUPABASE_SERVICE_ROLE_KEY`

The scheduled workflow remains fixture-only. A live normalization batch runs only after a
manual `workflow_dispatch` with an approved `source_id`, `canary=true`, and `dry_run=false`.
The live canary first runs the bounded ingestion adapter, then invokes:

```text
node --experimental-strip-types \
  scripts/offer-finder/normalization-runner.ts \
  --source-id "<approved offer_sources.id>"
```

Do not run the normalization command without `--source-id` against production. The runner
supports an unfiltered batch for local testing, but production operation must stay scoped to
the source approved for that canary.

Inspect the JSON summary after each run. Any unexpected increase in `review` or `quarantined`
must stop source enablement until the evidence and normalization rule are reviewed.

## Verification

Run deterministic TypeScript tests:

```text
npx vitest run \
  scripts/offer-finder/normalization.test.ts \
  scripts/offer-finder/normalization-runner.test.ts
```

Against a disposable local Supabase database, apply migrations and run both schema suites:

```text
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/offer_finder_foundation.sql

psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/offer_finder_normalization.sql
```

The SQL suite covers publication, idempotency, freshness boundaries, raw provenance,
price-anomaly review, fuzzy-match review, service-role isolation, and split/merge regressions.

## Rollback

1. Disable the affected row in `offer_sources` or disable the ingestion workflow.
2. Stop normalization runs for that source.
3. Leave raw observations, price history, match reviews, and audit records intact.
4. Correct the normalization rule with a forward migration and reprocess the retained
   observations.

Do not delete raw observations or review history during incident response.
