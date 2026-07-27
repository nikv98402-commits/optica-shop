# ViLu public catalog source decision

Reviewed: 2026-07-26.

## Authorization and policy

- Source owner/operator: ViLu (first-party source).
- Canonical source UUID: `00000000-0000-4000-8000-000000000068`.
- Exact approved origin: `https://vilu.store`.
- Exact feed: `https://vilu.store/offer-finder/aurora-crystal.json`.
- Product destination: `https://vilu.store/products/aurora-crystal`.
- `robots.txt`: `User-agent: *` has `Allow: /`.
- Public MVP terms reviewed at `/terms/`; they do not prohibit access to the
  designated first-party machine-readable feed. This feed is intentionally
  published by ViLu for Offer Finder ingestion.
- No authentication, CAPTCHA, paywall, browser automation, or protection bypass.

## Bounded-canary limits

- One HTTPS request per run.
- Exactly one offer is accepted; zero or more than one blocks the run.
- Rate limit: one request per minute.
- Concurrency: one.
- Response remains subject to the shared 2 MB, timeout, redirect, content-type,
  DNS, private-network, and SSRF guards.
- The production workflow invokes only this source once per day; every run remains
  bounded to one request and one approved offer.
- Market remains `RU`; no other source or geography is introduced.

Production reconciliation is forward-only and fail-closed. If an existing
`vilu_public_catalog` row uses another UUID, the migration changes it only when
there are no dependent ingestion, observation, incident, or offer rows;
otherwise it aborts and requires an explicit data-preserving recovery plan.

## Expected normalization

The feed publishes one exact catalog identifier, `VILU-AURORA-52`. It must match
the accepted Aurora Crystal variant automatically. Invalid prices, external
destinations, schema drift, ambiguous catalog identity, and any expanded batch
are rejected or quarantined. Published offers retain the normal 72-hour freshness
and seven-day expiry rules.
