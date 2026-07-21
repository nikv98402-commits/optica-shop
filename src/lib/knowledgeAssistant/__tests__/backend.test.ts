import { describe, expect, it, vi } from 'vitest';
import { buildSupportedResponse, CitationValidationError } from '../../../../supabase/functions/_shared/knowledge-assistant/citations';
import type { AssistantRequest, RetrievedChunk } from '../../../../supabase/functions/_shared/knowledge-assistant/contracts';
import { answerKnowledgeQuestion } from '../../../../supabase/functions/_shared/knowledge-assistant/orchestrator';
import { isDisallowedQuery, isUrgentQuery } from '../../../../supabase/functions/_shared/knowledge-assistant/safety';
import { validateAssistantRequest } from '../../../../supabase/functions/_shared/knowledge-assistant/validation';
import { OpenAICompatibleEmbeddingProvider, ProviderError } from '../../../../supabase/functions/_shared/knowledge-assistant/providers';

const request: AssistantRequest = {
  query: 'Что значит 52-18-140?', locale: 'ru', recentTurns: [],
  preferences: { experience: 'beginner', interests: ['pd_sizing'], answerLength: 'short' },
};
const chunk: RetrievedChunk = {
  chunkId: 'chunk-1', sourceId: 'source-1', sourceSlug: 'size', title: 'Размер оправы',
  url: 'https://vilu.store/kak-vybrat-razmer-opravy', publisher: 'ViLu', licenseCode: 'vilu-owned',
  locale: 'ru', content: '52 is lens width.', similarity: 0.9,
};

describe('assistant request and safety boundary', () => {
  it('trims valid requests and rejects unknown fields', () => {
    expect(validateAssistantRequest({ ...request, query: '  valid  ' })?.query).toBe('valid');
    expect(validateAssistantRequest({ ...request, privateProfile: 'no' })).toBeNull();
  });

  it('rejects out-of-bounds turns and preference enums', () => {
    expect(validateAssistantRequest({ ...request, recentTurns: Array(7).fill({ role: 'user', content: 'x' }) })).toBeNull();
    expect(validateAssistantRequest({ ...request, preferences: { ...request.preferences, experience: 'expert' } })).toBeNull();
  });

  it.each(['внезапная потеря зрения', 'сильная боль в глазу', 'sudden vision loss', 'severe eye pain'])(
    'recognizes urgent RU/EN language: %s', (query) => expect(isUrgentQuery(query)).toBe(true),
  );

  it.each([
    'поставь диагноз по фото',
    'расшифруй мой рецепт SPH и CYL',
    'назначь капли и дозировку',
    'diagnose this eye photo',
    'interpret my prescription',
    'recommend medication and dosage',
  ])('recognizes disallowed RU/EN requests: %s', (query) => {
    expect(isDisallowedQuery(query)).toBe(true);
  });

  it('normalizes provider transport failures without leaking the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('provider details', { status: 503 })));
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://provider.invalid', apiKey: 'test-only', model: 'multilingual-test',
    });
    await expect(provider.embed('safe query')).rejects.toMatchObject({ code: 'unavailable' } satisfies Partial<ProviderError>);
    vi.unstubAllGlobals();
  });
});

