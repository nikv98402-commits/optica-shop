import { createHash, randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SourceType =
  | 'api'
  | 'feed'
  | 'json_ld'
  | 'embedded_json'
  | 'public_html'
  | 'manual_file';
export type RobotsStatus = 'unknown' | 'allowed' | 'restricted' | 'disallowed' | 'not_applicable';
export type RunTrigger = 'schedule' | 'manual' | 'canary';
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'degraded' | 'failed' | 'cancelled';

export interface IngestionSource {
  id: string;
  name: string;
  adapterKey: string;
  adapterVersion: string;
  sourceType: SourceType;
  /** Origins that may be exposed as outbound product links. */
  approvedOrigins: string[];
  /** Origins that the ingestion transport may fetch. Falls back to approvedOrigins for legacy rows. */
  approvedFetchOrigins?: string[];
  rateLimitPerMinute: number;
  concurrencyLimit: number;
  termsReviewedAt: string | null;
  robotsStatus: RobotsStatus;
  enabled: boolean;
}

export interface AdapterObservation {
  externalOfferId: string;
  sourceUrl: string;
  payload: Record<string, unknown>;
  collectedAt: string;
  contentType?: string;
}

export interface StoredObservation extends AdapterObservation {
  runId: string;
  sourceId: string;
  sourceUrlHash: string;
  protectedUrl: string;
  observationHash: string;
  parserVersion: string;
}

export interface AdapterContext {
  source: IngestionSource;
  fetch: (url: string, init?: RestrictedRequest) => Promise<RestrictedResponse>;
  checkpoint: Record<string, unknown>;
}

export interface SourceAdapter {
  readonly key: string;
  readonly version: string;
  collect(context: AdapterContext): Promise<AdapterObservation[]>;
}

export interface RestrictedRequest {
  accept?: readonly string[];
  method?: 'GET' | 'HEAD';
}

export interface RestrictedResponse {
  url: string;
  status: number;
  contentType: string;
  body: Uint8Array;
  text(): string;
  json<T = unknown>(): T;
}

export interface RunCounters {
  fetched: number;
  observed: number;
  accepted: number;
  updated: number;
  unchanged: number;
  quarantined: number;
  failed: number;
}

export interface RunRecord {
  id: string;
  sourceId: string;
  trigger: RunTrigger;
  status: RunStatus;
  adapterVersion: string;
  checkpoint: Record<string, unknown>;
  counters: RunCounters;
}

export interface QuarantineIncident {
  sourceId: string;
  runId: string;
  deduplicationKey: string;
  kind: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  evidence: Record<string, unknown>;
}

export interface IngestionStore {
  createRun(source: IngestionSource, trigger: RunTrigger): Promise<RunRecord>;
  heartbeat(runId: string, checkpoint: Record<string, unknown>): Promise<void>;
  writeObservations(observations: StoredObservation[]): Promise<{ inserted: number; unchanged: number }>;
  quarantine(incident: QuarantineIncident): Promise<void>;
  finishRun(
    runId: string,
    status: Exclude<RunStatus, 'queued' | 'running'>,
    counters: RunCounters,
    safeErrorCode?: string,
    diagnosticSummary?: string,
  ): Promise<void>;
}

export type SafeErrorCode =
  | 'SOURCE_DISABLED'
  | 'TERMS_REVIEW_REQUIRED'
  | 'ROBOTS_POLICY_BLOCKED'
  | 'ADAPTER_NOT_REGISTERED'
  | 'ADAPTER_VERSION_MISMATCH'
  | 'DESTINATION_NOT_ALLOWED'
  | 'SSRF_BLOCKED'
  | 'UNSUPPORTED_CONTENT_TYPE'
  | 'RESPONSE_TOO_LARGE'
  | 'REQUEST_TIMEOUT'
  | 'RETRY_EXHAUSTED'
  | 'AUTH_OR_PAYWALL'
  | 'CAPTCHA_DETECTED'
  | 'MALFORMED_OBSERVATION'
  | 'PERSISTENCE_FAILED'
  | 'UNEXPECTED_ERROR';

export class IngestionError extends Error {
  readonly code: SafeErrorCode;
  readonly retryable: boolean;

  constructor(
    code: SafeErrorCode,
    message: string,
    retryable = false,
  ) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.name = 'IngestionError';
  }
}

