export const EYE_MAP_SPRINT_ZERO_THRESHOLDS = {
  governedPhotoCount: 150,
  minimumPipelineSuccessPct: 90,
  minimumUsableImprovementPp: 10,
  minimumRetakeReductionPct: 20,
  maximumCohortRegressionPp: 5,
  maximumReferenceCpuP95Seconds: 30,
  minimumExplicitArtifactHandlingPct: 100,
} as const;

export interface EyeMapBenchmarkInput {
  licencesApproved: boolean;
  checksumsApproved: boolean;
  governedPhotoCount: number;
  deletionControlsVerified: boolean;
  qualityPassedImageCount: number;
  pipelineSuccessCount: number;
  baselineUsableRatePct: number;
  eyeMapUsableRatePct: number;
  baselineRetakeRatePct: number;
  eyeMapRetakeRatePct: number;
  maximumCohortRegressionPp: number;
  referenceCpuP95Seconds: number;
  peakMemoryMb: number | null;
  modelSizeMb: number | null;
  invalidArtifactCount: number;
  explicitlyHandledArtifactCount: number;
  blindedReviewComplete: boolean;
  adjudicationComplete: boolean;
  requiredApprovalsComplete: boolean;
}

export type EyeMapBenchmarkGateId =
  | 'input_integrity'
  | 'artifacts'
  | 'governance'
  | 'pipeline_success'
  | 'product_value'
  | 'cohort_safety'
  | 'performance'
  | 'resource_report'
  | 'artifact_handling'
  | 'human_review'
  | 'approvals';

export interface EyeMapBenchmarkGate {
  id: EyeMapBenchmarkGateId;
  passed: boolean;
  actual: string;
  required: string;
}

export interface EyeMapBenchmarkDecision {
  decision: 'go' | 'no-go';
  metrics: {
    pipelineSuccessPct: number;
    usableImprovementPp: number;
    retakeReductionPct: number;
    explicitArtifactHandlingPct: number;
  };
  gates: EyeMapBenchmarkGate[];
  failedGateIds: EyeMapBenchmarkGateId[];
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export function evaluateEyeMapBenchmark(
  input: EyeMapBenchmarkInput,
): EyeMapBenchmarkDecision {
  const inputIntegrityPassed =
    Number.isInteger(input.governedPhotoCount) &&
    input.governedPhotoCount >= 0 &&
    Number.isInteger(input.qualityPassedImageCount) &&
    input.qualityPassedImageCount >= 0 &&
    input.qualityPassedImageCount <= input.governedPhotoCount &&
    Number.isInteger(input.pipelineSuccessCount) &&
    input.pipelineSuccessCount >= 0 &&
    input.pipelineSuccessCount <= input.qualityPassedImageCount &&
    Number.isInteger(input.invalidArtifactCount) &&
    input.invalidArtifactCount >= 0 &&
    Number.isInteger(input.explicitlyHandledArtifactCount) &&
    input.explicitlyHandledArtifactCount >= 0 &&
    input.explicitlyHandledArtifactCount <= input.invalidArtifactCount &&
    [
      input.baselineUsableRatePct,
      input.eyeMapUsableRatePct,
      input.baselineRetakeRatePct,
      input.eyeMapRetakeRatePct,
    ].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 100,
    ) &&
    Number.isFinite(input.maximumCohortRegressionPp) &&
    input.maximumCohortRegressionPp >= 0 &&
    Number.isFinite(input.referenceCpuP95Seconds) &&
    input.referenceCpuP95Seconds >= 0;
  const pipelineSuccessPct = finiteOrZero(
    percentage(input.pipelineSuccessCount, input.qualityPassedImageCount),
  );
  const usableImprovementPp = finiteOrZero(
    input.eyeMapUsableRatePct - input.baselineUsableRatePct,
  );
  const retakeReductionPct =
    input.baselineRetakeRatePct > 0
      ? finiteOrZero(
          percentage(
            input.baselineRetakeRatePct - input.eyeMapRetakeRatePct,
            input.baselineRetakeRatePct,
          ),
        )
      : input.eyeMapRetakeRatePct === 0
        ? 0
        : -100;
  const explicitArtifactHandlingPct =
    input.invalidArtifactCount === 0
      ? 100
      : finiteOrZero(
          percentage(
            input.explicitlyHandledArtifactCount,
            input.invalidArtifactCount,
          ),
        );

