import type { AssistantPreferences, AssistantStoredTurn } from '../../types/knowledgeAssistant';

const STORAGE_KEY = 'vilu_knowledge_assistant_v1';
const SCHEMA_VERSION = 1;
const MAX_STORED_TURNS = 20;

export const defaultAssistantPreferences: AssistantPreferences = {
  experience: 'beginner',
  interests: ['frame_fit'],
  answerLength: 'short',
};

export interface AssistantLocalState {
  version: 1;
  turns: AssistantStoredTurn[];
  preferences: AssistantPreferences;
}

function emptyState(): AssistantLocalState {
  return {
    version: SCHEMA_VERSION,
    turns: [],
    preferences: { ...defaultAssistantPreferences, interests: [...defaultAssistantPreferences.interests] },
  };
}

function isValidState(value: unknown): value is AssistantLocalState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AssistantLocalState>;
  const preferences = state.preferences as Partial<AssistantPreferences> | undefined;
  return state.version === SCHEMA_VERSION
    && Array.isArray(state.turns)
    && state.turns.every((turn) => Boolean(
      turn
      && typeof turn === 'object'
      && (turn.role === 'user' || turn.role === 'assistant')
      && typeof turn.id === 'string'
      && typeof turn.content === 'string'
      && typeof turn.createdAt === 'string',
    ))
    && Boolean(preferences
      && (preferences.experience === 'beginner' || preferences.experience === 'familiar')
      && (preferences.answerLength === 'short' || preferences.answerLength === 'detailed')
      && Array.isArray(preferences.interests)
      && preferences.interests.every((interest) => ['frame_fit', 'pd_sizing', 'eye_comfort', 'visit_preparation'].includes(interest)));
}

export function readAssistantLocalState(storage: Storage = window.localStorage): AssistantLocalState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidState(parsed)) return emptyState();
    return {
      version: SCHEMA_VERSION,
      turns: parsed.turns.slice(-MAX_STORED_TURNS),
      preferences: parsed.preferences,
    };
  } catch {
    return emptyState();
  }
}

export function saveAssistantLocalState(
  state: AssistantLocalState,
  storage: Storage = window.localStorage,
) {
  const safeState: AssistantLocalState = {
    version: SCHEMA_VERSION,
    turns: state.turns.slice(-MAX_STORED_TURNS),
    preferences: state.preferences,
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(safeState));
}

export function clearAssistantLocalState(storage: Storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
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
