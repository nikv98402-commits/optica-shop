import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export interface HealthRow {
  source_id: string;
  source_name: string;
  alert_codes: string[];
  fresh_offer_count: number;
  open_incident_count: number;
}

export const DEFAULT_RETRY: RetryOptions = {
  attempts: 3,
  baseDelayMs: 2_000,
  maxDelayMs: 20_000,
  jitterRatio: 0.25,
};

const CRITICAL_ALERTS = new Set([
  'NO_SUCCESS_30H',
  'CONSECUTIVE_FAILURES',
  'STALE_HEARTBEAT',
  'MISSING_TERMINAL_HEARTBEAT',
]);

const FRESH_OFFER_REQUIRED_SOURCE_IDS = new Set([
  '00000000-0000-4000-8000-000000000068',
]);

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY,
  sleep: (delayMs: number) => Promise<void> = (delayMs) =>
    new Promise((resolve) => setTimeout(resolve, delayMs)),
  random: () => number = Math.random,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === options.attempts) break;
      const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
      const jitter = exponential * options.jitterRatio * random();
      await sleep(Math.round(exponential + jitter));
    }
  }
  throw lastError;
}

export function validateSourceId(value: string | undefined): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('OFFER_FINDER_SOURCE_ID must be a UUID');
  }
  return value;
}

export function criticalAlerts(rows: HealthRow[]): string[] {
  return rows.flatMap((row) =>
    row.alert_codes
      .filter((code) =>
        CRITICAL_ALERTS.has(code)
        || (code === 'NO_FRESH_OFFERS' && FRESH_OFFER_REQUIRED_SOURCE_IDS.has(row.source_id)))
      .map((code) => `${row.source_id}:${code}`),
  );
}

function runNodeScript(script: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', script, ...args], {
      stdio: 'inherit',
      env: process.env,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function readHealth(sourceId: string): Promise<HealthRow[]> {
  const url = process.env.OFFER_FINDER_SUPABASE_URL;
  const key = process.env.OFFER_FINDER_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Offer Finder Supabase secrets are not configured');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc('offer_operations_health_v1', {
    p_source_id: sourceId,
  });
  if (error) throw new Error(`Health RPC failed: ${error.code ?? 'unknown'}`);
  return (data ?? []) as HealthRow[];
}

async function main(): Promise<void> {
  const sourceId = validateSourceId(process.env.OFFER_FINDER_SOURCE_ID);
  await withRetry(() => runNodeScript('scripts/offer-finder/canary.ts', ['--live-canary']));
  await withRetry(() =>
    runNodeScript('scripts/offer-finder/normalization-runner.ts', ['--source-id', sourceId]),
  );
  const health = await withRetry(() => readHealth(sourceId));
  console.log(JSON.stringify({ sourceId, health }));
  for (const row of health) {
    for (const alert of row.alert_codes) {
      const isCritical = CRITICAL_ALERTS.has(alert)
        || (alert === 'NO_FRESH_OFFERS' && FRESH_OFFER_REQUIRED_SOURCE_IDS.has(row.source_id));
      console.log(`::${isCritical ? 'error' : 'warning'}::Offer Finder ${row.source_name}: ${alert}`);
    }
  }
  if (criticalAlerts(health).length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Offer Finder operations failed');
    process.exitCode = 1;
  });
}
