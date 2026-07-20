import type { FaceFitMeasurement } from '../faceFitEngine';
import type {
  EyeMapCaptureSource,
  EyeMapChangeBand,
  EyeMapLocalResultV1,
  EyeMapTechnicalVectorV1,
} from '../../types/eyeMapLocal';
import {
  EYE_MAP_ADAPTER_VERSION,
  EYE_MAP_MODEL_MANIFEST,
} from './modelManifest';

const round = (value: number, digits = 3) =>
  Number(value.toFixed(digits));

export type EyeMapAdapterResult =
  | { status: 'ready'; result: EyeMapLocalResultV1 }
  | {
      status: 'blocked';
      reason:
        | 'no_face'
        | 'multiple_faces'
        | 'pose'
        | 'distance'
        | 'engine_unavailable'
        | 'unsupported_file';
    };

function vectorFrom(measurement: FaceFitMeasurement): EyeMapTechnicalVectorV1 {
  return {
    confidence: Math.max(0, Math.min(100, Math.round(measurement.confidence))),
    eyeDistanceRatio: round(measurement.eyeDistanceRatio),
    eyeLineTiltDeg: round(measurement.eyeLineTiltDeg, 1),
    bridgeOffsetPct: round(measurement.bridgeOffsetPct, 1),
  };
}

function repeatability(
  current: EyeMapTechnicalVectorV1,
  baseline?: EyeMapLocalResultV1,
) {
  if (
    !baseline ||
    baseline.compatibilityGroup !== EYE_MAP_MODEL_MANIFEST.compatibilityGroup
  ) {
    return undefined;
  }

  const source = baseline.technicalVector;
  const deviation =
    Math.abs(current.confidence - source.confidence) * 0.25 +
    Math.abs(current.eyeDistanceRatio - source.eyeDistanceRatio) * 180 +
    Math.abs(current.eyeLineTiltDeg - source.eyeLineTiltDeg) * 2 +
    Math.abs(current.bridgeOffsetPct - source.bridgeOffsetPct) * 1.5;
  return Math.max(0, Math.min(100, Math.round(100 - deviation)));
}

function changeBand(score?: number): EyeMapChangeBand | undefined {
  if (score === undefined) return undefined;
  if (score >= 80) return 'minimal';
  if (score >= 55) return 'moderate';
  return 'not_comparable';
}

export function adaptFaceFitToEyeMap(
  measurement: FaceFitMeasurement,
  source: EyeMapCaptureSource,
  baseline?: EyeMapLocalResultV1,
  now = new Date(),
): EyeMapAdapterResult {
  if (measurement.status === 'no_face') {
    return { status: 'blocked', reason: 'no_face' };
  }
  if (measurement.status === 'multiple_faces') {
    return { status: 'blocked', reason: 'multiple_faces' };
  }
  if (measurement.status === 'unsupported_photo') {
    return { status: 'blocked', reason: 'unsupported_file' };
  }
  if (measurement.status !== 'ready') {
    return { status: 'blocked', reason: 'engine_unavailable' };
  }
  if (
    measurement.eyeDistanceRatio < 0.19 ||
    measurement.eyeDistanceRatio > 0.32
  ) {
    return { status: 'blocked', reason: 'distance' };
  }
  if (
    Math.abs(measurement.eyeLineTiltDeg) > 9 ||
    Math.abs(measurement.bridgeOffsetPct) > 8
  ) {
    return { status: 'blocked', reason: 'pose' };
  }

  const technicalVector = vectorFrom(measurement);
  const repeatabilityScore = repeatability(technicalVector, baseline);
  const captureQuality =
    measurement.confidence >= 82
      ? 'good'
      : measurement.confidence >= 70
        ? 'acceptable'
        : 'retake';
  const hasBothEyes =
    measurement.overlayPoints.some((point) => point.id === 'left-eye') &&
    measurement.overlayPoints.some((point) => point.id === 'right-eye');

  return {
    status: 'ready',
    result: {
      id: crypto.randomUUID(),
      capturedAt: now.toISOString(),
      engineVersion: EYE_MAP_MODEL_MANIFEST.engineVersion,
      modelVersion: EYE_MAP_MODEL_MANIFEST.modelVersion,
      adapterVersion: EYE_MAP_ADAPTER_VERSION,
      compatibilityGroup: EYE_MAP_MODEL_MANIFEST.compatibilityGroup,
      source,
      qualityStatus: captureQuality,
      metrics: {
        captureQuality,
        alignmentQuality:
          Math.abs(measurement.eyeLineTiltDeg) <= 5 &&
          Math.abs(measurement.bridgeOffsetPct) <= 5
            ? 'aligned'
            : 'adjust',
        leftEyeVisible: hasBothEyes,
        rightEyeVisible: hasBothEyes,
        repeatabilityScore,
        changeFromBaseline: changeBand(repeatabilityScore),
      },
      technicalVector,
      limitations: [
        'visual_not_medical',
        'camera_conditions_affect_comparison',
      ],
    },
  };
}
