# Periorbital Eye Map validation

This directory contains the public, non-identifying governance and decision
artifacts for the Eye Map feasibility spike.

- `sprint-0-spike.md`: executable validation plan.
- `asset-manifest.json`: approved source and artifact inventory.
- `golden-set-governance.schema.json`: metadata schema for the private,
  consented 150-photo set.
- `blinded-review-rubric.md`: two-reviewer and adjudication protocol.
- `benchmark-report-template.md`: reproducible metrics report.
- `go-no-go-adr-template.md`: mandatory signed decision record.
- `private-ml-repo-bootstrap.md`: isolation rules for `vilu-eye-map-ml`.

The public product remains unchanged: there is no Eye Map route, the feature
flag defaults to false, and no photos, weights, masks, or review exports belong
in this repository.
