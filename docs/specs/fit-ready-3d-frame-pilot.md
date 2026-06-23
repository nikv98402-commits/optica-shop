# Spec: Fit-Ready 3D Frame Pilot

## Context

ViLu is moving from a playful online try-on toward a more trustworthy frame-shortlisting system. The current MVP already has browser-only photo try-on, MediaPipe-assisted auto-fit, Face-fit score, saved selections, nearby optics, demo/local dashboard, and safe Yandex Metrika analytics.

The next step is to add a fit-ready frame layer: structured frame dimensions, optional 3D asset metadata, a fit passport, and a rule-based confidence score. This must help users choose 2-3 frames for in-store fitting without claiming exact physical fit.

## Current State

Verified on June 23, 2026.

| Area | Current Implementation | Gap |
|---|---|---|
| Pilot frames | `src/data/pilotOptics.ts` defines 6 pilot frames with `id`, brand, model, size, material, price, colors. | No normalized dimensions, fit class, bridge type, RX constraints, or 3D asset metadata. |
| Try-on flow | `src/pages/TryOnPilot.tsx` supports photo upload, manual placement, MediaPipe auto-fit, Face-fit score, saved selection, nearby optics. | No fit passport panel, no calibration inputs, no 3D preview/fallback container. |
| Analytics | `src/lib/analyticsEvents.ts` centralizes events and filters sensitive params. | No fit-passport or 3D-preview events yet. |
| 3D assets | No `public/models/frames/` folder committed. | Need placeholder path contract without committing heavy GLB files. |
| Documentation | `docs/release-mediapipe-auto-fit.md` documents MediaPipe auto-fit release. | Need fit-ready 3D pipeline documentation and implementation spec. |

## Product Decision

Build the first web implementation for the 6 existing pilot frames only. Design the data model so it can scale to 20 SKU later, but do not block the MVP on 20 complete passports or 20 GLB files.

Use a fallback-only `Frame3DPreview` component in this step. It should display 3D asset status and a safe fallback message when GLB files are missing. Do not add `@google/model-viewer` until at least 1-2 scale-verified GLB files exist.

## Positioning Rules

Allowed wording:

- `предварительная fit-оценка`
- `fit-ready модель`
- `помогает выбрать оправы для очной примерки`
- `финальную посадку проверяет консультант в салоне`

Forbidden wording:

- `1:1 посадка`
- `точная посадка`
- `медицинская точность`
- `точно измерили PD`
- any claim that ViLu measures exact biometrics or replaces an optician.

## Proposed Change

Add fit-ready infrastructure to the React/Vite app:

1. TypeScript fit data model.
2. Six demo fit passports matching existing pilot frames.
3. Rule-based fit confidence scoring.
4. Fallback-safe 3D preview component.
5. Fit passport panel.
6. Calibration guide with optional, local-only inputs.
7. Fit confidence result card.
8. Try-on page integration.
9. Safe analytics events.
10. Model folder placeholder and documentation.

## Implementation Details

### 1. Add Fit Types

Create `src/types/fit.ts`.

```ts
export type FitClass = 'A' | 'B' | 'C';
export type FrameCategory = 'eyeglasses' | 'sunglasses';
export type BridgeFitType = 'fixed_acetate' | 'adjustable_nose_pads' | 'low_bridge' | 'unknown';
export type MaterialType = 'acetate' | 'metal' | 'titanium' | 'mixed' | 'unknown';

export interface FrameDimensionsMm {
  frameWidth: number;
  lensWidth: number;
  lensHeight: number;
  bridgeWidth: number;
  templeLength: number;
  effectiveDiameter?: number;
  framePd?: number;
  baseCurve?: number;
  wrapAngle?: number;
  pantoscopicTilt?: number;
}

export interface FrameAsset3D {
  glbUrl?: string;
  thumbnailUrl?: string;
  version: string;
  source: 'cad' | 'scan' | 'manual' | 'placeholder';
  scaleVerified: boolean;
  notes?: string;
}

export interface RxConstraints {
  strongRxRisk: 'low' | 'medium' | 'high' | 'unknown';
  maxRecommendedAbsSph?: number;
  maxRecommendedAbsCyl?: number;
  notes: string;
}

export interface FitPassport {
  frameId: string;
  brand: string;
  model: string;
  sku: string;
  category: FrameCategory;
  fitClass: FitClass;
  material: MaterialType;
  bridgeFitType: BridgeFitType;
  dimensions: FrameDimensionsMm;
  asset3d: FrameAsset3D;
  recommendedFaceWidthMm: { min: number; max: number };
  recommendedPdMm?: { min: number; max: number };
  rxConstraints: RxConstraints;
  validation: {
    sampleSize: number;
    confirmedFitRate?: number;
    lastValidatedAt?: string;
    notes?: string;
  };
}

export interface UserFitInputs {
  estimatedFaceWidthMm?: number;
  knownPdMm?: number;
  useCase: 'office' | 'everyday' | 'computer' | 'sunglasses' | 'statement' | 'minimalism';
  hasStrongPrescription?: boolean;
  photoQuality?: 'good' | 'medium' | 'poor';
}

export interface FitScoreResult {
  totalScore: number;
  confidence: 'low' | 'medium' | 'high';
  widthScore: number;
  pdScore: number;
  rxScore: number;
  dataQualityScore: number;
  strengths: string[];
  risks: string[];
  inStoreChecks: string[];
}
```

