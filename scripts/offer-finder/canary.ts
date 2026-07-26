import {
  AdapterRegistry,
  IngestionError,
  IngestionRunner,
  RestrictedFetcher,
  SupabaseIngestionStore,
  type AdapterObservation,
  type IngestionSource,
  type SourceAdapter,
} from './ingestion.ts';
import { pathToFileURL } from 'node:url';

interface CanaryDocument {
  offers: Array<{
    id: string;
    listedPriceMinor: number;
    currency: string;
    available: boolean;
  }>;
}

export const CANARY_SOURCE: IngestionSource = {
  id: '00000000-0000-4000-8000-000000000054',
  name: 'ViLu fixture canary',
  adapterKey: 'vilu_fixture_canary',
  adapterVersion: '1.0.0',
  sourceType: 'api',
  approvedOrigins: ['https://example.com'],
  rateLimitPerMinute: 2,
  concurrencyLimit: 1,
  termsReviewedAt: '2026-07-25T00:00:00.000Z',
  robotsStatus: 'not_applicable',
  enabled: true,
};

export const canaryAdapter: SourceAdapter = {
  key: 'vilu_fixture_canary',
  version: '1.0.0',
  async collect(context): Promise<AdapterObservation[]> {
    const canaryUrl = process.env.OFFER_FINDER_CANARY_URL;
    if (!canaryUrl) {
      throw new IngestionError('POLICY_BLOCKED', 'OFFER_FINDER_CANARY_URL is not configured');
    }
    const response = await context.fetch(canaryUrl, {
      accept: ['application/json'],
    });
    const document = response.json<CanaryDocument>();
    if (!Array.isArray(document.offers)) {
      throw new IngestionError('MALFORMED_OBSERVATION', 'Canary document does not contain offers');
    }
    return document.offers.map((offer) => ({
      externalOfferId: offer.id,
      sourceUrl: response.url,
      payload: {
        listedPriceMinor: offer.listedPriceMinor,
        currency: offer.currency,
        available: offer.available,
      },
      collectedAt: new Date().toISOString(),
      contentType: response.contentType,
    }));
  },
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const live = process.argv.includes('--live-canary');
  if (!dryRun && !live) {
    throw new Error('Choose --dry-run (fixtures/tests only) or --live-canary explicitly');
  }
  if (dryRun) {
    console.log('Offer Finder canary is fixture-only in CI; no network or database write was attempted.');
    return;
  }

  const registry = new AdapterRegistry().register(canaryAdapter);
  const store = SupabaseIngestionStore.fromEnvironment();
  const sourceId = process.env.OFFER_FINDER_SOURCE_ID;
  if (!sourceId) throw new Error('OFFER_FINDER_SOURCE_ID is required for a live canary');
  const source = await store.loadSource(sourceId);
  const runner = new IngestionRunner(
    registry,
    new RestrictedFetcher(),
    store,
  );
  const result = await runner.run(source, 'canary');
  console.log(
    JSON.stringify({
      status: result.status,
      sourceId: result.sourceId,
      counters: result.counters,
    }),
  );
  if (result.status === 'failed') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof IngestionError ? error.code : 'UNEXPECTED_ERROR');
    process.exitCode = 1;
  });
}
