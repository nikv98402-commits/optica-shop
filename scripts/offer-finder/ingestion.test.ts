import { describe, expect, it, vi } from 'vitest';
import {
  AdapterRegistry,
  IngestionError,
  IngestionRunner,
  RestrictedFetcher,
  type IngestionSource,
  type IngestionStore,
  type QuarantineIncident,
  type RunCounters,
  type RunRecord,
  type SourceAdapter,
  type StoredObservation,
} from './ingestion.ts';
import { canaryAdapter } from './canary.ts';

const SOURCE: IngestionSource = {
  id: '00000000-0000-4000-8000-000000000054',
  name: 'Test source',
  adapterKey: 'test',
  adapterVersion: '1.0.0',
  sourceType: 'api',
  approvedOrigins: ['https://offers.example.com'],
  rateLimitPerMinute: 600,
  concurrencyLimit: 1,
  termsReviewedAt: '2026-07-25T00:00:00.000Z',
  robotsStatus: 'not_applicable',
  enabled: true,
};

class MemoryStore implements IngestionStore {
  observations = new Map<string, StoredObservation>();
  incidents: QuarantineIncident[] = [];
  finished: Array<{ status: string; counters: RunCounters; code?: string; summary?: string }> = [];

  async createRun(source: IngestionSource): Promise<RunRecord> {
    return {
      id: 'run-1',
      sourceId: source.id,
      trigger: 'canary',
      status: 'running',
      adapterVersion: source.adapterVersion,
      checkpoint: {},
      counters: {
        fetched: 0,
        observed: 0,
        accepted: 0,
        updated: 0,
        unchanged: 0,
        quarantined: 0,
        failed: 0,
      },
    };
  }
  async heartbeat(): Promise<void> {}
  async writeObservations(items: StoredObservation[]): Promise<{ inserted: number; unchanged: number }> {
    let inserted = 0;
    for (const item of items) {
      const key = `${item.sourceId}:${item.externalOfferId}:${item.observationHash}`;
      if (!this.observations.has(key)) {
        this.observations.set(key, item);
        inserted += 1;
      }
    }
    return { inserted, unchanged: items.length - inserted };
  }
  async quarantine(incident: QuarantineIncident): Promise<void> {
    this.incidents.push(incident);
  }
  async finishRun(
    _runId: string,
    status: 'succeeded' | 'degraded' | 'failed' | 'cancelled',
    counters: RunCounters,
    code?: string,
    summary?: string,
  ): Promise<void> {
    this.finished.push({ status, counters, code, summary });
  }
}

