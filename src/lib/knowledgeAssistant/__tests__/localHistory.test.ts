import { describe, expect, it } from 'vitest';
import {
  clearAssistantLocalState,
  defaultAssistantPreferences,
  readAssistantLocalState,
  saveAssistantLocalState,
  toBoundedRecentTurns,
} from '../localHistory';

describe('Knowledge Assistant local state', () => {
  it('falls back safely from malformed or old state', () => {
    localStorage.setItem('vilu_knowledge_assistant_v2', JSON.stringify({ version: 0, turns: ['unsafe'] }));
    expect(readAssistantLocalState('ru')).toEqual({ version: 3, locale: 'ru', turns: [], preferences: defaultAssistantPreferences });
    expect(localStorage.getItem('vilu_knowledge_assistant_v2')).toBeNull();
  });

  it('fails closed for legacy turns while preserving valid shared preferences', () => {
    const preferences = { ...defaultAssistantPreferences, experience: 'familiar' as const };
    localStorage.setItem('vilu_knowledge_assistant_v1', JSON.stringify({
      version: 1,
      turns: [{ id: 'legacy', role: 'user', content: 'Старый вопрос', createdAt: new Date().toISOString() }],
      preferences,
    }));

    expect(readAssistantLocalState('en')).toEqual({ version: 3, locale: 'en', turns: [], preferences });
    expect(localStorage.getItem('vilu_knowledge_assistant_v1')).toBeNull();
  });

  it('stores RU and EN turns independently while sharing preferences', () => {
    const preferences = { ...defaultAssistantPreferences, answerLength: 'detailed' as const };
    const createdAt = new Date().toISOString();
    saveAssistantLocalState({
      version: 3, locale: 'ru', preferences,
      turns: [{ id: 'ru', role: 'user', content: 'Русский вопрос', createdAt }],
    });
    saveAssistantLocalState({
      version: 3, locale: 'en', preferences,
      turns: [{ id: 'en', role: 'user', content: 'English question', createdAt }],
    });

    expect(readAssistantLocalState('ru').turns[0]?.content).toBe('Русский вопрос');
    expect(readAssistantLocalState('en').turns[0]?.content).toBe('English question');
    expect(readAssistantLocalState('ru').preferences).toEqual(preferences);
    expect(readAssistantLocalState('en').preferences).toEqual(preferences);
  });

  it('stores at most 20 turns and clears only the active locale history', () => {
    const turns = Array.from({ length: 25 }, (_, index) => ({
      id: String(index), role: 'user' as const, content: `turn-${index}`, createdAt: new Date().toISOString(),
    }));
    saveAssistantLocalState({ version: 3, locale: 'ru', turns, preferences: defaultAssistantPreferences });
    saveAssistantLocalState({ version: 3, locale: 'en', turns: turns.slice(0, 1), preferences: defaultAssistantPreferences });
    expect(readAssistantLocalState('ru').turns).toHaveLength(20);
    clearAssistantLocalState('ru');
    expect(readAssistantLocalState('ru').turns).toEqual([]);
    expect(readAssistantLocalState('en').turns).toHaveLength(1);
    expect(readAssistantLocalState('ru').preferences).toEqual(defaultAssistantPreferences);
  });

  it('bounds server context to six turns and 6000 characters', () => {
    const turns = Array.from({ length: 8 }, (_, index) => ({
      id: String(index), role: 'user' as const, content: 'x'.repeat(1100), createdAt: new Date().toISOString(),
    }));
    const bounded = toBoundedRecentTurns(turns);
    expect(bounded.length).toBeLessThanOrEqual(6);
    expect(bounded.reduce((sum, turn) => sum + turn.content.length, 0)).toBeLessThanOrEqual(6000);
  });
});