const EMPTY_COUNTERS = (): RunCounters => ({
  fetched: 0,
  observed: 0,
  accepted: 0,
  updated: 0,
  unchanged: 0,
  quarantined: 0,
  failed: 0,
});

const DEFAULT_ACCEPT = [
  'application/json',
  'application/ld+json',
  'text/html',
  'text/csv',
] as const;

const REDACTED_QUERY_KEYS = /token|key|secret|signature|auth|session|email|phone/i;
const BLOCKED_TEXT = /captcha|access denied|verify you are human|payment required|paywall/i;

function safeSummary(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value);
  return raw
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]')
    .slice(0, 500);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sanitizedUrlHash(rawUrl: string): string {
  return sha256(sanitizedUrl(rawUrl));
}

function sanitizedUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  for (const key of [...url.searchParams.keys()]) {
    if (REDACTED_QUERY_KEYS.test(key)) url.searchParams.delete(key);
  }
  url.hash = '';
  return url.toString();
}

function isBlockedIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isBlockedIp(address: string): boolean {
  if (isIP(address) === 4) return isBlockedIpv4(address);
  if (isIP(address) !== 6) return true;
  const normalized = address.toLowerCase().split('%')[0];
  if (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff')
  ) {
    return true;
  }
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? isBlockedIpv4(mapped) : false;
}

export interface RestrictedFetcherOptions {
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  userAgent?: string;
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<string[]>;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
}

class SourceLimiter {
  private nextRequestAt = 0;
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  private readonly perMinute: number;
  private readonly concurrency: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(
    perMinute: number,
    concurrency: number,
    sleep: (milliseconds: number) => Promise<void>,
  ) {
    this.perMinute = perMinute;
    this.concurrency = concurrency;
    this.sleep = sleep;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.active += 1;
    try {
      const interval = Math.ceil(60_000 / this.perMinute);
      const wait = Math.max(0, this.nextRequestAt - Date.now());
      this.nextRequestAt = Math.max(Date.now(), this.nextRequestAt) + interval;
      if (wait) await this.sleep(wait);
      return await operation();
    } finally {
      this.active -= 1;
      this.waiters.shift()?.();
    }
  }
}

export class RestrictedFetcher {
  private readonly options: Required<RestrictedFetcherOptions>;
  private readonly limiters = new Map<string, SourceLimiter>();

