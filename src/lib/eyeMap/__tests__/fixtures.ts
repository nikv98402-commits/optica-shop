import type { FaceFitMeasurement } from '../../faceFitEngine';
import type { EyeMapLocalResultV1 } from '../../../types/eyeMapLocal';

export function readyMeasurement(
  overrides: Partial<FaceFitMeasurement> = {},
): FaceFitMeasurement {
  return {
    status: 'ready',
    confidence: 90,
    faceCount: 1,
    eyeDistanceRatio: 0.24,
    frameWidthHint: 60,
    frameCenterX: 50,
    frameCenterY: 43,
    eyeLineTiltDeg: 1,
    bridgeOffsetPct: 1,
    overlayPoints: [
      { id: 'left-eye', x: 42, y: 40 },
      { id: 'right-eye', x: 58, y: 40 },
    ],
    checks: [],
    limitations: [],
    ...overrides,
  };
}

export function localResult(
  overrides: Partial<EyeMapLocalResultV1> = {},
): EyeMapLocalResultV1 {
  return {
    id: 'result-1',
    capturedAt: '2026-07-20T09:00:00.000Z',
    engineVersion: '@mediapipe/tasks-vision@0.10.35',
    modelVersion: 'face_landmarker.float16.1',
    adapterVersion: 'eye-map-local-adapter@1',
    compatibilityGroup: 'vilu-face-landmarker-v1',
    source: 'upload',
    qualityStatus: 'good',
    metrics: {
      captureQuality: 'good',
      alignmentQuality: 'aligned',
      leftEyeVisible: true,
      rightEyeVisible: true,
    },
    technicalVector: {
      confidence: 90,
      eyeDistanceRatio: 0.24,
      eyeLineTiltDeg: 1,
      bridgeOffsetPct: 1,
    },
    limitations: ['visual_not_medical'],
    ...overrides,
  };
}
