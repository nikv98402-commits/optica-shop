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
    localStorage.setItem('vilu_knowledge_assistant_v1', JSON.stringify({ version: 0, turns: ['unsafe'] }));
    expect(readAssistantLocalState()).toEqual({ version: 1, turns: [], preferences: defaultAssistantPreferences });
  });

  it('stores at most 20 turns and clears all assistant state', () => {
    const turns = Array.from({ length: 25 }, (_, index) => ({
      id: String(index), role: 'user' as const, content: `turn-${index}`, createdAt: new Date().toISOString(),
    }));
    saveAssistantLocalState({ version: 1, turns, preferences: defaultAssistantPreferences });
    expect(readAssistantLocalState().turns).toHaveLength(20);
    clearAssistantLocalState();
    expect(readAssistantLocalState().turns).toEqual([]);
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