  constructor(options: RestrictedFetcherOptions = {}) {
    this.options = {
      timeoutMs: options.timeoutMs ?? 8_000,
      maxResponseBytes: options.maxResponseBytes ?? 2_000_000,
      maxRedirects: options.maxRedirects ?? 3,
      maxRetries: options.maxRetries ?? 2,
      baseBackoffMs: options.baseBackoffMs ?? 250,
      userAgent: options.userAgent ?? 'ViLuOfferFinder/0.1 (+https://vilu.store/terms)',
      fetchImpl: options.fetchImpl ?? fetch,
      resolveHost:
        options.resolveHost ??
        (async (hostname) => (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address)),
      sleep: options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))),
      random: options.random ?? Math.random,
    };
  }

  forSource(source: IngestionSource): AdapterContext['fetch'] {
    const limiter =
      this.limiters.get(source.id) ??
      new SourceLimiter(source.rateLimitPerMinute, source.concurrencyLimit, this.options.sleep);
    this.limiters.set(source.id, limiter);
    return (url, init) => limiter.run(() => this.request(source, url, init));
  }

  private async validateDestination(source: IngestionSource, rawUrl: string): Promise<URL> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new IngestionError('DESTINATION_NOT_ALLOWED', 'Invalid adapter destination');
    }
    if (url.protocol !== 'https:' || url.username || url.password || isIP(url.hostname)) {
      throw new IngestionError('DESTINATION_NOT_ALLOWED', 'Only credential-free HTTPS hostnames are allowed');
    }
    const approved = new Set(
      (source.approvedFetchOrigins ?? source.approvedOrigins)
        .map((origin) => new URL(origin).origin),
    );
    if (!approved.has(url.origin)) {
      throw new IngestionError('DESTINATION_NOT_ALLOWED', 'Destination origin is not allowlisted');
    }
    const addresses = await this.options.resolveHost(url.hostname);
    if (!addresses.length || addresses.some(isBlockedIp)) {
      throw new IngestionError('SSRF_BLOCKED', 'Destination resolved to a blocked network');
    }
    return url;
  }

  private async request(
    source: IngestionSource,
    rawUrl: string,
    init: RestrictedRequest = {},
  ): Promise<RestrictedResponse> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        return await this.requestOnce(source, rawUrl, init);
      } catch (error) {
        lastError = error;
        const retryable = error instanceof IngestionError && error.retryable;
        if (!retryable || attempt === this.options.maxRetries) break;
        const exponential = this.options.baseBackoffMs * 2 ** attempt;
        const jitter = Math.floor(exponential * 0.25 * this.options.random());
        await this.options.sleep(exponential + jitter);
      }
    }
    if (lastError instanceof IngestionError && !lastError.retryable) throw lastError;
    throw new IngestionError('RETRY_EXHAUSTED', 'Bounded request retries exhausted');
  }

  private async requestOnce(
    source: IngestionSource,
    rawUrl: string,
    init: RestrictedRequest,
  ): Promise<RestrictedResponse> {
    let url = await this.validateDestination(source, rawUrl);
    const accept = init.accept ?? DEFAULT_ACCEPT;

    for (let redirect = 0; redirect <= this.options.maxRedirects; redirect += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
      let response: Response;
      try {
        response = await this.options.fetchImpl(url, {
          method: init.method ?? 'GET',
          redirect: 'manual',
          credentials: 'omit',
          headers: {
            accept: accept.join(', '),
            'user-agent': this.options.userAgent,
          },
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new IngestionError('REQUEST_TIMEOUT', 'Source request timed out', true);
        }
        throw new IngestionError('UNEXPECTED_ERROR', safeSummary(error), true);
      } finally {
        clearTimeout(timeout);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirect === this.options.maxRedirects) {
          throw new IngestionError('DESTINATION_NOT_ALLOWED', 'Redirect limit exceeded');
        }
        url = await this.validateDestination(source, new URL(location, url).toString());
        continue;
      }
      if ([401, 402, 403, 407].includes(response.status)) {
        throw new IngestionError('AUTH_OR_PAYWALL', 'Authentication or paywall boundary encountered');
      }
      if ([408, 425, 429].includes(response.status) || response.status >= 500) {
        throw new IngestionError('UNEXPECTED_ERROR', `Retryable source status ${response.status}`, true);
      }
      if (!response.ok) {
        throw new IngestionError('UNEXPECTED_ERROR', `Source status ${response.status}`);
      }

      const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
      if (!accept.some((allowed) => contentType === allowed || contentType.startsWith(`${allowed}+`))) {
        throw new IngestionError('UNSUPPORTED_CONTENT_TYPE', 'Source returned an unsupported content type');
      }
      const contentLength = Number(response.headers.get('content-length') ?? 0);
      if (contentLength > this.options.maxResponseBytes) {
        throw new IngestionError('RESPONSE_TOO_LARGE', 'Source response exceeds the configured byte limit');
      }
      const chunks: Uint8Array[] = [];
      let received = 0;
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > this.options.maxResponseBytes) {
            await reader.cancel();
            throw new IngestionError(
              'RESPONSE_TOO_LARGE',
              'Source response exceeds the configured byte limit',
            );
          }
          chunks.push(value);
        }
      }
      const body = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const text = new TextDecoder().decode(body);
      if (BLOCKED_TEXT.test(text.slice(0, 20_000))) {
        throw new IngestionError(
          /captcha|verify you are human/i.test(text) ? 'CAPTCHA_DETECTED' : 'AUTH_OR_PAYWALL',
          'Source presented an access-control challenge',
        );
      }
      return {
        url: url.toString(),
        status: response.status,
        contentType,
        body,
        text: () => text,
        json: <T>() => JSON.parse(text) as T,
      };
    }
    throw new IngestionError('DESTINATION_NOT_ALLOWED', 'Redirect limit exceeded');
  }
}

