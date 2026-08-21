import { describe, expect, it, vi } from 'vitest';
import { createDataDeletionHandler } from './handler';

const request = (method = 'POST', token = 'secret', body?: unknown) => new Request('http://worker.test', {
  method,
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

function setup(env = new Map([['SUPABASE_URL', 'http://db'], ['SUPABASE_SERVICE_ROLE_KEY', 'secret']])) {
  const create = vi.fn(() => ({ service: true }));
  const dispatch = vi.fn(async () => ({ discovered: 1, completed: 1, failed: 0 }));
  return { handler: createDataDeletionHandler((key) => env.get(key), create, dispatch), create, dispatch };
}

describe('data deletion HTTP handler', () => {
  it('rejects unsupported methods before reading configuration', async () => {
    const { handler } = setup(new Map());
    expect((await handler(request('GET'))).status).toBe(405);
  });

  it('rejects missing configuration and invalid authorization', async () => {
    const missing = setup(new Map());
    expect(await (await missing.handler(request())).json()).toEqual({ error: 'worker_not_configured' });
    const configured = setup();
    expect((await configured.handler(request('POST', 'wrong'))).status).toBe(401);
    expect(configured.dispatch).not.toHaveBeenCalled();
  });

  it('normalizes bounded, fractional and missing batch sizes', async () => {
    for (const [input, expected] of [[30.9, 25], [0, 1], [undefined, 10]] as const) {
      const { handler, dispatch } = setup();
      await handler(request('POST', 'secret', input === undefined ? {} : { batchSize: input }));
      expect(dispatch).toHaveBeenCalledWith({ service: true }, expected);
    }
  });

  it('uses the default batch for an empty scheduler body', async () => {
    const { handler, dispatch } = setup();
    await handler(request());
    expect(dispatch).toHaveBeenCalledWith({ service: true }, 10);
  });

  it('maps partial failures and thrown values to observable HTTP failures', async () => {
    const partial = setup();
    partial.dispatch.mockResolvedValue({ discovered: 2, completed: 1, failed: 1 });
    const response = await partial.handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'dispatch_failed', failed: 1 });
    const thrown = setup();
    thrown.dispatch.mockRejectedValue('boom');
    expect(await (await thrown.handler(request())).json()).toEqual({ error: 'worker_error' });
  });
});
