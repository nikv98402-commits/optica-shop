import type { ChatProvider, EmbeddingProvider, ModelAnswer } from './contracts.ts';
import type { OperationBudget } from './deadline.ts';

export class ProviderError extends Error {
  constructor(
    public readonly code: 'not_configured' | 'timeout' | 'invalid_response' | 'unavailable',
    public readonly stage: 'configuration' | 'embeddings' | 'chat',
    public readonly status?: number,
    public readonly providerCode?: number,
    public readonly providerMessage?: string,
    public readonly responseShape?: ProviderResponseShape,
    public readonly validationFailure?: ProviderValidationFailure,
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
    ...(error.responseShape ? { responseShape: error.responseShape } : {}),
    ...(error.validationFailure ? { validationFailure: error.validationFailure } : {}),
  };
}

export type ProviderValidationFailure = 'json_syntax' | 'contract_shape';

export interface ProviderResponseShape {
  root: 'object' | 'array' | 'null' | 'other';
  choices: 'array_empty' | 'array_nonempty' | 'missing_or_other';
  message: 'object' | 'missing_or_other';
  content: 'string_empty' | 'string' | 'array' | 'null' | 'missing_or_other';
  contentLength?: number;
}

const MAX_CHAT_RESPONSE_CHARACTERS = 32_000;
const MINIMUM_RETRY_BUDGET_MS = 1_000;
const COMPLETE_JSON_FENCE = /^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i;
const MODEL_ANSWER_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', minLength: 1 },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                chunkId: { type: 'string', minLength: 1 },
                quote: { type: 'string', minLength: 1 },
              },
              required: ['chunkId', 'quote'],
            },
          },
        },
        required: ['text', 'evidence'],
      },
    },
  },
  required: ['claims'],
} as const;

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
  budget?: OperationBudget,
) {
  const controller = new AbortController();
  const abortFromBudget = () => controller.abort();
  budget?.signal.addEventListener('abort', abortFromBudget, { once: true });
  if (budget?.signal.aborted) controller.abort();
  const effectiveTimeoutMs = Math.max(1, Math.min(timeoutMs, budget?.remainingMs() ?? timeoutMs));
  const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);
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
    budget?.signal.removeEventListener('abort', abortFromBudget);
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

function hasExactKeys(value: object, expected: string[]) {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function validModelAnswer(value: unknown): value is ModelAnswer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!hasExactKeys(value, ['claims'])) return false;
  const claims = (value as { claims?: unknown }).claims;
  return Array.isArray(claims) && claims.every((claim) => {
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) return false;
    if (!hasExactKeys(claim, ['text', 'evidence'])) return false;
    const candidate = claim as { text?: unknown; evidence?: unknown };
    return typeof candidate.text === 'string'
      && candidate.text.length > 0
      && Array.isArray(candidate.evidence)
      && candidate.evidence.every((evidence) => {
        if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return false;
        if (!hasExactKeys(evidence, ['chunkId', 'quote'])) return false;
        const citation = evidence as { chunkId?: unknown; quote?: unknown };
        return typeof citation.chunkId === 'string'
          && citation.chunkId.length > 0
          && typeof citation.quote === 'string'
          && citation.quote.length > 0;
      });
  });
}

type ModelAnswerParseResult =
  | { answer: ModelAnswer; validationFailure?: never }
  | { answer: null; validationFailure: ProviderValidationFailure };

function parseModelAnswer(content: string): ModelAnswerParseResult {
  const trimmed = content.trim();
  const fence = COMPLETE_JSON_FENCE.exec(trimmed);
  const json = fence?.[1] ?? trimmed;
  try {
    const parsed = JSON.parse(json) as unknown;
    return validModelAnswer(parsed)
      ? { answer: parsed }
      : { answer: null, validationFailure: 'contract_shape' };
  } catch {
    return { answer: null, validationFailure: 'json_syntax' };
  }
}

export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: ProviderConfig) {
    if (!config.baseUrl || !config.apiKey || !config.model) {
      throw new ProviderError('not_configured', 'configuration');
    }
  }

  async embed(text: string, budget?: OperationBudget) {
    const compatibleUrl = endpoint(this.config.baseUrl, '/embeddings');
    try {
      const response = await providerFetch(compatibleUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.config.model, input: text }),
      }, 'embeddings', this.config.timeoutMs, budget);
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
      }, 'embeddings', this.config.timeoutMs, budget);
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

  async complete(system: string, user: string, budget?: OperationBudget): Promise<ModelAnswer> {
    const request = () => providerFetch(endpoint(this.config.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.1,
        response_format: {
          type: 'json_schema',
          json_schema: MODEL_ANSWER_JSON_SCHEMA,
        },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    }, 'chat', this.config.timeoutMs, budget);
    const parse = async (response: Response) => {
      const body = await response.json() as unknown;
      const root = body && typeof body === 'object' && !Array.isArray(body)
        ? body as { choices?: unknown }
        : null;
      const choices = Array.isArray(root?.choices) ? root.choices : null;
      const first = choices?.[0];
      const message = first && typeof first === 'object' && !Array.isArray(first)
        ? (first as { message?: unknown }).message
        : null;
      const messageObject = message && typeof message === 'object' && !Array.isArray(message)
        ? message as { content?: unknown }
        : null;
      const content = messageObject?.content;
      const shape: ProviderResponseShape = {
        root: body === null ? 'null' : Array.isArray(body) ? 'array' : typeof body === 'object' ? 'object' : 'other',
        choices: choices ? (choices.length ? 'array_nonempty' : 'array_empty') : 'missing_or_other',
        message: messageObject ? 'object' : 'missing_or_other',
        content: content === null ? 'null'
          : Array.isArray(content) ? 'array'
            : typeof content === 'string' ? (content.length ? 'string' : 'string_empty')
              : 'missing_or_other',
        ...(typeof content === 'string' ? { contentLength: content.length } : {}),
      };
      if (typeof content !== 'string' || !content || content.length > MAX_CHAT_RESPONSE_CHARACTERS) {
        throw new ProviderError('invalid_response', 'chat', undefined, undefined, undefined, shape);
      }
      const parsed = parseModelAnswer(content);
      if (!parsed.answer) {
        throw new ProviderError(
          'invalid_response',
          'chat',
          undefined,
          undefined,
          undefined,
          shape,
          parsed.validationFailure,
        );
      }
      return parsed.answer;
    };

    try {
      return await parse(await request());
    } catch (error) {
      if (!(error instanceof ProviderError)
        || error.code !== 'invalid_response'
        || error.stage !== 'chat'
        || error.responseShape?.content !== 'null') throw error;
      if (budget && budget.remainingMs() < MINIMUM_RETRY_BUDGET_MS) throw error;
      return parse(await request());
    }
  }
}
