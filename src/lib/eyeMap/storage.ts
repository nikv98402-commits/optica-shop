import type {
  EyeMapCaptureQuality,
  EyeMapChangeBand,
  EyeMapLocalResultV1,
  EyeMapLocalStoreV1,
} from '../../types/eyeMapLocal';

export const EYE_MAP_STORAGE_KEY = 'vilu_eye_map_v1';
export const EYE_MAP_HISTORY_LIMIT = 12;

const captureQualities: EyeMapCaptureQuality[] = [
  'good',
  'acceptable',
  'retake',
];
const changeBands: EyeMapChangeBand[] = [
  'minimal',
  'moderate',
  'not_comparable',
];
const allowedResultKeys = new Set([
  'id',
  'capturedAt',
  'engineVersion',
  'modelVersion',
  'adapterVersion',
  'compatibilityGroup',
  'source',
  'qualityStatus',
  'metrics',
  'technicalVector',
  'limitations',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteIn(value: unknown, min: number, max: number) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

export function parseEyeMapLocalResult(
  value: unknown,
): EyeMapLocalResultV1 | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !allowedResultKeys.has(key)) ||
    typeof value.id !== 'string' ||
    Number.isNaN(Date.parse(String(value.capturedAt))) ||
    typeof value.engineVersion !== 'string' ||
    typeof value.modelVersion !== 'string' ||
    typeof value.adapterVersion !== 'string' ||
    typeof value.compatibilityGroup !== 'string' ||
    (value.source !== 'camera' && value.source !== 'upload') ||
    !captureQualities.includes(value.qualityStatus as EyeMapCaptureQuality) ||
    !isRecord(value.metrics) ||
    !isRecord(value.technicalVector) ||
    !Array.isArray(value.limitations) ||
    !value.limitations.every((item) => typeof item === 'string')
  ) {
    return null;
  }

  const metrics = value.metrics;
  const vector = value.technicalVector;
  const metricKeys = new Set([
    'captureQuality',
    'alignmentQuality',
    'leftEyeVisible',
    'rightEyeVisible',
    'repeatabilityScore',
    'changeFromBaseline',
  ]);
  const vectorKeys = new Set([
    'confidence',
    'eyeDistanceRatio',
    'eyeLineTiltDeg',
    'bridgeOffsetPct',
  ]);
  if (
    Object.keys(metrics).some((key) => !metricKeys.has(key)) ||
    Object.keys(vector).some((key) => !vectorKeys.has(key)) ||
    !captureQualities.includes(metrics.captureQuality as EyeMapCaptureQuality) ||
    (metrics.alignmentQuality !== 'aligned' &&
      metrics.alignmentQuality !== 'adjust') ||
    typeof metrics.leftEyeVisible !== 'boolean' ||
    typeof metrics.rightEyeVisible !== 'boolean' ||
    (metrics.repeatabilityScore !== undefined &&
      !finiteIn(metrics.repeatabilityScore, 0, 100)) ||
    (metrics.changeFromBaseline !== undefined &&
      !changeBands.includes(metrics.changeFromBaseline as EyeMapChangeBand)) ||
    !finiteIn(vector.confidence, 0, 100) ||
    !finiteIn(vector.eyeDistanceRatio, 0, 1) ||
    !finiteIn(vector.eyeLineTiltDeg, -90, 90) ||
    !finiteIn(vector.bridgeOffsetPct, -100, 100)
  ) {
    return null;
  }

  return value as unknown as EyeMapLocalResultV1;
}

export function readEyeMapStore(
  storage: Storage = window.localStorage,
): EyeMapLocalStoreV1 {
  try {
    const raw = storage.getItem(EYE_MAP_STORAGE_KEY);
    if (!raw) return { schemaVersion: 1, results: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.results)) {
      return { schemaVersion: 1, results: [] };
    }
    const results = parsed.results
      .map(parseEyeMapLocalResult)
      .filter((item): item is EyeMapLocalResultV1 => item !== null)
      .slice(0, EYE_MAP_HISTORY_LIMIT);
    const baselineId =
      typeof parsed.baselineId === 'string' &&
      results.some((item) => item.id === parsed.baselineId)
        ? parsed.baselineId
        : undefined;
    return { schemaVersion: 1, baselineId, results };
  } catch {
    return { schemaVersion: 1, results: [] };
  }
}

export function saveEyeMapResult(
  result: EyeMapLocalResultV1,
  storage: Storage = window.localStorage,
) {
  const current = readEyeMapStore(storage);
  // Always validate, deduplicate, trim, then write a strict envelope.
  const clean = parseEyeMapLocalResult(result);
  if (!clean) throw new Error('Invalid Eye Map result');
  const candidates = [
    clean,
    ...current.results.filter((item) => item.id !== clean.id),
  ];
  const baselineId = current.baselineId ?? clean.id;
  const baseline = candidates.find((item) => item.id === baselineId);
  const recent = candidates
    .filter((item) => item.id !== baselineId)
    .slice(0, EYE_MAP_HISTORY_LIMIT - 1);
  const results = baseline
    ? [...recent, baseline]
    : candidates.slice(0, EYE_MAP_HISTORY_LIMIT);
  const next: EyeMapLocalStoreV1 = {
    schemaVersion: 1,
    baselineId: baseline?.id ?? results[0]?.id,
    results,
  };
  storage.setItem(EYE_MAP_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearEyeMapHistory(
  storage: Storage = window.localStorage,
) {
  storage.removeItem(EYE_MAP_STORAGE_KEY);
}
