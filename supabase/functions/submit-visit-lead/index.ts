import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const DEFAULT_ALLOWED_ORIGINS = ['https://vilu.store', 'https://www.vilu.store'];
const rateLimitBuckets = new Map<string, number[]>();

const forbiddenKeys = [
  /photo/i,
  /image/i,
  /base64/i,
  /sph/i,
  /cyl/i,
  /axis/i,
  /complaint/i,
  /symptom/i,
  /recipe/i,
  /prescription/i,
  /birth/i,
  /^age$/i,
  /birthDate/i,
  /dateOfBirth/i,
  /medical/i,
  /health/i,
  /latitude/i,
  /longitude/i,
  /^lat$/i,
  /^lng$/i,
];

type LeadFramePayload = {
  frameId?: unknown;
  frameName?: unknown;
  frameBrand?: unknown;
  frameCategory?: unknown;
  frameSize?: unknown;
  framePriceRub?: unknown;
  fitScore?: unknown;
  useCase?: unknown;
};

type LeadPayload = {
  locale?: string;
  customerName?: string;
  contactChannel?: string;
  contactValue?: string;
  city?: string;
  preferredStoreId?: string;
  preferredStoreName?: string;
  sourcePage?: string;
  consentPersonalData?: boolean;
  consentVersion?: string;
  privacyVersion?: string;
  utm?: Record<string, string>;
  selectedFrames?: LeadFramePayload[];
};

function allowedOrigins() {
  return (Deno.env.get('ALLOWED_WEB_ORIGINS') || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function requestOrigin(req: Request) {
  return req.headers.get('origin') || '';
}

function isAllowedOrigin(origin: string) {
  return Boolean(origin && allowedOrigins().includes(origin));
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function clientAddress(req: Request) {
  return (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown')
    .split(',')[0]
    .trim();
}

function exceedsRateLimit(req: Request, now = Date.now()) {
  const key = clientAddress(req);
  const active = (rateLimitBuckets.get(key) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitBuckets.set(key, active);
    return true;
  }
  active.push(now);
  rateLimitBuckets.set(key, active);
  return false;
}

function isBoundedString(value: unknown, max: number, required = false) {
  if (value === undefined || value === null || value === '') return !required;
  return typeof value === 'string' && value.trim().length >= (required ? 1 : 0) && value.length <= max;
}

function isOptionalInteger(value: unknown, min: number, max: number) {
  return value === undefined
    || (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max);
}

function isValidFrame(frame: LeadFramePayload) {
  return Boolean(
    frame
    && typeof frame === 'object'
    && isBoundedString(frame.frameId, 120, true)
    && isBoundedString(frame.frameName, 160, true)
    && isBoundedString(frame.frameBrand, 120)
    && isBoundedString(frame.frameCategory, 120)
    && isBoundedString(frame.frameSize, 80)
    && isOptionalInteger(frame.framePriceRub, 0, 10_000_000)
    && isOptionalInteger(frame.fitScore, 0, 100)
    && isBoundedString(frame.useCase, 120)
  );
}

function findForbiddenKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findForbiddenKey(item);
      if (nested) return nested;
    }
    return null;
  }
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeys.some((pattern) => pattern.test(key))) return key;
    const nested = findForbiddenKey(nestedValue);
    if (nested) return nested;
  }
  return null;
}

serve(async (req) => {
  const origin = requestOrigin(req);
  if (!isAllowedOrigin(origin)) return new Response(JSON.stringify({ error: 'origin_not_allowed' }), { status: 403 });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  const expectedAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!expectedAnonKey || req.headers.get('apikey') !== expectedAnonKey) {
    return json({ error: 'client_auth_required' }, 401, origin);
  }
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'content_type_required' }, 415, origin);
  }
  const declaredLength = Number(req.headers.get('content-length') || '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413, origin);
  }
  if (exceedsRateLimit(req)) return json({ error: 'rate_limited' }, 429, origin);

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413, origin);
  }
  const payload = (() => {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
  })();
  if (!payload || typeof payload !== 'object') return json({ error: 'invalid_json' }, 400, origin);

  const forbidden = findForbiddenKey(payload);
  if (forbidden) return json({ error: 'privacy_payload_rejected', field: forbidden }, 400, origin);

  const body = payload as LeadPayload;
  if (
    !body.consentPersonalData
    || !isBoundedString(body.contactValue, 160, true)
    || !isBoundedString(body.customerName, 120)
    || !isBoundedString(body.city, 120)
    || !isBoundedString(body.preferredStoreId, 120)
    || !isBoundedString(body.preferredStoreName, 160)
    || !isBoundedString(body.consentVersion, 80, true)
    || !isBoundedString(body.privacyVersion, 80, true)
    || !Array.isArray(body.selectedFrames)
    || body.selectedFrames.length < 1
    || body.selectedFrames.length > 3
    || !body.selectedFrames.every(isValidFrame)
  ) {
    return json({ error: 'validation_failed' }, 400, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500, origin);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc('submit_visit_preparation_lead', {
    p_locale: body.locale || 'ru',
    p_customer_name: body.customerName || '',
    p_contact_channel: body.contactChannel,
    p_contact_value: body.contactValue,
    p_city: body.city || '',
    p_preferred_store_id: body.preferredStoreId || '',
    p_preferred_store_name: body.preferredStoreName || '',
    p_source_page: body.sourcePage || '/tryon',
    p_consent_version: body.consentVersion,
    p_privacy_version: body.privacyVersion,
    p_utm: body.utm || {},
    p_comment: '',
    p_selected_frames: body.selectedFrames.slice(0, 3),
  });
  const lead = Array.isArray(data) ? data[0] : data;

  if (error || !lead?.lead_id || !lead.payment_capability_token) {
    return json({ error: 'lead_transaction_failed' }, 500, origin);
  }

  return json({
    leadId: lead.lead_id,
    paymentCapabilityToken: lead.payment_capability_token,
    status: 'new',
    nextStep: 'payment_optional',
  }, 200, origin);
});