### 2. Add Demo Fit Passports

Create `src/data/fitPassports.ts`.

Include demo/sample values for exactly these existing frame IDs:

- `pilot-aurora`
- `pilot-noir`
- `pilot-honey`
- `pilot-polar`
- `pilot-softline`
- `pilot-boston`

Every passport must make clear that values are demo/sample data unless verified. Use:

- `asset3d.glbUrl`: `/models/frames/{frameId}.glb`
- `asset3d.source`: `placeholder` or `manual`
- `asset3d.scaleVerified`: `false` by default.

Do not describe demo dimensions as manufacturer-confirmed.

### 3. Add Fit Scoring

Create `src/lib/fitScoring.ts` with:

```ts
export function calculateFitScore(passport: FitPassport, inputs: UserFitInputs): FitScoreResult;
```

Scoring rules:

| Score | Rule |
|---|---|
| `widthScore` | If `estimatedFaceWidthMm` is inside `recommendedFaceWidthMm`, score high. If near the range, score medium. If outside, score lower. If missing, neutral score and add risk: `Требуется очная проверка ширины`. |
| `pdScore` | If `knownPdMm` and `recommendedPdMm` exist, compare to range. If missing, neutral score and add in-store check: `Проверить PD и положение оптических центров в салоне`. Never claim exact PD measurement. |
| `rxScore` | If `hasStrongPrescription` and `strongRxRisk` is high, reduce score and add risk about thicker-looking lenses. |
| `dataQualityScore` | Based on `asset3d.scaleVerified`, `fitClass`, and `photoQuality`. Fit class A and scale-verified assets raise confidence. |
| `totalScore` | `35% width + 20% PD + 20% RX + 25% data quality`. |

Confidence:

- `high`: `totalScore >= 80`, fit class A, and scale verified.
- `medium`: `totalScore >= 60`.
- `low`: otherwise.

Safe copy examples:

- `подходит для первого визита`
- `стоит проверить`
- `предварительная оценка`
- `Финальную посадку проверяет консультант в салоне.`

### 4. Add Frame3DPreview

Create `src/components/fit/Frame3DPreview.tsx`.

MVP decision: fallback-only component.

Behavior:

- If `asset3d.glbUrl` is present, show a 3D asset status card, not a live GLB viewer yet.
- If model is missing or unverified, show:
  `3D-модель пока не загружена. Fit-оценка строится по паспорту оправы и демо-визуализации.`
- Never break the page because a GLB file is absent.
- Track `fit_3d_preview_opened` or `fit_asset_missing` with safe params only.

Out of scope for this issue:

- Add `@google/model-viewer`.
- Load and render real GLB.
- Build Three.js scene or 3D editor.

### 5. Add FitPassportPanel

Create `src/components/fit/FitPassportPanel.tsx`.

Show:

- Brand, model, SKU.
- Fit class A/B/C.
- Material.
- Bridge type.
- Key dimensions: frame width, lens width, lens height, bridge, temple length.
- RX risk.
- 3D asset status: source and scale verification.
- What can be assessed online.
- What must be checked in store.

User-facing section labels:

- `Что известно об оправе`
- `Что можно оценить онлайн`
- `Что нужно проверить в салоне`

### 6. Add FitConfidenceCard

Create `src/components/fit/FitConfidenceCard.tsx`.

Display:

- `Подходит для первого визита: X/100`
- Confidence badge:
  - high: `Высокая уверенность`
  - medium: `Средняя уверенность`
  - low: `Нужна очная проверка`
- Strengths.
- Risks.
- In-store checks.
- Disclaimer: `Оценка предварительная и не заменяет финальную посадку в салоне.`

### 7. Add CalibrationGuide

Create `src/components/fit/CalibrationGuide.tsx`.

Content:

- Title: `Как повысить точность примерки`
- Steps:
  1. Сделайте фото прямо перед камерой.
  2. Используйте хорошее освещение.
  3. Не наклоняйте голову.
  4. Если знаете PD или размер старой оправы, укажите их.
  5. Финальную посадку проверяйте в салоне.

Inputs:

- `estimatedFaceWidthMm` optional.
- `knownPdMm` optional.
- `hasStrongPrescription` checkbox.

Privacy:

- Inputs stay in React state/local UI only.
- Do not send values to analytics.
- Do not call fields medical measurements.

### 8. Update TryOnPilot

Update `src/pages/TryOnPilot.tsx`.

For the active frame:

