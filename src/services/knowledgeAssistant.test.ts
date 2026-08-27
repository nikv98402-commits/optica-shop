import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssistantRequest } from '../types/knowledgeAssistant';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { functions: { invoke: mocks.invoke } },
}));

import { askKnowledgeAssistant, AssistantServiceError } from './knowledgeAssistant';

const request: AssistantRequest = {
  query: 'Что значит 52-18-140?',
  locale: 'ru',
  recentTurns: [],
  preferences: { experience: 'beginner', interests: ['pd_sizing'], answerLength: 'short' },
};

describe('knowledge assistant client deadline', () => {
  beforeEach(() => mocks.invoke.mockReset());

  it('aborts the Edge Function transport so it cannot publish a late response', async () => {
    let transportSignal: AbortSignal | undefined;
    let abortObserved = false;
    mocks.invoke.mockImplementationOnce((_name, options) => {
      transportSignal = options.signal;
      return new Promise((_resolve, reject) => {
        transportSignal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
          queueMicrotask(() => { abortObserved = true; });
        }, { once: true });
      });
    });

    const response = askKnowledgeAssistant(request, 5);
    await expect(response).rejects.toEqual(new AssistantServiceError('network_error'));
    await Promise.resolve();
    expect(transportSignal).toBeInstanceOf(AbortSignal);
    expect(transportSignal?.aborted).toBe(true);
    expect(abortObserved).toBe(true);
  });
});
