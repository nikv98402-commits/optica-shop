# Guided camera capture

## Purpose

The try-on page supports two equivalent photo inputs:

1. upload an existing JPEG, PNG, or WebP file;
2. capture a new JPEG with the browser camera.

Both inputs enter the existing browser-side MediaPipe Face Landmarker pipeline
in `src/lib/faceFitEngine.ts`. The camera stream, preview frames, and final
photo are not sent to the backend or analytics.

## Client flow

```text
Open camera
  -> request browser permission
  -> show mirrored local preview
  -> sample a reduced local frame every 850 ms
  -> MediaPipe quality and landmark check
      -> no face / multiple faces: correct the frame
      -> too far / too close: change distance
      -> tilted / off-center: correct phone or face position
      -> ready: capture
  -> create an in-memory JPEG File
  -> existing try-on photo pipeline
  -> auto-fit frame
```

The distance guidance is relative, not a physical centimetre measurement. It
uses the eye-distance ratio and the existing frame-width hint. An uncalibrated
consumer camera cannot determine face dimensions or camera distance in
millimetres.

## Privacy and trust boundary

- `getUserMedia` runs only after an explicit user action.
- Camera tracks stop when the dialog closes or unmounts.
- Analysis frames use short-lived object URLs that are revoked after analysis.
- The final photo remains an in-memory object URL and is revoked when replaced
  or when the page unmounts.
- Analytics receives only allowlisted technical states such as `ready` or
  `adjust`; it never receives pixels, object URLs, landmarks, or identity data.
- Camera failure never blocks the existing upload-photo flow.

## Relationship to Eye Map

Guided camera capture is part of the current MediaPipe precheck and fallback.
It does not enable Eye Map, add an `/eye-map` route, upload a facial photo, or
change `VITE_FEATURE_EYE_MAP=false`.

If Eye Map passes its Sprint 0 Go/No-go gates, a later release may reuse this
capture UI as its local quality gate. Purpose-specific consent and the private
inference boundary are still required before any server-side Eye Map
processing.

## Browser requirements

- production must be served over HTTPS;
- the browser must support `navigator.mediaDevices.getUserMedia`;
- the user must grant camera permission;
- iOS Safari requires `playsInline` and a user-initiated camera action.
