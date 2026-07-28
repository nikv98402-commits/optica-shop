import { describe, expect, it, vi } from 'vitest';
import type { AdapterContext, IngestionSource } from '../ingestion.ts';
import {
  deduplicateNormalizedObservations,
  normalizeObservation,
} from '../normalization.ts';
import { BASE_NORMALIZATION_INPUT, CATALOG_FIXTURE } from '../normalization.fixtures.ts';
import { viluGitHubRawCatalogAdapter } from './vilu-github-raw-catalog.ts';
import { viluPublicCatalogAdapter } from './vilu-public-catalog.ts';

const SOURCE: IngestionSource = {
  id: '00000000-0000-4000-8000-000000000072',
  name: 'ViLu GitHub raw catalog bounded canary',
  adapterKey: 'vilu_github_raw_catalog',
  adapterVersion: '1.0.0',
  sourceType: 'feed',
  approvedOrigins: ['https://vilu.store'],
  approvedFetchOrigins: ['https://raw.githubusercontent.com'],
  rateLimitPerMinute: 1,
  concurrencyLimit: 1,
  termsReviewedAt: '2026-07-27T00:00:00.000Z',
  robotsStatus: 'not_applicable',
  enabled: true,
};

const FEED_URL =
  'https://raw.githubusercontent.com/nikv98402-commits/optica-shop/main/public/offer-finder/aurora-crystal.json';

const OFFER = {
  id: 'vilu-aurora-crystal-52',
  offerUrl: 'https://vilu.store/products/aurora-crystal',
  listedPriceMinor: 1_299_000,
  regularPriceMinor: 1_299_000,
  currency: 'RUB',
  availability: 'in_stock',
  title: 'ViLu Aurora Crystal 52',
  brand: 'ViLu',
  model: 'Aurora Crystal',
  productType: 'eyeglasses',
  sku: 'VILU-AURORA-52',
  mpn: 'AURORA-52',
};

function context(document: unknown): AdapterContext {
  return {
    source: SOURCE,
    checkpoint: {},
    fetch: vi.fn().mockResolvedValue({
      url: FEED_URL,
      status: 200,
      contentType: 'text/plain',
      body: JSON.stringify(document),
      json: <T>() => document as T,
    }),
  };
}

describe('ViLu GitHub raw catalog adapter', () => {
  it('uses a distinct adapter without changing the first source', () => {
    expect(viluGitHubRawCatalogAdapter.key).toBe('vilu_github_raw_catalog');
    expect(viluPublicCatalogAdapter.key).toBe('vilu_public_catalog');
  });

  it('collects one exact Aurora Crystal offer and normalizes it idempotently', async () => {
    const adapterContext = context({ schemaVersion: '1.0', offers: [OFFER] });
    const [observation] = await viluGitHubRawCatalogAdapter.collect(adapterContext);
    expect(adapterContext.fetch).toHaveBeenCalledTimes(1);
    expect(adapterContext.fetch).toHaveBeenCalledWith(FEED_URL, {
      accept: ['application/json', 'text/plain'],
    });
    expect(observation.sourceUrl).toBe(OFFER.offerUrl);
    const normalized = normalizeObservation({
      ...BASE_NORMALIZATION_INPUT,
      sourceId: SOURCE.id,
      externalOfferId: observation.externalOfferId,
      protectedUrl: observation.sourceUrl,
      collectedAt: observation.collectedAt,
      payload: observation.payload,
      catalog: CATALOG_FIXTURE,
    });
    expect(normalized).toMatchObject({
      disposition: 'accepted',
      amountMinor: 1_299_000,
      currency: 'RUB',
      availability: 'in_stock',
      comparableKey: expect.stringMatching(/^sku:[0-9a-f]{24}$/),
      catalogMatch: { automatic: true },
      freshness: 'fresh',
    });
    expect(deduplicateNormalizedObservations([normalized, normalized])).toHaveLength(1);
  });

  it('fails closed on expanded batches, path overrides and external destinations', async () => {
    await expect(
      viluGitHubRawCatalogAdapter.collect(
        context({ schemaVersion: '1.0', offers: [OFFER, { ...OFFER, id: 'second' }] }),
      ),
    ).rejects.toMatchObject({ code: 'POLICY_BLOCKED' });

    vi.stubEnv(
      'OFFER_FINDER_VILU_GITHUB_RAW_FEED_URL',
      'https://raw.githubusercontent.com/nikv98402-commits/optica-shop/main/public/expanded.json',
    );
    await expect(
      viluGitHubRawCatalogAdapter.collect(context({ schemaVersion: '1.0', offers: [OFFER] })),
    ).rejects.toMatchObject({ code: 'DESTINATION_NOT_ALLOWED' });
    vi.unstubAllEnvs();

    await expect(
      viluGitHubRawCatalogAdapter.collect(
        context({
          schemaVersion: '1.0',
          offers: [{ ...OFFER, offerUrl: 'https://example.com/product' }],
        }),
      ),
    ).rejects.toMatchObject({ code: 'DESTINATION_NOT_ALLOWED' });
  });
});
