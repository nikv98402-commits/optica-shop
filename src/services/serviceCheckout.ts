import type {
  ServiceCheckoutDraft,
  ServiceCheckoutAttempt,
  ServiceCheckoutFrame,
  ServiceCheckoutSource,
  ServiceCheckoutStorePreference,
} from '../types/backend';

export const SERVICE_CHECKOUT_STORAGE_KEY = 'vilu_service_checkout_draft_v1';
export const SERVICE_CHECKOUT_ATTEMPT_STORAGE_KEY = 'vilu_service_checkout_attempt_v1';
export const SERVICE_CHECKOUT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const SERVICE_CHECKOUT_MAX_FRAMES = 3;

const DRAFT_KEYS = new Set([
  'version',
  'sourcePage',
  'selectedFrames',
  'storePreference',
  'createdAt',
]);

const FRAME_KEYS = new Set([
  'frameId',
  'frameName',
  'frameBrand',
  'frameCategory',
  'frameSize',
  'framePriceRub',
  'fitScore',
  'useCase',
  'imageUrl',
]);

const STORE_PREFERENCE_KEYS = new Set([
  'mode',
  'city',
  'storeId',
  'storeName',
]);

function hasOnlyKeys(value: Record<string, unknown>, keys: Set<string>) {
  return Object.keys(value).every((key) => keys.has(key));
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string';
}

function isOptionalNumber(value: unknown) {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isFrame(value: unknown): value is ServiceCheckoutFrame {
  if (!value || typeof value !== 'object') return false;
  const frame = value as Record<string, unknown>;
  return hasOnlyKeys(frame, FRAME_KEYS)
    && typeof frame.frameId === 'string'
    && frame.frameId.length > 0
    && typeof frame.frameName === 'string'
    && frame.frameName.length > 0
    && isOptionalString(frame.frameBrand)
    && isOptionalString(frame.frameCategory)
    && isOptionalString(frame.frameSize)
    && isOptionalNumber(frame.framePriceRub)
    && isOptionalNumber(frame.fitScore)
    && isOptionalString(frame.useCase)
    && isOptionalString(frame.imageUrl);
}

function isStorePreference(value: unknown): value is ServiceCheckoutStorePreference {
  if (!value || typeof value !== 'object') return false;
  const preference = value as Record<string, unknown>;
  if (!hasOnlyKeys(preference, STORE_PREFERENCE_KEYS)) return false;
  if (preference.mode === 'later') return true;
  if (preference.mode === 'city') return typeof preference.city === 'string' && preference.city.length > 0;
  return preference.mode === 'store'
    && typeof preference.city === 'string'
    && preference.city.length > 0
    && typeof preference.storeId === 'string'
    && preference.storeId.length > 0
    && typeof preference.storeName === 'string'
    && preference.storeName.length > 0;
}

export function normalizeServiceCheckoutFrames(frames: ServiceCheckoutFrame[]) {
  const uniqueFrames = new Map<string, ServiceCheckoutFrame>();
  for (const frame of frames) {
    if (!isFrame(frame) || uniqueFrames.has(frame.frameId)) continue;
    uniqueFrames.set(frame.frameId, { ...frame });
    if (uniqueFrames.size === SERVICE_CHECKOUT_MAX_FRAMES) break;
  }
  return Array.from(uniqueFrames.values());
}

export function createServiceCheckoutDraft(
  sourcePage: ServiceCheckoutSource,
  frames: ServiceCheckoutFrame[],
  storePreference: ServiceCheckoutStorePreference = { mode: 'later' },
): ServiceCheckoutDraft {
  return {
    version: 1,
    sourcePage,
    selectedFrames: normalizeServiceCheckoutFrames(frames),
    storePreference,
    createdAt: new Date().toISOString(),
  };
}

export function isServiceCheckoutDraft(value: unknown, now = Date.now()): value is ServiceCheckoutDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  if (Object.keys(draft).some((key) => !DRAFT_KEYS.has(key))) return false;
  if (draft.version !== 1 || (draft.sourcePage !== '/products' && draft.sourcePage !== '/tryon')) return false;
  if (!Array.isArray(draft.selectedFrames) || draft.selectedFrames.length < 1 || draft.selectedFrames.length > SERVICE_CHECKOUT_MAX_FRAMES) return false;
  if (!draft.selectedFrames.every(isFrame) || !isStorePreference(draft.storePreference)) return false;
  if (typeof draft.createdAt !== 'string') return false;
  const createdAt = Date.parse(draft.createdAt);
  return Number.isFinite(createdAt) && createdAt <= now && now - createdAt <= SERVICE_CHECKOUT_MAX_AGE_MS;
}

export function saveServiceCheckoutDraft(draft: ServiceCheckoutDraft) {
  if (!isServiceCheckoutDraft(draft)) return false;
  try {
    window.localStorage.setItem(SERVICE_CHECKOUT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function readServiceCheckoutDraft(): ServiceCheckoutDraft | null {
  try {
    const raw = window.localStorage.getItem(SERVICE_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isServiceCheckoutDraft(parsed)) return parsed;
    window.localStorage.removeItem(SERVICE_CHECKOUT_STORAGE_KEY);
    return null;
  } catch {
    try {
      window.localStorage.removeItem(SERVICE_CHECKOUT_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in privacy mode; checkout still works in memory.
    }
    return null;
  }
}

export function clearServiceCheckoutDraft() {
  try {
    window.localStorage.removeItem(SERVICE_CHECKOUT_STORAGE_KEY);
  } catch {
    // The in-memory checkout remains usable when storage is unavailable.
  }
}

function isServiceCheckoutAttempt(value: unknown, draftCreatedAt: string): value is ServiceCheckoutAttempt {
  if (!value || typeof value !== 'object') return false;
  const attempt = value as Record<string, unknown>;
  return attempt.version === 1
    && attempt.draftCreatedAt === draftCreatedAt
    && typeof attempt.leadId === 'string'
    && attempt.leadId.length > 0
    && typeof attempt.paymentCapabilityToken === 'string'
    && attempt.paymentCapabilityToken.length > 0
    && typeof attempt.idempotencyKey === 'string'
    && attempt.idempotencyKey.length > 0
    && Object.keys(attempt).every((key) => [
      'version',
      'draftCreatedAt',
      'leadId',
      'paymentCapabilityToken',
      'idempotencyKey',
    ].includes(key));
}

export function saveServiceCheckoutAttempt(attempt: ServiceCheckoutAttempt) {
  if (!isServiceCheckoutAttempt(attempt, attempt.draftCreatedAt)) return false;
  try {
    window.sessionStorage.setItem(SERVICE_CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt));
    return true;
  } catch {
    return false;
  }
}

export function readServiceCheckoutAttempt(draftCreatedAt: string): ServiceCheckoutAttempt | null {
  try {
    const raw = window.sessionStorage.getItem(SERVICE_CHECKOUT_ATTEMPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isServiceCheckoutAttempt(parsed, draftCreatedAt)) return parsed;
    window.sessionStorage.removeItem(SERVICE_CHECKOUT_ATTEMPT_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function clearServiceCheckoutAttempt() {
  try {
    window.sessionStorage.removeItem(SERVICE_CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // The current in-memory attempt remains safe when storage is unavailable.
  }
}

export function renewServiceCheckoutPaymentAttempt(draftCreatedAt: string, idempotencyKey: string) {
  const attempt = readServiceCheckoutAttempt(draftCreatedAt);
  if (!attempt || !idempotencyKey) return false;
  return saveServiceCheckoutAttempt({ ...attempt, idempotencyKey });
}
