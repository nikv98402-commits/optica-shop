import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(req.method)) return json({ error: 'method_not_allowed' }, 405);

  const body = req.method === 'POST' ? await req.json().catch(() => null) as { token?: string } | null : null;
  const token = req.method === 'GET' ? new URL(req.url).searchParams.get('token') : body?.token;
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return json({ error: 'not_found' }, 404);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('payment_intents')
    .select('public_token, offer_code, amount_rub, currency, status, paid_at, failure_code, provider')
    .eq('public_token', token)
    .maybeSingle();

  if (error || !data) return json({ error: 'not_found' }, 404);
  return json({
    publicToken: data.public_token,
    offerCode: data.offer_code,
    amountRub: data.amount_rub,
    currency: data.currency,
    status: data.status,
    providerMode: data.provider === 'none' ? 'test_not_connected' : 'checkout',
    paidAt: data.paid_at || undefined,
    failureCode: data.failure_code || undefined,
  });
});
