# Eye Map Local v1 release decision

Status: **NO_GO**

Date: 2026-07-20

## Decision

Eye Map Local v1 may be implemented and tested as an isolated component, but
must not be exposed through a public route or navigation entry until this ADR
is updated and all required owners approve `GO_LOCAL_V1`.

## Scope

- Photo capture or upload runs in the active browser tab.
- MediaPipe Face Landmarker uses a pinned public model artifact.
- Only a strict technical result may be stored in `localStorage`.
- Photos, blob URLs, landmarks, profile fields and cohort attributes are not
  persisted and are not sent to analytics.
- The output describes capture quality and technical comparability. It is not
  a diagnosis, eye examination or medical recommendation.
- Cohort comparison remains an explicitly labelled demonstration with no
  personalized ranking.

## Current evidence

- Reducer rejects stale async completions.
- Storage is schema-validated and limited to 12 results while preserving the
  personal baseline.
- Analytics uses a typed allowlist and drops unknown runtime keys.
- RU and EN copy share the same structure.
- Upload, blocked-state recovery and local save have component coverage.
- The production boundary keeps the feature flag off and the route absent.

## Remaining release gates

- Product approval of the customer value and recovery flow.
- Engineering approval after desktop, Android and iPhone camera checks.
- Privacy/Legal approval of local storage, analytics and copy.
- Medical Copy approval of limitations and non-diagnostic wording.
- Manual accessibility and responsive review at the required viewports.

## Rollback

Keep `VITE_FEATURE_EYE_MAP=false`, remove any Eye Map entry point and route, and
leave the existing try-on flow unchanged. Local Eye Map data is namespaced
under `vilu_eye_map_v1` and can be cleared without touching other product data.

## Required approvals

| Role | Status | Reviewer | Date |
| --- | --- | --- | --- |
| Product | pending |  |  |
| Engineering | pending |  |  |
| Privacy/Legal | pending |  |  |
| Medical Copy | pending |  |  |
