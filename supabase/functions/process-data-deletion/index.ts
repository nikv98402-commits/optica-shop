import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { dispatchPendingDeletions } from './worker.ts';

function json(body: Record<string,unknown>, status = 200) { return Response.json(body, { status }); }

serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const authorization = request.headers.get('authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'worker_not_configured' },503);
  if (authorization !== `Bearer ${serviceRoleKey}`) return json({ error: 'unauthorized' },401);
  let batchSize = 10;
  try { const payload = await request.json(); if (typeof payload?.batchSize === 'number') batchSize = Math.max(1,Math.min(25,Math.trunc(payload.batchSize))); } catch { /* Empty scheduler payload uses the default batch. */ }
  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const result = await dispatchPendingDeletions(service,batchSize);
    return json({ status: result.failed > 0 ? 'dispatch_failed' : 'dispatched', ...result }, result.failed > 0 ? 503 : 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'worker_error' },500);
  }
});