export class AdapterRegistry {
  private readonly adapters = new Map<string, SourceAdapter>();

  register(adapter: SourceAdapter): this {
    if (this.adapters.has(adapter.key)) throw new TypeError(`Duplicate adapter key: ${adapter.key}`);
    this.adapters.set(adapter.key, adapter);
    return this;
  }

  resolve(source: IngestionSource): SourceAdapter {
    const adapter = this.adapters.get(source.adapterKey);
    if (!adapter) throw new IngestionError('ADAPTER_NOT_REGISTERED', 'Configured adapter is not registered');
    if (adapter.version !== source.adapterVersion) {
      throw new IngestionError('ADAPTER_VERSION_MISMATCH', 'Configured adapter version does not match code');
    }
    return adapter;
  }
}

function assertPolicy(source: IngestionSource): void {
  if (!source.enabled) throw new IngestionError('SOURCE_DISABLED', 'Source is disabled');
  if (!source.termsReviewedAt || Number.isNaN(Date.parse(source.termsReviewedAt))) {
    throw new IngestionError('TERMS_REVIEW_REQUIRED', 'Terms review must be recorded before ingestion');
  }
  const robotsRequired = ['json_ld', 'embedded_json', 'public_html'].includes(source.sourceType);
  if (
    source.robotsStatus === 'disallowed' ||
    source.robotsStatus === 'restricted' ||
    source.robotsStatus === 'unknown' ||
    (robotsRequired && source.robotsStatus !== 'allowed')
  ) {
    throw new IngestionError('ROBOTS_POLICY_BLOCKED', 'Recorded robots policy does not allow ingestion');
  }
  if (!source.approvedOrigins.length) {
    throw new IngestionError('DESTINATION_NOT_ALLOWED', 'Source has no approved outbound origins');
  }
  if (!(source.approvedFetchOrigins ?? source.approvedOrigins).length) {
    throw new IngestionError('DESTINATION_NOT_ALLOWED', 'Source has no approved fetch origins');
  }
}

function validateObservation(
  observation: AdapterObservation,
  source: IngestionSource,
  runId: string,
  parserVersion: string,
): StoredObservation {
  if (
    !observation.externalOfferId.trim() ||
    !observation.collectedAt ||
    Number.isNaN(Date.parse(observation.collectedAt)) ||
    !observation.payload ||
    Array.isArray(observation.payload)
  ) {
    throw new IngestionError('MALFORMED_OBSERVATION', 'Adapter emitted a malformed observation');
  }
  const url = new URL(observation.sourceUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !source.approvedOrigins.some((origin) => new URL(origin).origin === url.origin)
  ) {
    throw new IngestionError('DESTINATION_NOT_ALLOWED', 'Observation URL is outside approved origins');
  }
  return {
    ...observation,
    runId,
    sourceId: source.id,
    externalOfferId: observation.externalOfferId.trim(),
    sourceUrlHash: sanitizedUrlHash(observation.sourceUrl),
    protectedUrl: sanitizedUrl(observation.sourceUrl),
    observationHash: sha256(
      canonicalJson({
        externalOfferId: observation.externalOfferId.trim(),
        payload: observation.payload,
      }),
    ),
    parserVersion,
  };
}

export class IngestionRunner {
  private readonly registry: AdapterRegistry;
  private readonly fetcher: RestrictedFetcher;
  private readonly store: IngestionStore;

  constructor(
    registry: AdapterRegistry,
    fetcher: RestrictedFetcher,
    store: IngestionStore,
  ) {
    this.registry = registry;
    this.fetcher = fetcher;
    this.store = store;
  }