describe('citation and orchestration contract', () => {
  it('renders numbered citations from the retrieved set', () => {
    const response = buildSupportedResponse({ claims: [{ text: '52 is lens width.', sourceIds: ['source-1'] }] }, [chunk], 'en');
    expect(response.answer).toContain('[1]');
    expect(response.citations[0].id).toBe('source-1');
  });

  it('rejects unknown and missing citations', () => {
    expect(() => buildSupportedResponse({ claims: [{ text: 'Claim', sourceIds: ['fake'] }] }, [chunk], 'en')).toThrow(CitationValidationError);
    expect(() => buildSupportedResponse({ claims: [{ text: 'Claim', sourceIds: [] }] }, [chunk], 'en')).toThrow(CitationValidationError);
  });

  it('rejects oversized or excessive model claims', () => {
    expect(() => buildSupportedResponse({
      claims: [{ text: 'x'.repeat(1201), sourceIds: ['source-1'] }],
    }, [chunk], 'en')).toThrow(CitationValidationError);
    expect(() => buildSupportedResponse({
      claims: Array.from({ length: 9 }, (_, index) => ({ text: `Claim ${index}`, sourceIds: ['source-1'] })),
    }, [chunk], 'en')).toThrow(CitationValidationError);
  });

  it('returns a supported RU answer through mocked providers', async () => {
    const complete = vi.fn().mockResolvedValue({ claims: [{ text: '52 — ширина линзы.', sourceIds: ['source-1'] }] });
    const result = await answerKnowledgeQuestion(request, {
      embeddingProvider: { embed: vi.fn().mockResolvedValue(Array(1024).fill(0)) },
      retriever: { retrieve: vi.fn().mockResolvedValue([chunk]) }, chatProvider: { complete },
    });
    expect(result.confidence).toBe('supported');
    expect(complete).toHaveBeenCalledOnce();
  });

  it('supports an English request with the multilingual retrieval contract', async () => {
    const result = await answerKnowledgeQuestion({ ...request, query: 'What does 52-18-140 mean?', locale: 'en' }, {
      embeddingProvider: { embed: vi.fn().mockResolvedValue(Array(1024).fill(0)) },
      retriever: { retrieve: vi.fn().mockResolvedValue([chunk]) },
      chatProvider: { complete: vi.fn().mockResolvedValue({ claims: [{ text: '52 is lens width.', sourceIds: ['source-1'] }] }) },
    });
    expect(result.answer).toContain('52 is lens width.');
  });

  it('does not call generation when retrieval has no source', async () => {
    const complete = vi.fn();
    const result = await answerKnowledgeQuestion(request, {
      embeddingProvider: { embed: vi.fn().mockResolvedValue(Array(1024).fill(0)) },
      retriever: { retrieve: vi.fn().mockResolvedValue([]) }, chatProvider: { complete },
    });
    expect(result.confidence).toBe('insufficient_sources');
    expect(complete).not.toHaveBeenCalled();
  });

  it('retries citation correction once and accepts a corrected answer', async () => {
    const complete = vi.fn()
      .mockResolvedValueOnce({ claims: [{ text: 'Unsupported', sourceIds: ['fake'] }] })
      .mockResolvedValueOnce({ claims: [{ text: 'Supported', sourceIds: ['source-1'] }] });
    const result = await answerKnowledgeQuestion(request, {
      embeddingProvider: { embed: vi.fn().mockResolvedValue(Array(1024).fill(0)) },
      retriever: { retrieve: vi.fn().mockResolvedValue([chunk]) }, chatProvider: { complete },
    });
    expect(result.confidence).toBe('supported');
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('abstains after a second invalid answer', async () => {
    const result = await answerKnowledgeQuestion(request, {
      embeddingProvider: { embed: vi.fn().mockResolvedValue(Array(1024).fill(0)) },
      retriever: { retrieve: vi.fn().mockResolvedValue([chunk]) },
      chatProvider: { complete: vi.fn().mockResolvedValue({ claims: [{ text: 'No citation', sourceIds: [] }] }) },
    });
    expect(result.confidence).toBe('insufficient_sources');
  });

  it('bypasses every provider for urgent prompts', async () => {
    const embed = vi.fn();
    const result = await answerKnowledgeQuestion({ ...request, query: 'внезапная потеря зрения' }, {
      embeddingProvider: { embed }, retriever: { retrieve: vi.fn() }, chatProvider: { complete: vi.fn() },
    });
    expect(result.safety).toBe('urgent');
    expect(embed).not.toHaveBeenCalled();
  });

  it('refuses diagnosis and treatment requests without calling providers', async () => {
    const embed = vi.fn();
    const retrieve = vi.fn();
    const complete = vi.fn();
    const result = await answerKnowledgeQuestion({ ...request, query: 'поставь диагноз по фото' }, {
      embeddingProvider: { embed }, retriever: { retrieve }, chatProvider: { complete },
    });
    expect(result.answer).toContain('не могу ставить диагноз');
    expect(result.safety).toBe('informational');
    expect(embed).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
});
