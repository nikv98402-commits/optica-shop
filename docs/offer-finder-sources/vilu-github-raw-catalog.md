# ViLu GitHub raw catalog source decision

Reviewed: 2026-07-27.

## Authorization and policy

- Source owner/operator: ViLu repository owner (`nikv98402-commits/optica-shop`).
- Source UUID: `00000000-0000-4000-8000-000000000072`.
- Adapter: `vilu_github_raw_catalog` version `1.0.0`.
- Market: existing `RU` only.
- Exact approved origin: `https://raw.githubusercontent.com`.
- Exact feed:
  `https://raw.githubusercontent.com/nikv98402-commits/optica-shop/main/public/offer-finder/aurora-crystal.json`.
- Product destination: `https://vilu.store/products/aurora-crystal`.
- The file is owner-published content in a public repository. GitHub Terms of
  Service D.8 permit lawful access to public repository content.
- The raw host does not publish a `robots.txt`; the source is marked
  `not_applicable`, not inferred as a general crawling permission.
- No API token, authentication, CAPTCHA, browser automation, or protection bypass.
- The adapter does not alter or share code with the first
  `vilu_public_catalog` source at runtime.

## Strict bounded-canary limits

- One exact HTTPS URL and one request per run.
- Exactly one offer; zero or more than one blocks the run.
- Rate limit: one request per minute.
- Concurrency: one.
- No `schedule_cron`; manual canary only.
- Shared timeout, redirect, DNS, private-network, response-size, content-type,
  and SSRF guards remain active.
- No market or geography expansion.

## Expected normalization and deduplication

- Exact SKU `VILU-AURORA-52`, MPN `AURORA-52`, and model `Aurora Crystal`.
- Automatic match to the existing accepted Aurora Crystal variant.
- Stable `(source_id, external_offer_id)` makes repeated observations
  idempotent; repeated normalization updates the same source offer.
- The second source remains separate evidence from the first source. The
  product read model may show both verified observations while computing the
  same minimum confirmed price.
- Invalid price, external destination, expanded batch, schema drift, ambiguous
  identity, and stale records are rejected or quarantined by existing rules.
