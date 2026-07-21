import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AssistantRequest, AssistantResponse } from '../types/knowledgeAssistant';

const REQUEST_TIMEOUT_MS = 20_000;

export type AssistantServiceErrorCode =
  | 'not_configured'
  | 'invalid_request'
  | 'request_too_large'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'retrieval_unavailable'
  | 'network_error';

export class AssistantServiceError extends Error {
  constructor(public readonly code: AssistantServiceErrorCode) {
    super(code);
  }
}

function normalizeError(status?: number, code?: string): AssistantServiceErrorCode {
  if (status === 400 || code === 'invalid_request') return 'invalid_request';
  if (status === 413 || code === 'request_too_large') return 'request_too_large';
  if (status === 429 || code === 'rate_limited') return 'rate_limited';
  if (status === 502 || code === 'provider_unavailable') return 'provider_unavailable';
  if (status === 503 || code === 'retrieval_unavailable') return 'retrieval_unavailable';
  return 'network_error';
}

export async function askKnowledgeAssistant(request: AssistantRequest): Promise<AssistantResponse> {
  if (!isSupabaseConfigured) throw new AssistantServiceError('not_configured');
  let timer: number | undefined;

  try {
    const invocation = supabase.functions.invoke<AssistantResponse>('knowledge-assistant', {
      body: request,
      headers: { 'x-vilu-client': 'knowledge-assistant-v1' },
    });
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(
        () => reject(new AssistantServiceError('network_error')),
        REQUEST_TIMEOUT_MS,
      );
    });
    const { data, error } = await Promise.race([invocation, timeout]);
    if (error || !data) {
      const context = error?.context as Response | undefined;
      let code: string | undefined;
      try {
        code = context ? ((await context.clone().json()) as { error?: string }).error : undefined;
      } catch {
        code = undefined;
      }
      throw new AssistantServiceError(normalizeError(context?.status, code));
    }
    return data;
  } catch (error) {
    if (error instanceof AssistantServiceError) throw error;
    throw new AssistantServiceError('network_error');
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}
