import { describe, expect, it } from 'vitest';
import type { FaceFitMeasurement, FaceFitEngineStatus } from '../../faceFitEngine';
import { evaluateEyeMapPrecheck } from '../qualityGate';

function measurement(
  status: FaceFitEngineStatus,
  confidence = status === 'ready' ? 90 : 0,
): FaceFitMeasurement {
  return {
    status,
    confidence,
    faceCount: status === 'ready' ? 1 : 0,
    eyeDistanceRatio: 0.24,
    frameWidthHint: 60,
    frameCenterX: 50,
    frameCenterY: 43,
    eyeLineTiltDeg: 0,
    bridgeOffsetPct: 0,
    overlayPoints: [],
    checks: ['check'],
    limitations: ['limitation'],
  };
}

describe('evaluateEyeMapPrecheck', () => {
  it('stays disabled by default while preserving the existing try-on', () => {
    expect(evaluateEyeMapPrecheck(measurement('ready'), false)).toMatchObject({
      status: 'disabled',
      canUseExistingTryOn: true,
    });
  });

  it('allows only a ready, high-confidence photo', () => {
    expect(evaluateEyeMapPrecheck(measurement('ready', 90), true)).toMatchObject({
      status: 'eligible',
      confidence: 90,
    });
  });

  it('blocks low-confidence output explicitly', () => {
    expect(evaluateEyeMapPrecheck(measurement('ready', 69), true)).toMatchObject({
      status: 'blocked',
      reason: 'low_quality',
    });
  });

  it.each([
    ['no_face', 'no_face'],
    ['multiple_faces', 'multiple_faces'],
    ['unsupported_photo', 'unsupported_photo'],
    ['error', 'engine_unavailable'],
  ] as const)('maps %s to the user-safe %s reason', (status, reason) => {
    expect(evaluateEyeMapPrecheck(measurement(status), true)).toMatchObject({
      status: 'blocked',
      reason,
      canUseExistingTryOn: true,
    });
  });

  it('does not treat loading or idle engine state as eligible', () => {
    expect(evaluateEyeMapPrecheck(measurement('loading'), true)).toMatchObject({
      status: 'blocked',
      reason: 'low_quality',
    });
  });
});
