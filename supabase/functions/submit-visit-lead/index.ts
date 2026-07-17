import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  comment?: string;
  selectedFrames?: LeadFramePayload[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== 'object') return json({ error: 'invalid_json' }, 400);

  const forbidden = findForbiddenKey(payload);
  if (forbidden) return json({ error: 'privacy_payload_rejected', field: forbidden }, 400);

  const body = payload as LeadPayload;
  if (!body.consentPersonalData || !body.contactValue || !Array.isArray(body.selectedFrames) || body.selectedFrames.length === 0) {
    return json({ error: 'validation_failed' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);

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
    p_comment: body.comment || '',
    p_selected_frames: body.selectedFrames.slice(0, 3),
  });
  const lead = Array.isArray(data) ? data[0] : data;

  if (error || !lead?.lead_id || !lead.payment_capability_token) {
    return json({ error: 'lead_transaction_failed' }, 500);
  }

  return json({
    leadId: lead.lead_id,
    paymentCapabilityToken: lead.payment_capability_token,
    status: 'new',
    nextStep: 'payment_optional',
  });
});
