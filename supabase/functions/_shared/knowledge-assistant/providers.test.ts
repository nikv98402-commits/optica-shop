import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleEmbeddingProvider, ProviderError, providerErrorDiagnostic } from './providers.ts';

afterEach(() => {
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
});
