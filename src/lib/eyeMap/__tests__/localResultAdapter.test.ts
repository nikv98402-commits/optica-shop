import { describe, expect, it, vi } from 'vitest';
import { adaptFaceFitToEyeMap } from '../localResultAdapter';
import { localResult, readyMeasurement } from './fixtures';

describe('adaptFaceFitToEyeMap', () => {
  it('creates a technical-only result for a suitable capture', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    );
    const adapted = adaptFaceFitToEyeMap(
      readyMeasurement(),
      'upload',
      undefined,
      new Date('2026-07-20T09:00:00.000Z'),
    );

    expect(adapted).toMatchObject({
      status: 'ready',
      result: {
        source: 'upload',
        qualityStatus: 'good',
        metrics: { leftEyeVisible: true, rightEyeVisible: true },
      },
    });
    expect(JSON.stringify(adapted)).not.toMatch(/photo|data:image|name|age/i);
  });

  it.each([
    [readyMeasurement({ eyeDistanceRatio: 0.15 }), 'distance'],
    [readyMeasurement({ eyeLineTiltDeg: 12 }), 'pose'],
    [readyMeasurement({ status: 'no_face', faceCount: 0 }), 'no_face'],
  ] as const)('blocks an unsuitable capture', (measurement, reason) => {
    expect(adaptFaceFitToEyeMap(measurement, 'camera')).toEqual({
      status: 'blocked',
      reason,
    });
  });

  it('calculates repeatability only for a compatible local baseline', () => {
    const compatible = adaptFaceFitToEyeMap(
      readyMeasurement(),
      'camera',
      localResult(),
    );
    const incompatible = adaptFaceFitToEyeMap(
      readyMeasurement(),
      'camera',
      localResult({ compatibilityGroup: 'other-engine' }),
    );

    expect(compatible.status).toBe('ready');
    expect(
      compatible.status === 'ready'
        ? compatible.result.metrics.repeatabilityScore
        : undefined,
    ).toBeTypeOf('number');
    expect(incompatible.status).toBe('ready');
    expect(
      incompatible.status === 'ready'
        ? incompatible.result.metrics.repeatabilityScore
        : undefined,
    ).toBeUndefined();
  });
});
