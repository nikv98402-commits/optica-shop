# Spec: 3D Asset Production for Fit-Ready Frames

## Context

ViLu needs a controlled 3D asset pipeline for eyewear frames before the product can claim a more reliable remote try-on experience. The web app can start with six pilot frames, but the asset contract must be ready for a 20 SKU production batch.

This specification defines what a 3D frame asset must contain, where it is stored, how it is named, and which metadata is required before the model can be used in fit scoring or a 3D preview.

## Product Decision

The first implementation should support six pilot frames from the current catalog. The data model and file structure must support 20 SKU without refactoring.

The first web release should not depend on 3D models being present. The app should show a fallback preview until verified `.glb` files are produced.

## Scope

In scope:

- Production requirements for 20 frame assets.
- Required model geometry and scale rules.
- File naming and path contract.
- Fit passport metadata required for each asset.
- Quality gates before a model is accepted.

Out of scope:

- Building the 3D models inside the web app.
- Medical fitting guarantees.
- Exact PD measurement.
- Server-side upload or user photo storage.
- Full catalog conversion.

## Asset Deliverables

Each SKU must include:

1. One optimized `.glb` model.
2. One fit passport entry in the app data layer.
3. Source notes describing how dimensions were verified.
4. A `scaleVerified` flag.
5. Known limitations, if exact production dimensions are unavailable.

The preferred path is:

```text
public/models/frames/{frameId}.glb
```

Example:

```text
public/models/frames/pilot-aurora.glb
public/models/frames/pilot-noir.glb
public/models/frames/pilot-honey.glb
```

## Frame ID Contract

`frameId` must match the app catalog ID.

Current pilot IDs:

| Frame ID | Current catalog name |
| --- | --- |
| `pilot-aurora` | Aurora Crystal |
| `pilot-noir` | Noir Line |
| `pilot-honey` | Solstice Honey |
| `pilot-polar` | Polar Drive |
| `pilot-softline` | Softline 42 |
| `pilot-boston` | Boston Work |

Future 20 SKU should use the same stable ID pattern and must not rename existing IDs without a migration note.

## Geometry Requirements

Each model must represent the real frame shape closely enough for visual fit preview:

- Front frame outline.
- Lens openings.
- Bridge.
- Temples.
- Hinges, simplified if needed.
- Nose pads, if present on the real frame.
- Realistic thickness for the front frame.
- Materials that visually match the catalog frame.

The model can simplify hidden or tiny details, but it must not change the perceived width, lens shape, bridge position, or temple start points.

## Coordinate System

The model coordinate system must be consistent across all frames:

| Axis | Meaning |
| --- | --- |
| X | Left / right across the frame front |
| Y | Up / down |
| Z | Depth from face to camera |

Orientation:

- The front of the frame faces the camera by default.
- The bridge midpoint is centered at the origin.
- The model should open in a neutral, front-facing pose.
- Temples should extend backward along the depth axis.

Origin:

```text
origin = bridge midpoint between the two lenses
```

This origin is required so the app can align the frame against detected face landmarks.

## Real Dimensions

Each asset needs verified dimensions in millimeters when available:

| Field | Required | Notes |
| --- | --- | --- |
| `frameWidthMm` | Yes | Total front width |
| `lensWidthMm` | Yes | Usually first number in `52-18-140` |
| `lensHeightMm` | Preferred | Needed for better visual scale |
| `bridgeWidthMm` | Yes | Usually second number in `52-18-140` |
| `templeLengthMm` | Yes | Usually third number in `52-18-140` |
| `baseCurve` | Optional | Useful for sunglasses or curved frames |
| `wrapAngleDeg` | Optional | Useful for sport/sun frames |

If exact values are not known, use the best available estimate and set:

```ts
scaleVerified: false
```

Do not present an estimated model as scale-verified.

## Metadata Schema

Each frame passport should include:

```ts
type FrameAssetPassport = {
  frameId: string;
  sku?: string;
  brand: string;
  model: string;
  material: 'acetate' | 'metal' | 'mixed' | 'other';
  frameType: 'optical' | 'sunglasses';
  modelPath: string;
  dimensions: {
    frameWidthMm: number;
    lensWidthMm: number;
    lensHeightMm?: number;
    bridgeWidthMm: number;
    templeLengthMm: number;
    baseCurve?: number;
    wrapAngleDeg?: number;
  };
  scaleVerified: boolean;
  source: 'manufacturer' | 'manual-measurement' | 'catalog-estimate' | 'unknown';
  notes?: string;
};
```

## Web Optimization Requirements

Target file size:

- Preferred: `1-3 MB` per model.
- Maximum: `5 MB` unless explicitly approved.

Requirements:

- Use `.glb` as the primary format.
- Compress textures where possible.
- Avoid high-poly geometry that does not affect perceived fit.
- Keep materials simple and stable across browsers.
- Do not include animations in the first production batch.
- Do not include user or face data in any model file.

## Quality Gates

Before accepting a model:

1. The `.glb` opens in a standard viewer.
2. The frame front faces the camera.
3. The bridge midpoint is at the origin.
4. The real-world width matches passport dimensions.
5. Lens openings visually match the product image.
6. The model works with a transparent or neutral background.
7. File size is within the target range.
8. `scaleVerified` is true only when dimensions were verified.
9. The model path matches the catalog `frameId`.
10. Fallback preview still works if the file is missing.

## Validation Checklist

For each SKU:

| Check | Pass condition |
| --- | --- |
| Path exists | `public/models/frames/{frameId}.glb` is present |
| Viewer opens | No rendering error in a GLB viewer |
| Orientation | Frame front faces camera |
| Origin | Bridge midpoint aligns to origin |
| Scale | Width matches real dimensions |
| Metadata | Passport contains required fields |
| Fallback | App does not break if model is unavailable |
| Notes | Unknown or estimated values are documented |

## Handoff Checklist for 3D Contractor

Give the contractor:

- This specification.
- Current six frame IDs.
- Product images for each frame.
- Any available manufacturer dimensions.
- Required coordinate system.
- Target `.glb` output path.
- File size limits.
- A rule that uncertain dimensions must be marked as not verified.

## Acceptance Criteria

- The production process can create 20 `.glb` frame assets with stable names.
- The web app can consume six pilot assets without changing frame IDs.
- Missing models do not break the try-on flow.
- Every model has a fit passport with scale verification status.
- Unverified dimensions are visible to the product and engineering team.
- No user data or photos are included in the asset pipeline.

## Related Specs

- `docs/specs/fit-ready-3d-frame-pilot.md`
- Future implementation doc: `docs/FIT_READY_3D_PIPELINE.md`
