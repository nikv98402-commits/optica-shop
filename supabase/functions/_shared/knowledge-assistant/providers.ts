import type { ChatProvider, EmbeddingProvider, ModelAnswer } from './contracts.ts';

export class ProviderError extends Error {
  constructor(
    public readonly code: 'not_configured' | 'timeout' | 'invalid_response' | 'unavailable',
    public readonly stage: 'configuration' | 'embeddings' | 'chat',
    public readonly status?: number,
    public readonly providerCode?: number,
    public readonly providerMessage?: string,
  ) {
    super(code);
  }
}

export function providerErrorDiagnostic(error: ProviderError) {
  return {
    stage: error.stage,
    reason: error.code,
    status: error.status,
    providerCode: error.providerCode,
  };
}

const MAX_CHAT_RESPONSE_CHARACTERS = 32_000;

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

async function providerFetch(
  url: string,
  init: RequestInit,
  stage: 'embeddings' | 'chat',
  timeoutMs = 15_000,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      let providerCode: number | undefined;
      let providerMessage: string | undefined;
      try {
        const body = await response.clone().json() as {
          errors?: Array<{ code?: number; message?: string }>;
        };
        providerCode = body.errors?.[0]?.code;
        providerMessage = body.errors?.[0]?.message?.slice(0, 160);
      } catch {
        // Provider returned a non-JSON error. Status and stage remain sufficient.
      }
      throw new ProviderError('unavailable', stage, response.status, providerCode, providerMessage);
    }
    return response;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new ProviderError('timeout', stage);
    throw new ProviderError('unavailable', stage);
  } finally {
    clearTimeout(timer);
  }
}

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function cloudflareRunEndpoint(baseUrl: string, model: string) {
  const normalized = baseUrl.replace(/\/$/, '');
  if (!normalized.startsWith('https://api.cloudflare.com/client/v4/accounts/')
    || !normalized.endsWith('/ai/v1')
    || !model.startsWith('@cf/')) return null;
  return `${normalized.slice(0, -'/ai/v1'.length)}/ai/run/${model}`;
}

function validEmbedding(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length === 1024
    && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: ProviderConfig) {
    if (!config.baseUrl || !config.apiKey || !config.model) {
      throw new ProviderError('not_configured', 'configuration');
    }
  }

  async embed(text: string) {
    const compatibleUrl = endpoint(this.config.baseUrl, '/embeddings');
    try {
      const response = await providerFetch(compatibleUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.config.model, input: text }),
      }, 'embeddings', this.config.timeoutMs);
      const body = await response.json() as { data?: Array<{ embedding?: number[] }> };
      const embedding = body.data?.[0]?.embedding;
      if (!validEmbedding(embedding)) throw new ProviderError('invalid_response', 'embeddings');
      return embedding;
    } catch (error) {
      const directUrl = cloudflareRunEndpoint(this.config.baseUrl, this.config.model);
      if (!(error instanceof ProviderError) || error.status !== 404 || !directUrl) throw error;

      const response = await providerFetch(directUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [text] }),
      }, 'embeddings', this.config.timeoutMs);
      const body = await response.json() as {
        result?: { data?: number[][] } | number[][];
      };
      const result = body.result;
      const embedding = Array.isArray(result) ? result[0] : result?.data?.[0];
      if (!validEmbedding(embedding)) throw new ProviderError('invalid_response', 'embeddings');
      return embedding;
    }
  }
}

export class OpenAICompatibleChatProvider implements ChatProvider {
  constructor(private readonly config: ProviderConfig) {
    if (!config.baseUrl || !config.apiKey || !config.model) {
      throw new ProviderError('not_configured', 'configuration');
    }
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
    }, 'chat', this.config.timeoutMs);
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content || content.length > MAX_CHAT_RESPONSE_CHARACTERS) {
      throw new ProviderError('invalid_response', 'chat');
    }
    try {
      return JSON.parse(content) as ModelAnswer;
    } catch {
      throw new ProviderError('invalid_response', 'chat');
    }
  }
}
