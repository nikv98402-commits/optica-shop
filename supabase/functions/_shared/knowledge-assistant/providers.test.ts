import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OpenAICompatibleChatProvider,
  OpenAICompatibleEmbeddingProvider,
  ProviderError,
  providerErrorDiagnostic,
} from './providers.ts';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('OpenAICompatibleEmbeddingProvider', () => {
  it('keeps provider messages out of diagnostics safe for logs', () => {
    const diagnostic = providerErrorDiagnostic(
      new ProviderError('unavailable', 'chat', 401, 10000, 'account secret and provider details'),
    );

    expect(diagnostic).toEqual({
      stage: 'chat',
      reason: 'unavailable',
      status: 401,
      providerCode: 10000,
    });
    expect(JSON.stringify(diagnostic)).not.toContain('account secret');
  });

  it('falls back to the Cloudflare run endpoint when compatible embeddings return 404', async () => {
    const embedding = Array.from({ length: 1024 }, (_, index) => index / 1024);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(Response.json({ result: { shape: [1, 1024], data: [embedding] } }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/account-id/ai/v1',
      apiKey: 'test-token',
      model: '@cf/qwen/qwen3-embedding-0.6b',
    });

    await expect(provider.embed('тест')).resolves.toEqual(embedding);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.cloudflare.com/client/v4/accounts/account-id/ai/run/@cf/qwen/qwen3-embedding-0.6b',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns a valid compatible embedding without attempting fallback', async () => {
    const embedding = Array.from({ length: 1024 }, (_, index) => index / 1024);
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [{ embedding }] }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://provider.example/v1/',
      apiKey: 'test-token',
      model: 'embedding-model',
    });

    await expect(provider.embed('test')).resolves.toEqual(embedding);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects malformed compatible and Cloudflare embeddings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [{ embedding: [1, 2] }] })));
    const compatible = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://provider.example/v1',
      apiKey: 'test-token',
      model: 'embedding-model',
    });
    await expect(compatible.embed('test')).rejects.toMatchObject({ code: 'invalid_response', stage: 'embeddings' });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(Response.json({ result: { data: [[Number.NaN]] } }));
    vi.stubGlobal('fetch', fetchMock);
    const cloudflare = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/account-id/ai/v1',
      apiKey: 'test-token',
      model: '@cf/qwen/qwen3-embedding-0.6b',
    });
    await expect(cloudflare.embed('test')).rejects.toMatchObject({ code: 'invalid_response', stage: 'embeddings' });
  });

  it('does not fall back for a non-Cloudflare provider or a non-404 error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://provider.example/v1',
      apiKey: 'test-token',
      model: 'embedding-model',
    });

    await expect(provider.embed('test')).rejects.toMatchObject({ code: 'unavailable', status: 503 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('classifies aborted requests as timeouts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://provider.example/v1',
      apiKey: 'test-token',
      model: 'embedding-model',
    });
    await expect(provider.embed('test')).rejects.toMatchObject({ code: 'timeout', stage: 'embeddings' });
  });

  it('validates chat success, malformed JSON, and oversized content', async () => {
    const provider = new OpenAICompatibleChatProvider({
      baseUrl: 'https://provider.example/v1',
      apiKey: 'test-token',
      model: 'chat-model',
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '{"claims":[]}' } }] }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'not-json' } }] }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'x'.repeat(32_001) } }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(provider.complete('system', 'user')).resolves.toEqual({ claims: [] });
    await expect(provider.complete('system', 'user')).rejects.toMatchObject({ code: 'invalid_response', stage: 'chat' });
    await expect(provider.complete('system', 'user')).rejects.toMatchObject({ code: 'invalid_response', stage: 'chat' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['empty string', { choices: [{ message: { content: '' } }] }],
    ['array content', { choices: [{ message: { content: [] } }] }],
    ['missing content', { choices: [{ message: {} }] }],
  ])('does not retry an unproven %s chat response', async (_label, body) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAICompatibleChatProvider({
      baseUrl: 'https://provider.example/v1', apiKey: 'test-token', model: 'chat-model',
    });

    await expect(provider.complete('system', 'user')).rejects.toMatchObject({
      code: 'invalid_response', stage: 'chat',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('retries one proven intermittent invalid chat response and keeps diagnostics content-free', async () => {
    const leaked = 'private answer text';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: null, reasoning: leaked } }] }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '{"claims":[]}' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAICompatibleChatProvider({
      baseUrl: 'https://provider.example/v1', apiKey: 'test-token', model: 'chat-model',
    });

    await expect(provider.complete('system', 'user')).resolves.toEqual({ claims: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(
      Response.json({ choices: [{ message: { content: null, reasoning: leaked } }] }),
    )));
    const error = await provider.complete('system', 'user').catch((caught) => caught as ProviderError);
    expect(providerErrorDiagnostic(error)).toEqual({
      stage: 'chat', reason: 'invalid_response', status: undefined, providerCode: undefined,
      responseShape: {
        root: 'object', choices: 'array_nonempty', message: 'object', content: 'null',
      },
    });
    expect(JSON.stringify(providerErrorDiagnostic(error))).not.toContain(leaked);
  });

  it('does not retry content=null when the shared deadline has too little budget', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ choices: [{ message: { content: null } }] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAICompatibleChatProvider({
      baseUrl: 'https://provider.example/v1', apiKey: 'test-token', model: 'chat-model',
    });
    const controller = new AbortController();

    await expect(provider.complete('system', 'user', {
      signal: controller.signal,
      remainingMs: () => 999,
    })).rejects.toMatchObject({ code: 'invalid_response', stage: 'chat' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('uses the remaining shared budget as the provider timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const provider = new OpenAICompatibleChatProvider({
      baseUrl: 'https://provider.example/v1', apiKey: 'test-token', model: 'chat-model', timeoutMs: 15_000,
    });
    const controller = new AbortController();
    const completion = provider.complete('system', 'user', {
      signal: controller.signal,
      remainingMs: () => 30,
    });

    const rejection = expect(completion).rejects.toMatchObject({ code: 'timeout', stage: 'chat' });
    await vi.advanceTimersByTimeAsync(30);
    await rejection;
    vi.useRealTimers();
  });

  it('rejects incomplete provider configuration', () => {
    expect(() => new OpenAICompatibleEmbeddingProvider({
      baseUrl: '',
      apiKey: 'token',
      model: 'model',
    })).toThrowError(expect.objectContaining({ code: 'not_configured', stage: 'configuration' }));
    expect(() => new OpenAICompatibleChatProvider({
      baseUrl: 'https://provider.example/v1',
      apiKey: '',
      model: 'model',
    })).toThrowError(expect.objectContaining({ code: 'not_configured', stage: 'configuration' }));
  });

  it('preserves status but ignores malformed non-JSON provider error bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<html>unavailable</html>', { status: 502 }),
    ));
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://provider.example/v1',
      apiKey: 'test-token',
      model: 'embedding-model',
    });

    await expect(provider.embed('test')).rejects.toMatchObject({
      code: 'unavailable',
      stage: 'embeddings',
      status: 502,
      providerCode: undefined,
      providerMessage: undefined,
    });
  });

  it('reports an HTTP failure from the Cloudflare fallback endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response('upstream down', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/account-id/ai/v1',
      apiKey: 'test-token',
      model: '@cf/qwen/qwen3-embedding-0.6b',
    });

    await expect(provider.embed('test')).rejects.toMatchObject({
      code: 'unavailable',
      stage: 'embeddings',
      status: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty chat response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(
      Response.json({ choices: [{ message: { content: '' } }] }),
    )));
    const provider = new OpenAICompatibleChatProvider({
      baseUrl: 'https://provider.example/v1',
      apiKey: 'test-token',
      model: 'chat-model',
    });
    await expect(provider.complete('system', 'user')).rejects.toMatchObject({
      code: 'invalid_response',
      stage: 'chat',
    });
  });

  it('aborts and classifies a slow chat request as a timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const provider = new OpenAICompatibleChatProvider({
      baseUrl: 'https://provider.example/v1',
      apiKey: 'test-token',
      model: 'chat-model',
      timeoutMs: 25,
    });

    const completion = provider.complete('system', 'user');
    const rejection = expect(completion).rejects.toMatchObject({ code: 'timeout', stage: 'chat' });
    await vi.advanceTimersByTimeAsync(25);
    await rejection;
  });
});
