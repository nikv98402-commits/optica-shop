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

  const { data: lead, error: leadError } = await supabase
    .from('visit_preparation_leads')
    .insert({
      locale: body.locale || 'ru',
      contact_channel: body.contactChannel,
      contact_value: body.contactValue,
      city: body.city || null,
      preferred_store_id: body.preferredStoreId || null,
      preferred_store_name: body.preferredStoreName || null,
      source_page: body.sourcePage || '/tryon',
      consent_personal_data: true,
      consent_version: body.consentVersion,
      privacy_version: body.privacyVersion,
      utm: body.utm || {},
      comment: body.comment || null,
    })
    .select('id')
    .single();

  if (leadError || !lead?.id) return json({ error: 'lead_insert_failed' }, 500);

  const frameRows = body.selectedFrames.slice(0, 3).map((frame) => ({
    lead_id: lead.id,
    frame_id: frame.frameId,
    frame_name: frame.frameName,
    frame_brand: frame.frameBrand || null,
    frame_category: frame.frameCategory || null,
    frame_size: frame.frameSize || null,
    frame_price_rub: frame.framePriceRub || null,
    fit_score: frame.fitScore || null,
    use_case: frame.useCase || null,
  }));

  const { error: framesError } = await supabase.from('visit_preparation_frames').insert(frameRows);
  if (framesError) return json({ error: 'frames_insert_failed' }, 500);

  return json({ leadId: lead.id, status: 'new', nextStep: 'payment_optional' });
});
