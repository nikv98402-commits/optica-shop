import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { performance } from 'node:perf_hooks';

const DEFAULT_ROUTES = ['/', '/assistant', '/dashboard', '/checkout', '/profile'];
const RESOURCE_PATTERN = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi;

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function round(value) {
  return value == null ? null : Math.round(value * 10) / 10;
}

function requestOnce(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const timings = { dnsMs: null, tcpMs: null, tlsMs: null, ttfbMs: null, totalMs: null };
    let lookupAt = startedAt;
    let connectAt = startedAt;
    const req = request(
      url,
      {
        agent: false,
        headers: { 'user-agent': 'ViLu-production-network-measurement/1.0' },
      },
      (response) => {
        timings.ttfbMs = performance.now() - startedAt;
        let bytes = 0;
        const chunks = [];
        response.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes <= 2_000_000) chunks.push(chunk);
        });
        response.on('end', () => {
          timings.totalMs = performance.now() - startedAt;
          resolve({
            url,
            status: response.statusCode ?? null,
            headers: {
              location: response.headers.location ?? null,
              cache: response.headers['x-cache'] ?? null,
              servedBy: response.headers['x-served-by'] ?? null,
              age: response.headers.age ?? null,
              githubRequestId: response.headers['x-github-request-id'] ?? null,
            },
            bytes,
            body: Buffer.concat(chunks).toString('utf8'),
            timings: Object.fromEntries(
              Object.entries(timings).map(([key, value]) => [key, round(value)]),
            ),
          });
        });
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timeout after ${timeoutMs}ms`)));
    req.on('socket', (socket) => {
      socket.once('lookup', () => {
        const now = performance.now();
        timings.dnsMs = now - startedAt;
        lookupAt = now;
      });
      socket.once('connect', () => {
        const now = performance.now();
        timings.tcpMs = now - lookupAt;
        connectAt = now;
      });
      socket.once('secureConnect', () => {
        timings.tlsMs = performance.now() - connectAt;
      });
    });
    req.once('error', reject);
    req.end();
  });
}

async function requestWithRedirects(url, timeoutMs, maxRedirects = 5) {
  const chain = [];
  let current = url;
  for (let index = 0; index <= maxRedirects; index += 1) {
    const result = await requestOnce(current, timeoutMs);
    chain.push(result);
    if (!result.headers.location || ![301, 302, 303, 307, 308].includes(result.status)) return chain;
    current = new URL(result.headers.location, current).href;
  }
  throw new Error(`redirect limit exceeded for ${url}`);
}

function extractInitialResources(html, baseUrl) {
  const resources = new Set();
  for (const match of html.matchAll(RESOURCE_PATTERN)) {
    const raw = match[1];
    if (raw.startsWith('data:')) continue;
    const url = new URL(raw, baseUrl);
    if (url.origin === new URL(baseUrl).origin) resources.add(url.href);
  }
  return [...resources];
}

async function measureRoute(baseUrl, route, timeoutMs) {
  const url = new URL(route, baseUrl).href;
  const redirectChain = await requestWithRedirects(url, timeoutMs);
  const final = redirectChain.at(-1);
  const resources = extractInitialResources(final.body, final.url);
  const resourceMeasurements = [];
  for (const resource of resources) {
    const chain = await requestWithRedirects(resource, timeoutMs);
    const measured = chain.at(-1);
    resourceMeasurements.push({
      url: measured.url,
      status: measured.status,
      bytes: measured.bytes,
      timings: measured.timings,
      redirects: chain.length - 1,
    });
  }
  return {
    route,
    status: final.status,
    redirects: redirectChain.length - 1,
    timings: final.timings,
    headers: final.headers,
    resources: resourceMeasurements,
  };
}

async function main() {
  const baseUrl = (process.env.VILU_NETWORK_BASE_URL ?? 'https://vilu.store').replace(/\/$/, '');
  const iterations = Number.parseInt(process.env.VILU_NETWORK_ITERATIONS ?? '3', 10);
  const timeoutMs = Number.parseInt(process.env.VILU_NETWORK_TIMEOUT_MS ?? '30000', 10);
  const routes = (process.env.VILU_NETWORK_ROUTES ?? DEFAULT_ROUTES.join(','))
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean);
  const dns = await lookup(new URL(baseUrl).hostname, { all: true, verbatim: true });
  const runs = [];

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    for (const route of routes) {
      const startedAt = new Date().toISOString();
      try {
        runs.push({ iteration, startedAt, ...(await measureRoute(baseUrl, route, timeoutMs)) });
      } catch (error) {
        runs.push({ iteration, startedAt, route, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const successful = runs.filter((run) => !run.error);
  const totals = successful.map((run) => run.timings.totalMs);
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    resolvedAddresses: dns.map(({ address, family }) => ({ address, family })),
    iterations,
    routes,
    successfulRuns: successful.length,
    failedRuns: runs.length - successful.length,
    totalMs: {
      p50: round(percentile(totals, 0.5)),
      p95: round(percentile(totals, 0.95)),
      max: totals.length === 0 ? null : round(Math.max(...totals)),
    },
    runs,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failedRuns > 0) process.exitCode = 1;
}

await main();
