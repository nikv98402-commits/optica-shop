import type { Language } from '../../i18n/translations';
import type { AssistantPreferences, AssistantStoredTurn } from '../../types/knowledgeAssistant';

const STORAGE_KEY = 'vilu_knowledge_assistant_v2';
const LEGACY_STORAGE_KEY = 'vilu_knowledge_assistant_v1';
const SCHEMA_VERSION = 2;
const MAX_STORED_TURNS = 20;

export const defaultAssistantPreferences: AssistantPreferences = {
  experience: 'beginner',
  interests: ['frame_fit'],
  answerLength: 'short',
};

export interface AssistantLocalState {
  version: 2;
  locale: Language;
  turns: AssistantStoredTurn[];
  preferences: AssistantPreferences;
}

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

function isValidState(value: unknown): value is AssistantLocalState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AssistantLocalState>;
  return state.version === SCHEMA_VERSION
    && (state.locale === 'ru' || state.locale === 'en')
    && hasValidTurns(state.turns)
    && isValidPreferences(state.preferences);
}

function readLegacyPreferences(storage: Storage): AssistantPreferences | null {
  try {
    const raw = storage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { preferences?: unknown };
    return isValidPreferences(parsed?.preferences) ? parsed.preferences : null;
  } catch {
    return null;
  }
}

export function readAssistantLocalState(
  locale: Language,
  storage: Storage = window.localStorage,
): AssistantLocalState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState(locale, readLegacyPreferences(storage) ?? defaultAssistantPreferences);
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidState(parsed)) return emptyState(locale);
    if (parsed.locale !== locale) return emptyState(locale, parsed.preferences);
    return {
      version: SCHEMA_VERSION,
      locale,
      turns: parsed.turns.slice(-MAX_STORED_TURNS),
      preferences: parsed.preferences,
    };
  } catch {
    return emptyState(locale);
  }
}

export function saveAssistantLocalState(
  state: AssistantLocalState,
  storage: Storage = window.localStorage,
) {
  const safeState: AssistantLocalState = {
    version: SCHEMA_VERSION,
    locale: state.locale,
    turns: state.turns.slice(-MAX_STORED_TURNS),
    preferences: state.preferences,
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  storage.removeItem(LEGACY_STORAGE_KEY);
}

export function clearAssistantLocalState(storage: Storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LEGACY_STORAGE_KEY);
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