  async run(
    source: IngestionSource,
    trigger: RunTrigger,
    checkpoint: Record<string, unknown> = {},
  ): Promise<RunRecord> {
    const counters = EMPTY_COUNTERS();
    let run: RunRecord | null = null;
    try {
      assertPolicy(source);
      const adapter = this.registry.resolve(source);
      run = await this.store.createRun(source, trigger);
      await this.store.heartbeat(run.id, checkpoint);
      const observations = await adapter.collect({
        source,
        fetch: async (...args) => {
          const response = await this.fetcher.forSource(source)(...args);
          counters.fetched += 1;
          return response;
        },
        checkpoint,
      });
      counters.observed = observations.length;

      const valid: StoredObservation[] = [];
      for (const observation of observations) {
        try {
          valid.push(validateObservation(observation, source, run.id, adapter.version));
        } catch (error) {
          counters.quarantined += 1;
          await this.store.quarantine({
            sourceId: source.id,
            runId: run.id,
            deduplicationKey: sha256(
              `${source.id}:${error instanceof IngestionError ? error.code : 'UNEXPECTED_ERROR'}`,
            ),
            kind: error instanceof IngestionError ? error.code : 'UNEXPECTED_ERROR',
            severity: 'error',
            evidence: { summary: safeSummary(error) },
          });
        }
      }

      const result = valid.length
        ? await this.store.writeObservations(valid)
        : { inserted: 0, unchanged: 0 };
      counters.accepted = result.inserted;
      counters.unchanged = result.unchanged;
      const status = counters.quarantined ? 'degraded' : 'succeeded';
      await this.store.finishRun(run.id, status, counters);
      return { ...run, status, counters, checkpoint };
    } catch (error) {
      const ingestionError =
        error instanceof IngestionError
          ? error
          : new IngestionError('UNEXPECTED_ERROR', safeSummary(error));
      counters.failed += 1;
      if (run) {
        await this.store.finishRun(
          run.id,
          'failed',
          counters,
          ingestionError.code,
          safeSummary(ingestionError),
        );
        return { ...run, status: 'failed', counters, checkpoint };
      }
      throw ingestionError;
    }
  }
}

