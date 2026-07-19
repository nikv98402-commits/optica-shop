# Private Eye Map ML repository bootstrap

The model spike belongs in a separate private repository named
`vilu-eye-map-ml`. Do not add photos, weights, generated masks, review exports,
or secrets to the public ViLu repository.

## Minimum layout

```text
vilu-eye-map-ml/
  README.md
  pyproject.toml
  uv.lock
  src/
    eye_map/
      adapter.py
      contract.py
      pipeline.py
  tests/
    test_contract.py
    test_artifacts.py
  scripts/
    benchmark.py
    freeze_report.py
  governance/
    README.md
  reports/
    .gitkeep
```

## Required controls

1. Pin the upstream source commit, package versions, model weights, licences,
   and SHA-256 checksums before processing any governed photo.
2. Keep the original candidate pipeline and the strict adapter in separate
   modules so validation logic cannot silently alter model output.
3. Process encrypted local files offline. Do not expose an upload endpoint.
4. Emit only the versioned `success | partial | failure` contract mirrored in
   `src/types/eyeMap.ts`.
5. Reject zero-area, empty, NaN, missing-structure, and checksum-invalid
   artifacts explicitly.
6. Freeze benchmark inputs, outputs, environment metadata, and checksums before
   blinded review.
7. Publish only aggregate, non-identifying metrics back to this public
   repository.

## Exit condition

No work on a public route, production API, or user-facing Eye Map UI begins
until the signed Go/No-go ADR authorizes Sprint 1.
