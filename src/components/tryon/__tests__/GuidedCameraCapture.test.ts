import { describe, expect, it } from 'vitest';
import type { FaceFitMeasurement } from '../../../lib/faceFitEngine';
import { getCameraGuidance } from '../GuidedCameraCapture';

function measurement(overrides: Partial<FaceFitMeasurement> = {}): FaceFitMeasurement {
  return {
    status: 'ready',
    confidence: 90,
    faceCount: 1,
    eyeDistanceRatio: 0.25,
    frameWidthHint: 64,
    frameCenterX: 50,
    frameCenterY: 43,
    eyeLineTiltDeg: 1,
    bridgeOffsetPct: 1,
    overlayPoints: [],
    checks: [],
    limitations: [],
    ...overrides,
  };
}

describe('guided camera distance feedback', () => {
  it('asks the user to move closer when the face is too small', () => {
    const guidance = getCameraGuidance(measurement({ frameWidthHint: 48, eyeDistanceRatio: 0.16 }), 'ru');
    expect(guidance.tone).toBe('adjust');
    expect(guidance.title).toBe('Подойдите немного ближе');
  });

  it('asks the user to move farther away when the face is too large', () => {
    const guidance = getCameraGuidance(measurement({ frameWidthHint: 80, eyeDistanceRatio: 0.34 }), 'en');
    expect(guidance.tone).toBe('adjust');
    expect(guidance.title).toBe('Move the phone farther away');
  });

  it('prioritizes head alignment after distance is acceptable', () => {
    const guidance = getCameraGuidance(measurement({ eyeLineTiltDeg: 9 }), 'ru');
    expect(guidance.title).toBe('Держите телефон ровно');
  });

  it('marks a centered, front-facing capture as ready', () => {
    const guidance = getCameraGuidance(measurement(), 'ru');
    expect(guidance.tone).toBe('ready');
    expect(guidance.title).toBe('Расстояние оптимальное');
  });

  it('does not allow a no-face result to look ready', () => {
    const guidance = getCameraGuidance(measurement({ status: 'no_face', faceCount: 0 }), 'en');
    expect(guidance.tone).toBe('adjust');
    expect(guidance.title).toBe('Face not found');
  });
});
