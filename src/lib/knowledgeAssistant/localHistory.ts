import type { Language } from '../../i18n/translations';
import type { AssistantPreferences, AssistantStoredTurn } from '../../types/knowledgeAssistant';

const HISTORY_STORAGE_PREFIX = 'vilu_knowledge_assistant_history_v3_';
const PREFERENCES_STORAGE_KEY = 'vilu_knowledge_assistant_preferences_v3';
const LEGACY_STORAGE_KEYS = ['vilu_knowledge_assistant_v1', 'vilu_knowledge_assistant_v2'] as const;
const SCHEMA_VERSION = 3;
const MAX_STORED_TURNS = 20;

export const defaultAssistantPreferences: AssistantPreferences = {
  experience: 'beginner',
  interests: ['frame_fit'],
  answerLength: 'short',
};

export interface AssistantLocalState {
  version: 3;
  locale: Language;
  turns: AssistantStoredTurn[];
  preferences: AssistantPreferences;
}

interface StoredHistory {
  version: 3;
  locale: Language;
  turns: AssistantStoredTurn[];
}

interface StoredPreferences {
  version: 3;
  preferences: AssistantPreferences;
}

const historyStorageKey = (locale: Language) => `${HISTORY_STORAGE_PREFIX}${locale}`;

function emptyState(locale: Language, preferences = defaultAssistantPreferences): AssistantLocalState {
  return {
    version: SCHEMA_VERSION,
    locale,
    turns: [],
    preferences: { ...preferences, interests: [...preferences.interests] },
  };
}

function isValidPreferences(value: unknown): value is AssistantPreferences {
  if (!value || typeof value !== 'object') return false;
  const preferences = value as Partial<AssistantPreferences>;
  return (preferences.experience === 'beginner' || preferences.experience === 'familiar')
    && (preferences.answerLength === 'short' || preferences.answerLength === 'detailed')
    && Array.isArray(preferences.interests)
    && preferences.interests.every((interest) => ['frame_fit', 'pd_sizing', 'eye_comfort', 'visit_preparation'].includes(interest));
}

function hasValidTurns(value: unknown): value is AssistantStoredTurn[] {
  return Array.isArray(value)
    && value.every((turn) => Boolean(
      turn
      && typeof turn === 'object'
      && (turn.role === 'user' || turn.role === 'assistant')
      && typeof turn.id === 'string'
      && typeof turn.content === 'string'
      && typeof turn.createdAt === 'string',
    ));
}

function isValidHistory(value: unknown, locale: Language): value is StoredHistory {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<StoredHistory>;
  return state.version === SCHEMA_VERSION
    && state.locale === locale
    && hasValidTurns(state.turns);
}

function readPreferences(storage: Storage): AssistantPreferences {
  const storedPreferences = storage.getItem(PREFERENCES_STORAGE_KEY);
  if (storedPreferences) {
    try {
      const parsed = JSON.parse(storedPreferences) as Partial<StoredPreferences>;
      if (parsed.version === SCHEMA_VERSION && isValidPreferences(parsed.preferences)) {
        return parsed.preferences;
      }
    } catch {
      // Invalid settings fail closed to the defaults below.
    }
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { preferences?: unknown };
      if (isValidPreferences(parsed.preferences)) return parsed.preferences;
    } catch {
      // Legacy turns are never restored; keep looking only for valid preferences.
    }
  }

  return defaultAssistantPreferences;
}

function removeLegacyState(storage: Storage) {
  LEGACY_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
}

export function readAssistantLocalState(
  locale: Language,
  storage: Storage = window.localStorage,
): AssistantLocalState {
  try {
    const preferences = readPreferences(storage);
    const raw = storage.getItem(historyStorageKey(locale));
    removeLegacyState(storage);
    if (!raw) return emptyState(locale, preferences);
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidHistory(parsed, locale)) return emptyState(locale, preferences);
    return {
      version: SCHEMA_VERSION,
      locale,
      turns: parsed.turns.slice(-MAX_STORED_TURNS),
      preferences,
    };
  } catch {
    return emptyState(locale);
  }
}

export function saveAssistantLocalState(
  state: AssistantLocalState,
  storage: Storage = window.localStorage,
) {
  const safeHistory: StoredHistory = {
    version: SCHEMA_VERSION,
    locale: state.locale,
    turns: state.turns.slice(-MAX_STORED_TURNS),
  };
  const safePreferences: StoredPreferences = {
    version: SCHEMA_VERSION,
    preferences: state.preferences,
  };
  storage.setItem(historyStorageKey(state.locale), JSON.stringify(safeHistory));
  storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(safePreferences));
  removeLegacyState(storage);
}

export function clearAssistantLocalState(
  locale: Language,
  storage: Storage = window.localStorage,
) {
  storage.removeItem(historyStorageKey(locale));
  removeLegacyState(storage);
}

export function toBoundedRecentTurns(turns: AssistantStoredTurn[]) {
  let characterCount = 0;
  return turns
    .slice(-6)
    .reverse()
    .filter((turn) => {
      const nextCount = characterCount + turn.content.length;
      if (nextCount > 6000) return false;
      characterCount = nextCount;
      return true;
    })
    .reverse()
    .map(({ role, content }) => ({ role, content }));
}