export class SupabaseIngestionStore implements IngestionStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): SupabaseIngestionStore {
    const url = env.OFFER_FINDER_SUPABASE_URL;
    const key = env.OFFER_FINDER_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new IngestionError('PERSISTENCE_FAILED', 'Supabase ingestion secrets are not configured');
    }
    return new SupabaseIngestionStore(
      createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
    );
  }

  async loadSource(sourceId: string): Promise<IngestionSource> {
    const legacyFields =
      'id,name,adapter_key,adapter_version,source_type,approved_origins,rate_limit_per_minute,concurrency_limit,terms_reviewed_at,robots_status,enabled';
    type SourceRow = {
      id: string;
      name: string;
      adapter_key: string;
      adapter_version: string;
      source_type: SourceType;
      approved_origins: string[];
      approved_fetch_origins?: string[] | null;
      rate_limit_per_minute: number;
      concurrency_limit: number;
      terms_reviewed_at: string | null;
      robots_status: RobotsStatus;
      enabled: boolean;
    };
    const currentResult = await this.client
      .from('offer_sources')
      .select(
        `${legacyFields},approved_fetch_origins`,
      )
      .eq('id', sourceId)
      .single();
    let sourceRow = currentResult.data as unknown as SourceRow | null;
    let sourceError = currentResult.error;
    if (sourceError && ['42703', 'PGRST204'].includes(sourceError.code)) {
      const legacyResult = await this.client
        .from('offer_sources')
        .select(legacyFields)
        .eq('id', sourceId)
        .single();
      sourceRow = legacyResult.data as unknown as SourceRow | null;
      sourceError = legacyResult.error;
    }
    if (sourceError || !sourceRow) {
      throw new IngestionError(
        'PERSISTENCE_FAILED',
        safeSummary(sourceError ?? 'Source not found'),
      );
    }
    return {
      id: sourceRow.id,
      name: sourceRow.name,
      adapterKey: sourceRow.adapter_key,
      adapterVersion: sourceRow.adapter_version,
      sourceType: sourceRow.source_type,
      approvedOrigins: sourceRow.approved_origins,
      approvedFetchOrigins: sourceRow.approved_fetch_origins ?? sourceRow.approved_origins,
      rateLimitPerMinute: sourceRow.rate_limit_per_minute,
      concurrencyLimit: sourceRow.concurrency_limit,
      termsReviewedAt: sourceRow.terms_reviewed_at,
      robotsStatus: sourceRow.robots_status,
      enabled: sourceRow.enabled,
    } as IngestionSource;
  }

  async createRun(source: IngestionSource, trigger: RunTrigger): Promise<RunRecord> {
    const id = randomUUID();
    const { error } = await this.client.from('offer_ingestion_runs').insert({
      id,
      source_id: source.id,
      trigger,
      status: 'running',
      adapter_version: source.adapterVersion,
      checkpoint: {},
      started_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    });
    if (error) throw new IngestionError('PERSISTENCE_FAILED', safeSummary(error));
    return {
      id,
      sourceId: source.id,
      trigger,
      status: 'running',
      adapterVersion: source.adapterVersion,
      checkpoint: {},
      counters: EMPTY_COUNTERS(),
    };
  }

  async heartbeat(runId: string, checkpoint: Record<string, unknown>): Promise<void> {
    const { error } = await this.client
      .from('offer_ingestion_runs')
      .update({ heartbeat_at: new Date().toISOString(), checkpoint })
      .eq('id', runId);
    if (error) throw new IngestionError('PERSISTENCE_FAILED', safeSummary(error));
  }

  async writeObservations(
    observations: StoredObservation[],
  ): Promise<{ inserted: number; unchanged: number }> {
    const rows = observations.map((item) => ({
      run_id: item.runId,
      source_id: item.sourceId,
      external_offer_id: item.externalOfferId,
      source_url_hash: item.sourceUrlHash,
      protected_url: item.protectedUrl,
      observation_hash: item.observationHash,
      payload_json: item.payload,
      collected_at: item.collectedAt,
      content_type: item.contentType,
      parser_version: item.parserVersion,
    }));
    const { data, error } = await this.client
      .from('offer_raw_observations')
      .upsert(rows, {
        onConflict: 'source_id,external_offer_id,observation_hash',
        ignoreDuplicates: true,
      })
      .select('id');
    if (error) throw new IngestionError('PERSISTENCE_FAILED', safeSummary(error));
    const inserted = data?.length ?? 0;
    return { inserted, unchanged: rows.length - inserted };
  }

  async quarantine(incident: QuarantineIncident): Promise<void> {
    const { error } = await this.client.from('offer_parser_incidents').upsert(
      {
        source_id: incident.sourceId,
        run_id: incident.runId,
        deduplication_key: incident.deduplicationKey,
        kind: incident.kind,
        severity: incident.severity,
        evidence: incident.evidence,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'deduplication_key' },
    );
    if (error) throw new IngestionError('PERSISTENCE_FAILED', safeSummary(error));
  }

  async finishRun(
    runId: string,
    status: Exclude<RunStatus, 'queued' | 'running'>,
    counters: RunCounters,
    safeErrorCode?: string,
    diagnosticSummary?: string,
  ): Promise<void> {
    const { error } = await this.client
      .from('offer_ingestion_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        fetched_count: counters.fetched,
        observed_count: counters.observed,
        accepted_count: counters.accepted,
        updated_count: counters.updated,
        unchanged_count: counters.unchanged,
        quarantined_count: counters.quarantined,
        failed_count: counters.failed,
        safe_error_code: safeErrorCode,
        diagnostic_summary: diagnosticSummary,
      })
      .eq('id', runId);
    if (error) throw new IngestionError('PERSISTENCE_FAILED', safeSummary(error));
  }
}
