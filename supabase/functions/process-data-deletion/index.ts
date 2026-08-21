import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { dispatchPendingDeletions } from './worker.ts';
import { createDataDeletionHandler } from './handler.ts';

serve(createDataDeletionHandler(
  (key) => Deno.env.get(key),
  (url, key) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
  (service, batchSize) => dispatchPendingDeletions(service as Parameters<typeof dispatchPendingDeletions>[0], batchSize),
));