function response(body: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

function fetcher(
  fetchImpl: typeof fetch,
  addresses = ['93.184.216.34'],
  overrides: ConstructorParameters<typeof RestrictedFetcher>[0] = {},
): RestrictedFetcher {
  return new RestrictedFetcher({
    fetchImpl,
    resolveHost: async () => addresses,
    sleep: async () => undefined,
    random: () => 0,
    ...overrides,
  });
}

const adapter = (observations: Awaited<ReturnType<SourceAdapter['collect']>>): SourceAdapter => ({
  key: 'test',
  version: '1.0.0',
  collect: async () => observations,
});

describe('restricted fetcher security boundary', () => {
  it.each([
    'http://offers.example.com/a',
    'https://user:pass@offers.example.com/a',
    'https://127.0.0.1/a',
    'https://not-approved.example/a',
  ])('rejects disallowed destination %s', async (url) => {
    await expect(fetcher(vi.fn()).forSource(SOURCE)(url)).rejects.toMatchObject({
      code: 'DESTINATION_NOT_ALLOWED',
    });
  });

  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.20.0.1', '192.168.1.1', '::1', 'fd00::1'])(
    'blocks SSRF address %s',
    async (address) => {
      await expect(
        fetcher(vi.fn(), [address]).forSource(SOURCE)('https://offers.example.com/a'),
      ).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
    },
  );

  it('revalidates and rejects a redirect to a non-allowlisted host', async () => {
    const transport = vi.fn().mockResolvedValue(
      response('', { status: 302, headers: { location: 'https://internal.example/private' } }),
    );
    await expect(
      fetcher(transport).forSource(SOURCE)('https://offers.example.com/a'),
    ).rejects.toMatchObject({ code: 'DESTINATION_NOT_ALLOWED' });
  });

  it('rejects unsupported content types', async () => {
    const transport = vi.fn().mockResolvedValue(
      response('image', { headers: { 'content-type': 'image/png' } }),
    );
    await expect(
      fetcher(transport).forSource(SOURCE)('https://offers.example.com/a'),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT_TYPE' });
  });

  it('enforces declared and actual response byte limits', async () => {
    const declared = vi.fn().mockResolvedValue(
      response('x', { headers: { 'content-length': '1000' } }),
    );
    await expect(
      fetcher(declared, undefined, { maxResponseBytes: 10 })
        .forSource(SOURCE)('https://offers.example.com/a'),
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });

    const actual = vi.fn().mockResolvedValue(response('12345678901'));
    await expect(
      fetcher(actual, undefined, { maxResponseBytes: 10 })
        .forSource(SOURCE)('https://offers.example.com/a'),
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });

  it('stops at auth, paywall and CAPTCHA boundaries', async () => {
    const auth = vi.fn().mockResolvedValue(response('', { status: 401 }));
    await expect(
      fetcher(auth).forSource(SOURCE)('https://offers.example.com/a'),
    ).rejects.toMatchObject({ code: 'AUTH_OR_PAYWALL' });

    const captcha = vi.fn().mockResolvedValue(response('Verify you are human: CAPTCHA'));
    await expect(
      fetcher(captcha).forSource(SOURCE)('https://offers.example.com/a'),
    ).rejects.toMatchObject({ code: 'CAPTCHA_DETECTED' });
  });

  it('retries bounded transient failures with exponential backoff', async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(response('', { status: 503 }))
      .mockResolvedValueOnce(response('{"ok":true}'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await fetcher(transport, undefined, { sleep, maxRetries: 2, baseBackoffMs: 10 })
      .forSource(SOURCE)('https://offers.example.com/a');
    expect(result.status).toBe(200);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('returns a safe retry exhausted code', async () => {
    const transport = vi.fn().mockRejectedValue(new Error('secret=https://token.example/abcdef'));
    await expect(
      fetcher(transport, undefined, { maxRetries: 1 })
        .forSource(SOURCE)('https://offers.example.com/a'),
    ).rejects.toMatchObject({ code: 'RETRY_EXHAUSTED' });
  });

  it('sends only an identifying user-agent and accept header', async () => {
    const transport = vi.fn().mockResolvedValue(response('{}'));
    await fetcher(transport).forSource(SOURCE)('https://offers.example.com/a');
    const init = transport.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('omit');
    expect(init.redirect).toBe('manual');
    expect(init.headers).toEqual({
      accept: 'application/json, application/ld+json, text/html, text/csv',
      'user-agent': 'ViLuOfferFinder/0.1 (+https://vilu.store/terms)',
    });
  });
});

describe('ingestion runner', () => {
  it.each([
    [{ enabled: false }, 'SOURCE_DISABLED'],
    [{ termsReviewedAt: null }, 'TERMS_REVIEW_REQUIRED'],
    [{ robotsStatus: 'disallowed' }, 'ROBOTS_POLICY_BLOCKED'],
  ] as const)('enforces source policy %o', async (patch, code) => {
    const runner = new IngestionRunner(
      new AdapterRegistry().register(adapter([])),
      fetcher(vi.fn()),
      new MemoryStore(),
    );
    await expect(runner.run({ ...SOURCE, ...patch } as IngestionSource, 'manual')).rejects.toMatchObject({
      code,
    });
  });

  it('isolates missing adapters and version mismatches', () => {
    const registry = new AdapterRegistry().register(adapter([]));
    expect(() => registry.resolve({ ...SOURCE, adapterKey: 'missing' })).toThrowError(IngestionError);
    expect(() => registry.resolve({ ...SOURCE, adapterVersion: '2.0.0' })).toThrowError(IngestionError);
  });

  it('writes observations idempotently with stable canonical hashes', async () => {
    const store = new MemoryStore();
    const first = {
      externalOfferId: 'offer-1',
      sourceUrl: 'https://offers.example.com/item?token=secret&color=black',
      payload: { currency: 'RUB', price: 100, nested: { b: 2, a: 1 } },
      collectedAt: '2026-07-25T00:00:00.000Z',
      contentType: 'application/json',
    };
    const second = { ...first, payload: { nested: { a: 1, b: 2 }, price: 100, currency: 'RUB' } };
    const runner = new IngestionRunner(
      new AdapterRegistry().register(adapter([first, second])),
      fetcher(vi.fn()),
      store,
    );
    const result = await runner.run(SOURCE, 'canary');
    expect(result.status).toBe('succeeded');
    expect(result.counters).toMatchObject({ fetched: 0, observed: 2, accepted: 1, unchanged: 1 });
    expect(store.observations.size).toBe(1);
    expect([...store.observations.values()][0].sourceUrlHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('quarantines malformed records and completes the source as degraded', async () => {
    const store = new MemoryStore();
    const runner = new IngestionRunner(
      new AdapterRegistry().register(
        adapter([
          {
            externalOfferId: '',
            sourceUrl: 'https://offers.example.com/item',
            payload: {},
            collectedAt: 'invalid',
          },
        ]),
      ),
      fetcher(vi.fn()),
      store,
    );
    const result = await runner.run(SOURCE, 'manual');
    expect(result.status).toBe('degraded');
    expect(result.counters.quarantined).toBe(1);
    expect(store.incidents[0]).toMatchObject({ kind: 'MALFORMED_OBSERVATION', severity: 'error' });
  });

  it('records a source failure without throwing across source shards', async () => {
    const store = new MemoryStore();
    const failing: SourceAdapter = {
      key: 'test',
      version: '1.0.0',
      collect: async () => {
        throw new IngestionError('REQUEST_TIMEOUT', 'timeout', true);
      },
    };
    const runner = new IngestionRunner(
      new AdapterRegistry().register(failing),
      fetcher(vi.fn()),
      store,
    );
    const result = await runner.run(SOURCE, 'schedule');
    expect(result.status).toBe('failed');
    expect(store.finished[0]).toMatchObject({ status: 'failed', code: 'REQUEST_TIMEOUT' });
  });

  it('parses the canary adapter from an injected fixture without network access', async () => {
    vi.stubEnv('OFFER_FINDER_CANARY_URL', 'https://example.com/vilu-offer-finder-canary.json');
    const fixtureFetch = vi.fn().mockResolvedValue(
      response('{"offers":[{"id":"canary-1","listedPriceMinor":1299000,"currency":"RUB","available":true}]}'),
    );
    const observations = await canaryAdapter.collect({
      source: SOURCE,
      checkpoint: {},
      fetch: async () => {
        const raw = await fixtureFetch();
        const body = new Uint8Array(await raw.arrayBuffer());
        const text = new TextDecoder().decode(body);
        return {
          url: 'https://example.com/vilu-offer-finder-canary.json',
          status: 200,
          contentType: 'application/json',
          body,
          text: () => text,
          json: <T>() => JSON.parse(text) as T,
        };
      },
    });
    expect(observations).toHaveLength(1);
    vi.unstubAllEnvs();
    expect(observations[0].payload).toEqual({
      listedPriceMinor: 1299000,
      currency: 'RUB',
      available: true,
    });
    expect(fixtureFetch).toHaveBeenCalledTimes(1);
  });
});
