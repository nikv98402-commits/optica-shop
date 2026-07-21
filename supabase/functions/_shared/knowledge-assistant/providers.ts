import type { ChatProvider, EmbeddingProvider, ModelAnswer } from './contracts.ts';

export class ProviderError extends Error {
  constructor(public readonly code: 'not_configured' | 'timeout' | 'invalid_response' | 'unavailable') {
    super(code);
  }
}

const MAX_CHAT_RESPONSE_CHARACTERS = 32_000;

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

async function providerFetch(url: string, init: RequestInit, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new ProviderError('unavailable');
    return response;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new ProviderError('timeout');
    throw new ProviderError('unavailable');
  } finally {
    clearTimeout(timer);
  }
}

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: ProviderConfig) {
    if (!config.baseUrl || !config.apiKey || !config.model) throw new ProviderError('not_configured');
  }

  async embed(text: string) {
    const response = await providerFetch(endpoint(this.config.baseUrl, '/embeddings'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.config.model, input: text }),
    }, this.config.timeoutMs);
    const body = await response.json() as { data?: Array<{ embedding?: number[] }> };
    const embedding = body.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 1024 || embedding.some((value) => !Number.isFinite(value))) {
      throw new ProviderError('invalid_response');
    }
    return embedding;
  }
}

export class OpenAICompatibleChatProvider implements ChatProvider {
  constructor(private readonly config: ProviderConfig) {
    if (!config.baseUrl || !config.apiKey || !config.model) throw new ProviderError('not_configured');
  }

  async complete(system: string, user: string): Promise<ModelAnswer> {
    const response = await providerFetch(endpoint(this.config.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    }, this.config.timeoutMs);
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content || content.length > MAX_CHAT_RESPONSE_CHARACTERS) throw new ProviderError('invalid_response');
    try {
      return JSON.parse(content) as ModelAnswer;
    } catch {
      throw new ProviderError('invalid_response');
    }
  }
}
