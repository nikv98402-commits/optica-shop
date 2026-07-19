# ADR: Eye Map decision after Sprint 0

- Status: `proposed`
- Date:
- Decision owners: Product, Engineering, Privacy/Legal, Medical Copy
- Benchmark report:
- Frozen report SHA-256:

## Context

The public ViLu application keeps Eye Map disabled. Sprint 0 evaluates an
isolated candidate against the current MediaPipe baseline using exactly 150
consented photos and a blinded review process.

## Automated gate result

- Decision returned by `evaluateEyeMapBenchmark`: `go | no-go`
- Failed gates:
- Exceptions: none permitted

## Decision

Choose exactly one:

- `NO-GO`: stop integration; retain the existing MediaPipe flow.
- `GO-TO-SPRINT-1`: permit a new integration plan behind a disabled feature
  flag. This does not permit production traffic or a public `/eye-map` route.

## Consequences

Document code, privacy, operations, model-hosting, monitoring, deletion, and
rollback consequences. A future pilot still requires model p95 at most 5
seconds, end-to-end p95 at most 10 seconds, explicit consent, deletion
controls, and production-readiness review.

## Sign-off

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product | | `approve/reject` | |
| Engineering | | `approve/reject` | |
| Privacy/Legal | | `approve/reject` | |
| Medical Copy | | `approve/reject` | |

All four approvals are required. Any rejection means `NO-GO`.
