import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const OFFER_CODE = 'visit_preparation_v1';
const OFFER_PRICE_RUB = 429;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type PaymentIntentPayload = {
  offerCode?: string;
  leadId?: string;
  sourcePage?: string;
  idempotencyKey?: string;
};

function isUuid(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const body = await req.json().catch(() => null) as PaymentIntentPayload | null;
  if (
    !body
    || body.offerCode !== OFFER_CODE
    || !isUuid(body.leadId)
    || !isUuid(body.idempotencyKey)
    || !['/tryon', '/products'].includes(body.sourcePage || '')
  ) {
    return json({ error: 'validation_failed' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const insert = await supabase
    .from('payment_intents')
    .upsert({
      lead_id: body.leadId,
      service_type: 'visit_preparation',
      offer_code: OFFER_CODE,
      amount_rub: OFFER_PRICE_RUB,
      currency: 'RUB',
      provider: 'none',
      status: 'draft',
      source_page: body.sourcePage,
      idempotency_key: body.idempotencyKey,
    }, { onConflict: 'idempotency_key', ignoreDuplicates: true })
    .select('id, public_token, offer_code, amount_rub, currency, status')
    .maybeSingle();

  let intent = insert.data;
  if (!intent && !insert.error) {
    const existing = await supabase
      .from('payment_intents')
      .select('id, public_token, offer_code, amount_rub, currency, status')
      .eq('idempotency_key', body.idempotencyKey)
      .maybeSingle();
    intent = existing.data;
  }

  if (insert.error || !intent?.id || !intent.public_token) {
    return json({ error: 'payment_intent_insert_failed' }, 500);
  }

  const returnUrl = `https://vilu.store/payment/return?token=${encodeURIComponent(intent.public_token)}`;
  return json({
    paymentIntentId: intent.id,
    publicToken: intent.public_token,
    offerCode: intent.offer_code,
    amountRub: intent.amount_rub,
    currency: intent.currency,
    status: intent.status,
    providerMode: 'test_not_connected',
    returnUrl,
  });
});