  const gates: EyeMapBenchmarkGate[] = [
    {
      id: 'input_integrity',
      passed: inputIntegrityPassed,
      actual: `quality=${input.qualityPassedImageCount}, success=${input.pipelineSuccessCount}, invalid=${input.invalidArtifactCount}, handled=${input.explicitlyHandledArtifactCount}`,
      required:
        'finite percentages and non-negative counts bounded by the governed set',
    },
    {
      id: 'artifacts',
      passed: input.licencesApproved && input.checksumsApproved,
      actual: `licences=${input.licencesApproved}, checksums=${input.checksumsApproved}`,
      required: 'all licences and checksums approved',
    },
    {
      id: 'governance',
      passed:
        input.governedPhotoCount ===
          EYE_MAP_SPRINT_ZERO_THRESHOLDS.governedPhotoCount &&
        input.deletionControlsVerified,
      actual: `${input.governedPhotoCount} governed photos, deletion=${input.deletionControlsVerified}`,
      required: 'exactly 150 photos and verified deletion controls',
    },
    {
      id: 'pipeline_success',
      passed:
        input.qualityPassedImageCount > 0 &&
        pipelineSuccessPct >=
          EYE_MAP_SPRINT_ZERO_THRESHOLDS.minimumPipelineSuccessPct,
      actual: `${pipelineSuccessPct.toFixed(1)}%`,
      required: 'at least 90%',
    },
    {
      id: 'product_value',
      passed:
        usableImprovementPp >=
          EYE_MAP_SPRINT_ZERO_THRESHOLDS.minimumUsableImprovementPp ||
        retakeReductionPct >=
          EYE_MAP_SPRINT_ZERO_THRESHOLDS.minimumRetakeReductionPct,
      actual: `${usableImprovementPp.toFixed(1)} pp usable improvement, ${retakeReductionPct.toFixed(1)}% retake reduction`,
      required: 'at least +10 pp usable results or 20% fewer retakes',
    },
    {
      id: 'cohort_safety',
      passed:
        Number.isFinite(input.maximumCohortRegressionPp) &&
        input.maximumCohortRegressionPp >= 0 &&
        input.maximumCohortRegressionPp <=
          EYE_MAP_SPRINT_ZERO_THRESHOLDS.maximumCohortRegressionPp,
      actual: `${input.maximumCohortRegressionPp.toFixed(1)} pp maximum regression`,
      required: 'no unexplained regression over 5 pp',
    },
    {
      id: 'performance',
      passed:
        Number.isFinite(input.referenceCpuP95Seconds) &&
        input.referenceCpuP95Seconds >= 0 &&
        input.referenceCpuP95Seconds <=
          EYE_MAP_SPRINT_ZERO_THRESHOLDS.maximumReferenceCpuP95Seconds,
      actual: `${input.referenceCpuP95Seconds.toFixed(1)} seconds p95`,
      required: 'reference CPU p95 at most 30 seconds',
    },
    {
      id: 'resource_report',
      passed:
        input.peakMemoryMb !== null &&
        Number.isFinite(input.peakMemoryMb) &&
        input.peakMemoryMb > 0 &&
        input.modelSizeMb !== null &&
        Number.isFinite(input.modelSizeMb) &&
        input.modelSizeMb > 0,
      actual: `peakMemoryMb=${input.peakMemoryMb ?? 'missing'}, modelSizeMb=${input.modelSizeMb ?? 'missing'}`,
      required: 'positive peak memory and model size recorded',
    },
    {
      id: 'artifact_handling',
      passed:
        explicitArtifactHandlingPct >=
        EYE_MAP_SPRINT_ZERO_THRESHOLDS.minimumExplicitArtifactHandlingPct,
      actual: `${explicitArtifactHandlingPct.toFixed(1)}%`,
      required: '100% invalid artifacts handled explicitly',
    },
    {
      id: 'human_review',
      passed: input.blindedReviewComplete && input.adjudicationComplete,
      actual: `blinded=${input.blindedReviewComplete}, adjudication=${input.adjudicationComplete}`,
      required: 'two blinded reviews and adjudication complete',
    },
    {
      id: 'approvals',
      passed: input.requiredApprovalsComplete,
      actual: `complete=${input.requiredApprovalsComplete}`,
      required: 'product, engineering, privacy/legal, and medical-copy approval',
    },
  ];

  const failedGateIds = gates
    .filter((gate) => !gate.passed)
    .map((gate) => gate.id);

  return {
    decision: failedGateIds.length === 0 ? 'go' : 'no-go',
    metrics: {
      pipelineSuccessPct,
      usableImprovementPp,
      retakeReductionPct,
      explicitArtifactHandlingPct,
    },
    gates,
    failedGateIds,
  };
}
