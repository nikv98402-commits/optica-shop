import type { FaceFitMeasurement } from '../faceFitEngine';
import type { EyeMapPrecheck } from '../../types/eyeMap';

export const EYE_MAP_MINIMUM_PRECHECK_CONFIDENCE = 70;

export function evaluateEyeMapPrecheck(
  measurement: FaceFitMeasurement,
  featureEnabled: boolean,
): EyeMapPrecheck {
  if (!featureEnabled) {
    return {
      status: 'disabled',
      confidence: measurement.confidence,
      canUseExistingTryOn: true,
      checks: measurement.checks,
      limitations: measurement.limitations,
    };
  }

  const reasonByStatus = {
    no_face: 'no_face',
    multiple_faces: 'multiple_faces',
    unsupported_photo: 'unsupported_photo',
    error: 'engine_unavailable',
  } as const;

  if (measurement.status in reasonByStatus) {
    return {
      status: 'blocked',
      reason: reasonByStatus[measurement.status as keyof typeof reasonByStatus],
      confidence: measurement.confidence,
      canUseExistingTryOn: true,
      checks: measurement.checks,
      limitations: measurement.limitations,
    };
  }

  if (
    measurement.status !== 'ready' ||
    measurement.confidence < EYE_MAP_MINIMUM_PRECHECK_CONFIDENCE
  ) {
    return {
      status: 'blocked',
      reason: 'low_quality',
      confidence: measurement.confidence,
      canUseExistingTryOn: true,
      checks: measurement.checks,
      limitations: measurement.limitations,
    };
  }

  return {
    status: 'eligible',
    confidence: measurement.confidence,
    canUseExistingTryOn: true,
    checks: measurement.checks,
    limitations: measurement.limitations,
  };
}
