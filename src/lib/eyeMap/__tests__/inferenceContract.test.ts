import { describe, expect, it } from 'vitest';
import { validateEyeMapInferenceResult } from '../inferenceContract';

const metadata = {
  modelVersion: 'eye-map-spike-1',
  artifactChecksum: 'sha256:abc123',
  schemaVersion: 1 as const,
};

const iris = {
  confidence: 96,
  normalizedArea: 0.02,
  points: [{ x: 0.4, y: 0.5 }],
};

describe('validateEyeMapInferenceResult', () => {
  it('accepts a full result with both irises', () => {
    const result = validateEyeMapInferenceResult({
      ...metadata,
      status: 'success',
      structures: {
        left_iris: iris,
        right_iris: { ...iris, points: [{ x: 0.6, y: 0.5 }] },
      },
      limitations: [],
    });

    expect(result.valid).toBe(true);
  });

  it('rejects success when a required iris is absent', () => {
    const result = validateEyeMapInferenceResult({
      ...metadata,
      status: 'success',
      structures: { left_iris: iris },
      limitations: [],
    });

    expect(result).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        'success result requires structures.right_iris',
      ]),
    });
  });

  it('accepts an explicit partial result', () => {
    const result = validateEyeMapInferenceResult({
      ...metadata,
      status: 'partial',
      structures: { left_iris: iris },
      missing: ['right_iris'],
      limitations: ['Right iris was not visible.'],
    });

    expect(result.valid).toBe(true);
  });

  it('rejects a partial result that marks a returned structure as missing', () => {
    const result = validateEyeMapInferenceResult({
      ...metadata,
      status: 'partial',
      structures: { left_iris: iris },
      missing: ['left_iris'],
      limitations: ['Retake required.'],
    });

    expect(result).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        'partial result cannot both include and miss structures.left_iris',
      ]),
    });
  });

  it('rejects zero-area and non-finite artifacts', () => {
    const result = validateEyeMapInferenceResult({
      ...metadata,
      status: 'partial',
      structures: {
        left_iris: {
          confidence: Number.NaN,
          normalizedArea: 0,
          points: [],
        },
      },
      missing: ['right_iris'],
      limitations: ['Invalid segmentation.'],
    });

    expect(result).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        'structures.left_iris.confidence must be finite and between 0 and 100',
        'structures.left_iris.normalizedArea must be greater than 0 and at most 1',
        'structures.left_iris.points must be a non-empty array when present',
      ]),
    });
  });

  it('accepts an explicit failure without structures', () => {
    const result = validateEyeMapInferenceResult({
      ...metadata,
      status: 'failure',
      code: 'missing_required_structure',
      retryable: true,
    });

    expect(result.valid).toBe(true);
  });

  it('rejects failure payloads that smuggle valid-looking structures', () => {
    const result = validateEyeMapInferenceResult({
      ...metadata,
      status: 'failure',
      code: 'model_unavailable',
      retryable: true,
      structures: { left_iris: iris },
    });

    expect(result).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        'failure result must not contain structures',
      ]),
    });
  });
});
