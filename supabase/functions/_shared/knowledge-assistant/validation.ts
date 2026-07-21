import type { AssistantRequest, Preferences } from './contracts.ts';

const REQUEST_KEYS = ['query', 'locale', 'recentTurns', 'preferences'];
const PREFERENCE_KEYS = ['experience', 'interests', 'answerLength'];
const TURN_KEYS = ['role', 'content'];
const EXPERIENCES = ['beginner', 'familiar'];
const INTERESTS = ['frame_fit', 'pd_sizing', 'eye_comfort', 'visit_preparation'];
const ANSWER_LENGTHS = ['short', 'detailed'];

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function validPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const preferences = value as Record<string, unknown>;
  return hasOnlyKeys(preferences, PREFERENCE_KEYS)
    && EXPERIENCES.includes(String(preferences.experience))
    && ANSWER_LENGTHS.includes(String(preferences.answerLength))
    && Array.isArray(preferences.interests)
    && preferences.interests.length <= INTERESTS.length
    && preferences.interests.every((interest) => INTERESTS.includes(String(interest)));
}

export function validateAssistantRequest(value: unknown): AssistantRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const request = value as Record<string, unknown>;
  if (!hasOnlyKeys(request, REQUEST_KEYS)) return null;
  if (typeof request.query !== 'string') return null;
  const query = request.query.trim();
  if (query.length < 2 || query.length > 1000) return null;
  if (request.locale !== 'ru' && request.locale !== 'en') return null;
  if (!Array.isArray(request.recentTurns) || request.recentTurns.length > 6) return null;
  let turnCharacters = 0;
  for (const rawTurn of request.recentTurns) {
    if (!rawTurn || typeof rawTurn !== 'object' || Array.isArray(rawTurn)) return null;
    const turn = rawTurn as Record<string, unknown>;
    if (!hasOnlyKeys(turn, TURN_KEYS)) return null;
    if (turn.role !== 'user' && turn.role !== 'assistant') return null;
    if (typeof turn.content !== 'string' || turn.content.length < 1) return null;
    turnCharacters += turn.content.length;
  }
  if (turnCharacters > 6000 || !validPreferences(request.preferences)) return null;
  return {
    query,
    locale: request.locale,
    recentTurns: request.recentTurns as AssistantRequest['recentTurns'],
    preferences: request.preferences,
  };
}
