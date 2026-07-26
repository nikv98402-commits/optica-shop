# Offer Finder foundation (#53)

The migration `20260724120000_create_offer_finder_foundation.sql` is additive. It creates
the normalized Offer Finder schema, immutable observation boundary, freshness projection,
RLS boundary, indexes, and versioned SQL functions. It does not enable ingestion, parsers,
the Edge Function BFF, or UI.

The source runtime is documented in
[Offer Finder ingestion](offer-finder-ingestion.md). The additive normalization extension and
its service-role operations are documented in
[Offer Finder normalization](offer-finder-normalization.md).

## Product API (#56)

The product card reads fresh, published offers through the versioned Edge endpoint:

```text
GET /functions/v1/offer-finder/v1/search
  ?market=RU
  &product=Aurora%20Crystal
  &brand=ViLu%20Atelier
  &store=<optional store UUID>
```

- `market` and `product` are required. `brand` and `store` are optional.
- Supported markets are `RU`, `AE`, `KZ`, `BY`, `AM`, `AZ`, `UZ`, `US`, and `GB`.
- The response uses the shared `OfferFinderEnvelope<ProductOfferSearchResult>` contract.
- Results contain only fresh `in_stock` or `preorder` offers. The response identifies the
  minimum confirmed price inside an exact comparable group.
- Each offer exposes at most one next action, selected in this order: route coordinates,
  phone, then the partner website as the final fallback.
- Product cards show explicit loading, empty, and safe error states. A failed Offer Finder
  request does not hide the catalogue price or block the normal purchase flow.

Browser code sends the public Supabase anon key to the Edge boundary. The Edge Function invokes
`offer_product_card_v1` with the service-role credential; browser roles cannot execute that SQL
function or read operational Offer Finder tables directly.

Successful responses are cached for 60 seconds with 120 seconds of stale-while-revalidate and
include an `ETag`. Validation and server errors use `no-store`.

### Deployment

Deploy migration `20260726120000_add_offer_finder_product_api.sql` and the
`supabase/functions/offer-finder` Edge Function. Set:

```text
OFFER_FINDER_ALLOWED_ORIGINS=https://vilu.store,https://www.vilu.store
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided to the Edge
Function by Supabase. Never copy the service-role key into a `VITE_*` variable.

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

This suite covers query validation, response validation, origin and anon-key enforcement,
rate limiting, safe response fields, ETags, loading, empty, error, source, availability, and
next-action product-card states.

Against a disposable local Supabase database, run:

```text
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/offer_finder_foundation.sql
```
