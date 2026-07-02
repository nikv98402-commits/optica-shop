import type { EyeCheckResult, StoredEyeCheckResult } from '../types/eyeCheck';

const STORAGE_KEY = 'vilu_eye_check_results';

export function readEyeCheckResults(): StoredEyeCheckResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredEyeCheckResult[] : [];
  } catch {
    return [];
  }
}

export function saveEyeCheckResult(result: EyeCheckResult) {
  const summary: StoredEyeCheckResult = {
    flowId: result.flowId,
    riskLevel: result.riskLevel,
    createdAt: new Date().toISOString(),
    totalScore: result.totalScore,
    recommendedActions: result.recommendedActions,
  };

  const current = readEyeCheckResults();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([summary, ...current].slice(0, 8)));
  return summary;
}

export function clearEyeCheckResults() {
  localStorage.removeItem(STORAGE_KEY);
}
