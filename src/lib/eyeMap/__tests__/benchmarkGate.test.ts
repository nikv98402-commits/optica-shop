import { describe, expect, it } from 'vitest';
import type { EyeMapBenchmarkInput } from '../benchmarkGate';
import { evaluateEyeMapBenchmark } from '../benchmarkGate';

function passingInput(
  overrides: Partial<EyeMapBenchmarkInput> = {},
): EyeMapBenchmarkInput {
  return {
    licencesApproved: true,
    checksumsApproved: true,
    governedPhotoCount: 150,
    deletionControlsVerified: true,
    qualityPassedImageCount: 140,
    pipelineSuccessCount: 130,
    baselineUsableRatePct: 72,
    eyeMapUsableRatePct: 83,
    baselineRetakeRatePct: 30,
    eyeMapRetakeRatePct: 22,
    maximumCohortRegressionPp: 3,
    referenceCpuP95Seconds: 25,
    peakMemoryMb: 2048,
    modelSizeMb: 350,
    invalidArtifactCount: 12,
    explicitlyHandledArtifactCount: 12,
    blindedReviewComplete: true,
    adjudicationComplete: true,
    requiredApprovalsComplete: true,
    ...overrides,
  };
}

describe('evaluateEyeMapBenchmark', () => {
  it('returns go only when every gate passes', () => {
    const result = evaluateEyeMapBenchmark(passingInput());

    expect(result.decision).toBe('go');
    expect(result.failedGateIds).toEqual([]);
    expect(result.metrics.pipelineSuccessPct).toBeCloseTo(92.86, 1);
  });

  it('allows the product-value gate through retake reduction', () => {
    const result = evaluateEyeMapBenchmark(
      passingInput({
        baselineUsableRatePct: 80,
        eyeMapUsableRatePct: 84,
        baselineRetakeRatePct: 40,
        eyeMapRetakeRatePct: 30,
      }),
    );

    expect(result.metrics.usableImprovementPp).toBe(4);
    expect(result.metrics.retakeReductionPct).toBe(25);
    expect(result.failedGateIds).not.toContain('product_value');
  });

  it('blocks a benchmark without exactly 150 governed photos', () => {
    const result = evaluateEyeMapBenchmark(
      passingInput({ governedPhotoCount: 149 }),
    );

    expect(result.decision).toBe('no-go');
    expect(result.failedGateIds).toContain('governance');
  });

  it('blocks an unexplained cohort regression over five points', () => {
    const result = evaluateEyeMapBenchmark(
      passingInput({ maximumCohortRegressionPp: 5.1 }),
    );

    expect(result.failedGateIds).toContain('cohort_safety');
  });

  it('blocks slow or incomplete artifact handling', () => {
    const result = evaluateEyeMapBenchmark(
      passingInput({
        referenceCpuP95Seconds: 30.1,
        invalidArtifactCount: 10,
        explicitlyHandledArtifactCount: 9,
      }),
    );

    expect(result.failedGateIds).toEqual(
      expect.arrayContaining(['performance', 'artifact_handling']),
    );
  });

  it('requires resource measurements and signed approvals', () => {
    const result = evaluateEyeMapBenchmark(
      passingInput({
        peakMemoryMb: null,
        modelSizeMb: null,
        requiredApprovalsComplete: false,
      }),
    );

    expect(result.failedGateIds).toEqual(
      expect.arrayContaining(['resource_report', 'approvals']),
    );
  });

  it('rejects impossible counts and percentages', () => {
    const result = evaluateEyeMapBenchmark(
      passingInput({
        qualityPassedImageCount: 10,
        pipelineSuccessCount: 11,
        baselineUsableRatePct: 101,
        invalidArtifactCount: 2,
        explicitlyHandledArtifactCount: 3,
      }),
    );

    expect(result.decision).toBe('no-go');
    expect(result.failedGateIds).toContain('input_integrity');
  });

  it('rejects a quality-passed count above the governed set', () => {
    const result = evaluateEyeMapBenchmark(
      passingInput({
        governedPhotoCount: 150,
        qualityPassedImageCount: 151,
        pipelineSuccessCount: 140,
      }),
    );

    expect(result.decision).toBe('no-go');
    expect(result.failedGateIds).toContain('input_integrity');
  });
});
