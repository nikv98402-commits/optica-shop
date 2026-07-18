# Eye Map Sprint 0 benchmark report

Status: `draft | complete`

## Reproducibility

- Candidate model version:
- Candidate artifact SHA-256:
- Source commit:
- Dependency lock checksum:
- Dataset version:
- Governance manifest SHA-256:
- Blinded review export SHA-256:
- Reference CPU:
- Operating system:
- Run timestamp:

## Required inputs

| Input | Value |
| --- | --- |
| Licences approved | `true/false` |
| Checksums approved | `true/false` |
| Governed photo count | Must equal `150` |
| Deletion controls verified | `true/false` |
| Quality-passed image count | |
| Pipeline success count | |
| MediaPipe usable rate | |
| Eye Map usable rate | |
| MediaPipe retake rate | |
| Eye Map retake rate | |
| Maximum unexplained cohort regression | |
| Reference CPU p95 | |
| Peak memory | |
| Model size | |
| Invalid artifact count | |
| Explicitly handled artifact count | |
| Two blinded reviews complete | `true/false` |
| Adjudication complete | `true/false` |
| Required approvals complete | `true/false` |

## Gate results

Run these values through `evaluateEyeMapBenchmark` in
`src/lib/eyeMap/benchmarkGate.ts` and paste the serialized result here.

```json
{
  "decision": "no-go",
  "metrics": {},
  "gates": [],
  "failedGateIds": []
}
```

## Cohort analysis

Document sample size, usable rate, retake rate, and unexplained regression for
each approved cohort. Do not add demographic or health attributes that are not
covered by consent and governance.

## Failure analysis

List all explicit `partial` and `failure` outcomes by failure code. Zero-area,
empty, NaN, and missing-structure artifacts must never be counted as success.

## Recommendation

- Proposed decision: `GO | NO-GO`
- Evidence:
- Unresolved risks:
- Required follow-up:

This report is evidence for an ADR. It does not itself enable the feature.
