import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
  leadId?: string;
  serviceType?: string;
  amountRub?: number;
  currency?: string;
  provider?: string;
  sourcePage?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const body = await req.json().catch(() => null) as PaymentIntentPayload | null;
  if (!body || body.serviceType !== 'visit_preparation' || body.currency !== 'RUB') {
    return json({ error: 'validation_failed' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const provider = body.provider || Deno.env.get('PAYMENT_PROVIDER') || 'none';
  const status = provider === 'none' ? 'draft' : 'provider_created';

  const { data, error } = await supabase
    .from('payment_intents')
    .insert({
      lead_id: body.leadId || null,
      service_type: body.serviceType,
      amount_rub: body.amountRub,
      currency: body.currency,
      provider,
      status,
      source_page: body.sourcePage || '/tryon',
    })
    .select('id')
    .single();

  if (error || !data?.id) return json({ error: 'payment_intent_insert_failed' }, 500);

  // Provider checkout wiring is intentionally deferred. This keeps the MVP from pretending to charge users.
  return json({
    paymentIntentId: data.id,
    status,
    providerMode: provider === 'none' ? 'not_connected' : 'checkout',
  });
});
