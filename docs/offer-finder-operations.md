# Offer Finder production operations

## Safety boundary

The scheduled workflow runs exactly one source configured in the protected
`offer-finder-production` GitHub environment. It does not discover sources or
fan out across markets. Pull requests remain fixture-only.

Protected configuration:

- secrets `OFFER_FINDER_SUPABASE_URL`, `OFFER_FINDER_SUPABASE_SERVICE_ROLE_KEY`
  and `OFFER_FINDER_CANARY_URL`;
- variable `OFFER_FINDER_CANARY_SOURCE_ID`.

The canary URL origin must be in the source `approved_origins`. Terms/robots,
SSRF, response size/type, timeout and rate-limit guards remain mandatory.
The selected source must use adapter key `vilu_fixture_canary`; the scheduler
does not dynamically load or execute arbitrary adapter modules.

## Schedule and observability

The workflow runs daily at `02:17 UTC`. GitHub concurrency prevents overlapping
jobs; a partial unique database index independently prevents two active runs
for one source. The runner executes one bounded canary, normalization for that
source, then the service-role-only health RPC. Transient steps retry three times
with exponential backoff and jitter.

Blocking alerts are `NO_SUCCESS_30H`, `CONSECUTIVE_FAILURES`,
`STALE_HEARTBEAT`, and `MISSING_TERMINAL_HEARTBEAT`. Warnings are
`PARSE_SUCCESS_BELOW_95`, `QUARANTINE_ABOVE_5`, and `NO_FRESH_OFFERS`.
Inspect `offer_ingestion_runs`, `offer_sources` and `offer_parser_incidents`.

## Manual canary and recovery

Dispatch **Offer Finder ingestion** with one approved source UUID,
`canary=true`, and `dry_run=false`. With `dry_run=true`, only fixtures run.

On failure:

1. disable the affected `offer_sources` row;
2. inspect the last heartbeat, safe error code, counters and incidents;
3. never weaken allowlist or terms/robots policy;
4. update adapter fixtures and resolve or acknowledge quarantine incidents;
5. re-enable, run fixture/dry mode, then one bounded live canary;
6. verify terminal heartbeat, fresh `last_success_at`, and no blocking alerts.

An interrupted active run must be marked `cancelled` only after confirming that
no worker is alive and recording the incident. Disable the workflow before
rolling back this migration. Rollback removes monitoring and concurrency
protection but does not delete offer or price data.
