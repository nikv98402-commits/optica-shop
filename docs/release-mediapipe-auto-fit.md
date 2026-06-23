# Release Note: MediaPipe Auto-Fit Try-On

## Scope

This release adds the first production-shaped version of ViLu auto-fit try-on for the pilot fitting flow.

## What Changed

- Added MediaPipe Face Landmarker integration for browser-side face landmark detection.
- Added automatic frame placement based on eye position, bridge position, and face width hints.
- Kept uploaded photos local to the browser; photos are not sent to the ViLu server.
- Added unsupported photo handling for HEIC/HEIF and browser decoding failures.
- Changed the user-facing UX from a technical "landmarker" block to an "Auto-fit ready" fitting assistant.
- Hid face landmarks by default and kept them as an optional secondary view.
- Added a clear result state after auto-fit: the frame is aligned by eyes and bridge.
- Linked auto-fit to the current Face-fit score so users see a preliminary fitting result before saving a frame.
- Rewrote technical checks into human-readable fitting guidance.
- Fixed panel layout so copy, controls, and result cards do not collapse into narrow columns.

## User Journey

1. User opens online try-on.
2. User uploads a supported face photo.
3. ViLu analyzes the photo in the browser.
4. ViLu applies automatic frame placement.
5. User sees "Auto-fit ready" plus a preliminary Face-fit score.
6. User can manually adjust scale/position, show landmarks if needed, then save the frame.

## Privacy Boundary

- No face photo is uploaded to a server by this feature.
- Analytics receives only product events and non-PII status fields.
- The feature does not provide medical diagnosis and does not replace in-store optical fitting.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Known lint state: the project still has existing Fast Refresh warnings in unrelated files.
