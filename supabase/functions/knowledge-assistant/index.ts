import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { answerKnowledgeQuestion } from '../_shared/knowledge-assistant/orchestrator.ts';
import {
  OpenAICompatibleChatProvider,
  OpenAICompatibleEmbeddingProvider,
  ProviderError,
} from '../_shared/knowledge-assistant/providers.ts';
import {
  RetrievalError,
  SupabaseKnowledgeRetriever,
} from '../_shared/knowledge-assistant/retriever.ts';
import {
  isDisallowedQuery,
  isUrgentQuery,
  refusalResponse,
  urgentResponse,
} from '../_shared/knowledge-assistant/safety.ts';
import { validateAssistantRequest } from '../_shared/knowledge-assistant/validation.ts';

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateWindows = new Map<string, { count: number; resetAt: number }>();

function allowedOrigins() {
  return new Set((Deno.env.get('KNOWLEDGE_ALLOWED_ORIGINS') || 'https://vilu.store,http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((value) => value.trim()).filter(Boolean));
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || '';
  const allowed = allowedOrigins();
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'https://vilu.store',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vilu-client',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function privacyKey(request: Request) {
  const raw = `${request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'}:${Deno.env.get('RATE_LIMIT_SALT') || 'local'}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function isRateLimited(request: Request) {
  const key = await privacyKey(request);
  const now = Date.now();
  const current = rateWindows.get(key);
  if (!current || current.resetAt <= now) {
    rateWindows.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json(request, { error: 'invalid_request' }, 400);
  }
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) return json(request, { error: 'request_too_large' }, 413);
  if (await isRateLimited(request)) return json(request, { error: 'rate_limited' }, 429);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json(request, { error: 'request_too_large' }, 413);
  }
  const body = (() => { try { return JSON.parse(rawBody); } catch { return null; } })();
  const input = validateAssistantRequest(body);
  if (!input) return json(request, { error: 'invalid_request' }, 400);

  // Red-flag guidance is deterministic and must remain available during a
  // provider or database outage.
  if (isUrgentQuery(input.query)) return json(request, urgentResponse(input.locale));
  if (isDisallowedQuery(input.query)) return json(request, refusalResponse(input.locale));

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const chatBaseUrl = Deno.env.get('KNOWLEDGE_CHAT_BASE_URL');
  const chatApiKey = Deno.env.get('KNOWLEDGE_CHAT_API_KEY');
  const chatModel = Deno.env.get('KNOWLEDGE_CHAT_MODEL');
  const embeddingBaseUrl = Deno.env.get('KNOWLEDGE_EMBEDDING_BASE_URL');
  const embeddingApiKey = Deno.env.get('KNOWLEDGE_EMBEDDING_API_KEY');
  const embeddingModel = Deno.env.get('KNOWLEDGE_EMBEDDING_MODEL');
  if (!supabaseUrl || !serviceRoleKey || !chatBaseUrl || !chatApiKey || !chatModel
    || !embeddingBaseUrl || !embeddingApiKey || !embeddingModel) {
    return json(request, { error: 'provider_unavailable' }, 502);
  }

  try {
    const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const response = await answerKnowledgeQuestion(input, {
      embeddingProvider: new OpenAICompatibleEmbeddingProvider({
        baseUrl: embeddingBaseUrl,
        apiKey: embeddingApiKey,
        model: embeddingModel,
      }),
      chatProvider: new OpenAICompatibleChatProvider({
        baseUrl: chatBaseUrl,
        apiKey: chatApiKey,
        model: chatModel,
      }),
      retriever: new SupabaseKnowledgeRetriever(client),
    });
    return json(request, response);
  } catch (error) {
    // Deliberately log only a content-free category; never log request or response bodies.
    if (error instanceof RetrievalError) {
      console.error('knowledge_assistant_error', { code: 'retrieval_unavailable' });
      return json(request, { error: 'retrieval_unavailable' }, 503);
    }
    if (error instanceof ProviderError) {
      console.error('knowledge_assistant_error', { code: 'provider_unavailable' });
      return json(request, { error: 'provider_unavailable' }, 502);
    }
    console.error('knowledge_assistant_error', { code: 'provider_unavailable' });
    return json(request, { error: 'provider_unavailable' }, 502);
  }
});
