type EnvReader = (key: string) => string | undefined;
type DispatchResult = { discovered: number; completed: number; failed: number };

export function createDataDeletionHandler(
  env: EnvReader,
  createService: (url: string, key: string) => unknown,
  dispatch: (service: unknown, batchSize: number) => Promise<DispatchResult>,
) {
  return async (request: Request) => {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const serviceUrl = env('SUPABASE_URL');
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceUrl || !serviceRoleKey) return Response.json({ error: 'worker_not_configured' }, { status: 503 });
    if (request.headers.get('authorization') !== `Bearer ${serviceRoleKey}`) return Response.json({ error: 'unauthorized' }, { status: 401 });
    let batchSize = 10;
    try {
      const payload = await request.json();
      if (typeof payload?.batchSize === 'number') batchSize = Math.max(1, Math.min(25, Math.trunc(payload.batchSize)));
    } catch { /* Empty scheduler payload uses the default batch. */ }
    try {
      const result = await dispatch(createService(serviceUrl, serviceRoleKey), batchSize);
      return Response.json({ status: result.failed > 0 ? 'dispatch_failed' : 'dispatched', ...result }, { status: result.failed > 0 ? 503 : 200 });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'worker_error' }, { status: 500 });
    }
  };
}
