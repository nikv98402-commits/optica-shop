# Offer Finder foundation (#53)

The migration `20260724120000_create_offer_finder_foundation.sql` is additive. It creates
the normalized Offer Finder schema, immutable observation boundary, freshness projection,
RLS boundary, indexes, and versioned SQL functions. It does not enable ingestion, parsers,
the Edge Function BFF, or UI.

The additive normalization extension and its service-role operations are documented in
[Offer Finder normalization](offer-finder-normalization.md).

## Security boundary

- `anon` and `authenticated` cannot read or mutate Offer Finder tables.
- `service_role` is the only table writer.
- The three `offer_*_v1` functions expose declared safe fields only.
- Raw payloads, diagnostics, source configuration, and unvalidated URLs never cross the
  public function boundary.

## Freshness and comparison

- Fresh: age is at most 72 hours (inclusive).
- Stale: older than 72 hours and at most 7 days (inclusive).
- Expired: older than 7 days and absent from public results.
- Only fresh offers can be marked as the minimum price.
- A minimum is calculated only inside the same exact `comparable_key`.

## Rollback

Rollback is deliberately non-destructive:

1. Revoke execution of `offer_search_v1`, `offer_details_v1`, and `offer_stores_v1`
   from `anon` and `authenticated`.
2. Disable all rows in `offer_markets` and `offer_sources`.
3. Stop any future scheduler or ingestion workflow.
4. Leave observations and price history intact for audit and reconstruction.

Do not drop Offer Finder tables during incident response. A later forward migration can
replace the public functions or rebuild the projection from immutable observations.

## Verification

Run the TypeScript contract tests with:

```text
npx vitest run src/lib/offerFinder/contracts.test.ts
```

Against a disposable local Supabase database, run:

```text
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/offer_finder_foundation.sql
```
