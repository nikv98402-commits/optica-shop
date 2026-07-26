import { describe, expect, it, vi } from 'vitest';
import { viluPublicCatalogAdapter } from './vilu-public-catalog.ts';
import type { AdapterContext, IngestionSource } from '../ingestion.ts';
import { normalizeObservation } from '../normalization.ts';
import { BASE_NORMALIZATION_INPUT, CATALOG_FIXTURE } from '../normalization.fixtures.ts';

const SOURCE: IngestionSource = {
  id: '00000000-0000-4000-8000-000000000068',
  name: 'ViLu public catalog',
  adapterKey: 'vilu_public_catalog',
  adapterVersion: '1.0.0',
  sourceType: 'feed',
  approvedOrigins: ['https://vilu.store'],
  rateLimitPerMinute: 1,
  concurrencyLimit: 1,
  termsReviewedAt: '2026-07-26T00:00:00.000Z',
  robotsStatus: 'allowed',
  enabled: true,
};

function context(document: unknown): AdapterContext {
  return {
    source: SOURCE,
    checkpoint: {},
    fetch: vi.fn().mockResolvedValue({
      url: 'https://vilu.store/offer-finder/aurora-crystal.json',
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(document),
      json: <T>() => document as T,
    }),
  };
}

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

describe('ViLu public catalog adapter', () => {
  it('collects exactly one catalog-matching real offer', async () => {
    const adapterContext = context({ schemaVersion: '1.0', offers: [OFFER] });
    const observations = await viluPublicCatalogAdapter.collect(adapterContext);
    expect(adapterContext.fetch).toHaveBeenCalledTimes(1);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      externalOfferId: OFFER.id,
      sourceUrl: OFFER.offerUrl,
      payload: {
        listedPriceMinor: OFFER.listedPriceMinor,
        currency: 'RUB',
        availability: 'in_stock',
        sku: 'VILU-AURORA-52',
      },
    });
    const normalized = normalizeObservation({
      ...BASE_NORMALIZATION_INPUT,
      externalOfferId: observations[0].externalOfferId,
      protectedUrl: observations[0].sourceUrl,
      collectedAt: observations[0].collectedAt,
      payload: observations[0].payload,
      catalog: CATALOG_FIXTURE,
    });
    expect(normalized).toMatchObject({
      disposition: 'accepted',
      amountMinor: OFFER.listedPriceMinor,
      currency: 'RUB',
      availability: 'in_stock',
      catalogMatch: { automatic: true },
      freshness: 'fresh',
    });
  });

  it('blocks a response that expands beyond the bounded canary', async () => {
    await expect(
      viluPublicCatalogAdapter.collect(
        context({ schemaVersion: '1.0', offers: [OFFER, { ...OFFER, id: 'second' }] }),
      ),
    ).rejects.toMatchObject({ code: 'POLICY_BLOCKED' });
  });

  it('quarantines invalid pricing and blocks external offer URLs', async () => {
    await expect(
      viluPublicCatalogAdapter.collect(
        context({ schemaVersion: '1.0', offers: [{ ...OFFER, listedPriceMinor: -1 }] }),
      ),
    ).rejects.toMatchObject({ code: 'MALFORMED_OBSERVATION' });
    await expect(
      viluPublicCatalogAdapter.collect(
        context({ schemaVersion: '1.0', offers: [{ ...OFFER, offerUrl: 'https://example.com/x' }] }),
      ),
    ).rejects.toMatchObject({ code: 'DESTINATION_NOT_ALLOWED' });
    await expect(
      viluPublicCatalogAdapter.collect(
        context({ schemaVersion: '1.0', offers: [{ ...OFFER, offerUrl: 'https://vilu.store/products/other' }] }),
      ),
    ).rejects.toMatchObject({ code: 'DESTINATION_NOT_ALLOWED' });
  });

  it('blocks a same-origin feed override outside the approved bounded path', async () => {
    vi.stubEnv(
      'OFFER_FINDER_VILU_PUBLIC_FEED_URL',
      'https://vilu.store/offer-finder/expanded.json',
    );
    await expect(
      viluPublicCatalogAdapter.collect(
        context({ schemaVersion: '1.0', offers: [OFFER] }),
      ),
    ).rejects.toMatchObject({ code: 'DESTINATION_NOT_ALLOWED' });
    vi.unstubAllEnvs();
  });
});
