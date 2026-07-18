import type {
  EyeMapInferenceFailureCode,
  EyeMapInferenceResult,
  EyeMapStructure,
  EyeMapStructureName,
  EyeMapStructures,
} from '../../types/eyeMap';

const STRUCTURE_NAMES = [
  'left_eye',
  'right_eye',
  'left_iris',
  'right_iris',
  'left_brow',
  'right_brow',
  'periorbital_mask',
] as const satisfies readonly EyeMapStructureName[];

const FAILURE_CODES = [
  'missing_required_structure',
  'mask_sanity_failed',
  'unsupported_image',
  'model_unavailable',
  'schema_incompatible',
  'consent_revoked',
] as const satisfies readonly EyeMapInferenceFailureCode[];

const REQUIRED_SUCCESS_STRUCTURES = ['left_iris', 'right_iris'] as const;

export type EyeMapContractValidation =
  | { valid: true; value: EyeMapInferenceResult }
  | { valid: false; issues: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isNonEmptyString(item))
  );
}

function isStructureName(value: unknown): value is EyeMapStructureName {
  return (
    typeof value === 'string' &&
    STRUCTURE_NAMES.includes(value as EyeMapStructureName)
  );
}

function parseStructure(
  name: EyeMapStructureName,
  value: unknown,
  issues: string[],
): EyeMapStructure | null {
  if (!isRecord(value)) {
    issues.push(`structures.${name} must be an object`);
    return null;
  }

  const confidence = value.confidence;
  if (
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 100
  ) {
    issues.push(`structures.${name}.confidence must be finite and between 0 and 100`);
  }

  const normalizedArea = value.normalizedArea;
  if (
    normalizedArea !== undefined &&
    (typeof normalizedArea !== 'number' ||
      !Number.isFinite(normalizedArea) ||
      normalizedArea <= 0 ||
      normalizedArea > 1)
  ) {
    issues.push(`structures.${name}.normalizedArea must be greater than 0 and at most 1`);
  }

  const points = value.points;
  if (points !== undefined) {
    if (!Array.isArray(points) || points.length === 0) {
      issues.push(`structures.${name}.points must be a non-empty array when present`);
    } else {
      points.forEach((point, index) => {
        if (
          !isRecord(point) ||
          typeof point.x !== 'number' ||
          typeof point.y !== 'number' ||
          !Number.isFinite(point.x) ||
          !Number.isFinite(point.y) ||
          point.x < 0 ||
          point.x > 1 ||
          point.y < 0 ||
          point.y > 1
        ) {
          issues.push(
            `structures.${name}.points[${index}] must contain normalized finite coordinates`,
          );
        }
      });
    }
  }

  if (issues.length > 0) {
    return null;
  }

  return value as unknown as EyeMapStructure;
}

function parseStructures(
  value: unknown,
  issues: string[],
): EyeMapStructures | null {
  if (!isRecord(value)) {
    issues.push('structures must be an object');
    return null;
  }

  const unknownNames = Object.keys(value).filter(
    (name) => !isStructureName(name),
  );
  unknownNames.forEach((name) => {
    issues.push(`structures.${name} is not supported by schema version 1`);
  });

  const structures: EyeMapStructures = {};
  for (const name of STRUCTURE_NAMES) {
    if (value[name] !== undefined) {
      const structureIssues: string[] = [];
      const structure = parseStructure(name, value[name], structureIssues);
      issues.push(...structureIssues);
      if (structure) {
        structures[name] = structure;
      }
    }
  }

  if (Object.keys(structures).length === 0) {
    issues.push('structures must contain at least one valid structure');
  }

  return issues.length === 0 ? structures : null;
}

export function validateEyeMapInferenceResult(
  input: unknown,
): EyeMapContractValidation {
  const issues: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, issues: ['result must be an object'] };
  }

  if (!isNonEmptyString(input.modelVersion)) {
    issues.push('modelVersion is required');
  }
  if (!isNonEmptyString(input.artifactChecksum)) {
    issues.push('artifactChecksum is required');
  }
  if (input.schemaVersion !== 1) {
    issues.push('schemaVersion must equal 1');
  }

  if (!['success', 'partial', 'failure'].includes(String(input.status))) {
    issues.push('status must be success, partial, or failure');
    return { valid: false, issues };
  }

  if (input.status === 'failure') {
    if (
      typeof input.code !== 'string' ||
      !FAILURE_CODES.includes(input.code as EyeMapInferenceFailureCode)
    ) {
      issues.push('failure code is not supported');
    }
    if (typeof input.retryable !== 'boolean') {
      issues.push('retryable must be boolean');
    }
    if ('structures' in input) {
      issues.push('failure result must not contain structures');
    }

    return issues.length === 0
      ? { valid: true, value: input as unknown as EyeMapInferenceResult }
      : { valid: false, issues };
  }

  const structures = parseStructures(input.structures, issues);
  if (!isStringArray(input.limitations)) {
    issues.push('limitations must be an array of non-empty strings');
  }

  if (input.status === 'success' && structures) {
    REQUIRED_SUCCESS_STRUCTURES.forEach((name) => {
      if (!structures[name]) {
        issues.push(`success result requires structures.${name}`);
      }
    });
    if ('missing' in input) {
      issues.push('success result must not contain missing structures');
    }
  }

  if (input.status === 'partial') {
    if (
      !Array.isArray(input.missing) ||
      input.missing.length === 0 ||
      !input.missing.every(isStructureName)
    ) {
      issues.push('partial result requires a non-empty list of missing structures');
    } else if (structures) {
      input.missing.forEach((name) => {
        if (structures[name]) {
          issues.push(`partial result cannot both include and miss structures.${name}`);
        }
      });
    }
  }

  return issues.length === 0
    ? { valid: true, value: input as unknown as EyeMapInferenceResult }
    : { valid: false, issues };
}
