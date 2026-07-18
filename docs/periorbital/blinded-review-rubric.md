# Eye Map blinded review rubric

## Purpose

This rubric compares the existing MediaPipe baseline with the isolated Eye Map
candidate without revealing the method to reviewers. It is for Sprint 0 offline
validation only and does not authorize a user-facing route.

## Review packet

- Use the governed set of exactly 150 consented photos.
- Randomize candidate labels as `A` and `B` independently for each photo.
- Strip filenames, model names, timestamps, and other method identifiers.
- Assign two reviewers who do not know the label mapping.
- Route disagreements to a third adjudicator.

## Per-photo assessment

Each reviewer records the following fields for both candidates:

| Field | Allowed values | Meaning |
| --- | --- | --- |
| Required structures | `complete`, `partial`, `missing` | Both irises and required periorbital structures are usable. |
| Anatomical plausibility | `good`, `borderline`, `invalid` | Geometry follows visible anatomy without obvious displacement. |
| Artifact handling | `explicit`, `silent` | Invalid output becomes partial/failure instead of a plausible-looking zero mask. |
| Product usability | `usable`, `retake`, `reject` | Output can support the proposed product step. |
| Preferred candidate | `A`, `B`, `tie`, `neither` | Overall result for this photo. |
| Confidence | integer `1` to `5` | Reviewer certainty. |
| Notes | short free text | Required for `borderline`, `invalid`, `retake`, or `reject`. |

## Adjudication

Adjudication is required when reviewers disagree on product usability,
anatomical plausibility, artifact handling, or preferred candidate. The
adjudicator sees both reviews but remains blind to method labels. The final
record must preserve the original votes and the adjudicated value.

## Completion gate

The human-review gate passes only when:

1. all 150 photos have two complete reviews;
2. every disagreement has an adjudicated result;
3. no reviewer saw the label mapping before sign-off;
4. the frozen review export checksum is recorded in the benchmark report.