- Find matching `FitPassport` by `activeFrame.id`.
- Show `Frame3DPreview`.
- Show `FitPassportPanel`.
- Show `CalibrationGuide`.
- On `Оценить посадку`, calculate and show `FitConfidenceCard`.
- Keep existing manual try-on controls.
- Keep MediaPipe auto-fit.
- Keep saved frame selection.
- Keep nearby optics flow.

CTAs after score:

- `Сохранить в подбор`
- `Найти, где примерить рядом`
- `Скопировать чеклист для консультанта`

### 9. Update Analytics

Update `src/lib/analyticsEvents.ts` with:

- `fit_passport_viewed`
- `fit_3d_preview_opened`
- `fit_confidence_viewed`
- `calibration_guide_opened`
- `calibration_inputs_updated`
- `fit_asset_missing`

Allowed params:

- `frame_id`
- `fit_class`
- `has_3d_asset`
- `confidence_level`
- `source`

Forbidden params:

- face width
- PD value
- prescription values
- photo data
- name
- phone
- email
- any biometric value.

### 10. Add Model Folder Placeholder

Create:

```text
public/models/frames/.gitkeep
```

Do not commit heavy binary GLB files in this issue.

### 11. Add Pipeline Documentation

Create `docs/FIT_READY_3D_PIPELINE.md`.

Required sections:

- Purpose.
- Non-goals.
- 3D asset requirements.
- Coordinate system.
- Metadata requirements.
- Safe wording.
- Validation process.
- Acceptance criteria.

### 12. README Update

Add short section: `Fit-ready 3D pilot`.

Mention:

- 3D assets are optional.
- App falls back if GLB is missing.
- No exact fit claim.
- No photo upload to server.

## Acceptance Criteria

1. User can open `/tryon` without errors.
2. User can select a frame and see its fit passport.
3. If GLB model is missing, page still works.
4. User can enter optional calibration inputs.
5. User can click `Оценить посадку` and see `FitConfidenceCard`.
6. Copy clearly says the evaluation is preliminary.
7. User can still save a frame to selection.
8. User can still open nearby optics.
9. Analytics events use safe params only.
10. No sensitive data is sent to analytics or backend.
11. `npm run typecheck` passes.
12. `npm run lint` passes.
13. `npm run build` passes.

## Testing Plan

| Layer | What | Count |
|---|---|---:|
| Unit | `calculateFitScore` width, PD, RX, confidence, missing data | +8 |
| Component | `Frame3DPreview`, `FitPassportPanel`, `FitConfidenceCard`, `CalibrationGuide` render with demo data | +4 |
| Integration | `/tryon`: select frame, view passport, enter optional inputs, score, save frame | +3 |
| Privacy | Verify analytics params do not include face width, PD, prescription, photo, name, phone, email | +2 |
| Build | typecheck, lint, production build | +3 |

## Rollback Plan

Revert the PR. The feature is additive: no backend migration, no stored user data, no required GLB files, and no destructive data changes.

## Effort Estimate

| Work | Estimate |
|---|---:|
| Fit types and demo passports | 2h |
| Fit scoring module | 2h |
| Fit components | 4h |
| TryOnPilot integration | 4h |
| Analytics update | 1h |
| Docs and README | 2h |
| QA and fixes | 3h |
| Total | ~18h |

## Files Reference

| File | Change |
|---|---|
| `src/types/fit.ts` | New fit-ready frame data model. |
| `src/data/fitPassports.ts` | New demo passports for 6 pilot frames. |
| `src/lib/fitScoring.ts` | New rule-based fit score calculator. |
| `src/components/fit/Frame3DPreview.tsx` | New fallback-safe 3D asset preview/status component. |
| `src/components/fit/FitPassportPanel.tsx` | New frame passport UI. |
| `src/components/fit/FitConfidenceCard.tsx` | New score result UI. |
| `src/components/fit/CalibrationGuide.tsx` | New optional calibration guidance UI. |
| `src/pages/TryOnPilot.tsx` | Integrate fit-ready system into existing try-on flow. |
| `src/lib/analyticsEvents.ts` | Add safe fit-ready analytics events. |
| `public/models/frames/.gitkeep` | Placeholder model folder. |
| `docs/FIT_READY_3D_PIPELINE.md` | New implementation and asset pipeline docs. |
| `README.md` | Add fit-ready 3D pilot section. |

## Out of Scope

- Real 1:1 physical fit simulation.
- Exact PD measurement.
- Medical diagnosis.
- Server-side photo processing.
- User photo upload to server.
- `@google/model-viewer` integration.
- Three.js scene.
- Full 3D editor.
- Full 20-SKU passport completion.
- Checkout/payment.
- B2B optician dashboard.

## Related

- `docs/release-mediapipe-auto-fit.md` documents the prior MediaPipe auto-fit release.
- `docs/specs/3d-asset-production.md` defines the GLB production requirements for 20 SKU.
