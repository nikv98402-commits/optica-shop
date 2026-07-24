import { describe, expect, it } from 'vitest';
import {
  classifyOfferFreshness,
  normalizeOfferSearchQuery,
  type OfferFinderEnvelope,
  type PublicOffer,
} from './contracts';

describe('Offer Finder v1 contracts', () => {
  const now = '2026-07-24T12:00:00.000Z';

  it('uses the approved inclusive freshness boundaries', () => {
    expect(classifyOfferFreshness('2026-07-21T12:00:00.000Z', now)).toBe('fresh');
    expect(classifyOfferFreshness('2026-07-21T11:59:59.999Z', now)).toBe('stale');
    expect(classifyOfferFreshness('2026-07-17T12:00:00.000Z', now)).toBe('stale');
    expect(classifyOfferFreshness('2026-07-17T11:59:59.999Z', now)).toBe('expired');
  });

  it('rejects future and malformed timestamps', () => {
    expect(() => classifyOfferFreshness('2026-07-25T12:00:00.000Z', now)).toThrow(TypeError);
    expect(() => classifyOfferFreshness('not-a-date', now)).toThrow(TypeError);
  });

  it('normalizes safe bounded search inputs', () => {
    expect(normalizeOfferSearchQuery({ market: 'AE', city: ' Dubai ' })).toEqual({
      market: 'AE',
      city: 'Dubai',
      includeStale: false,
      limit: 20,
    });
    expect(normalizeOfferSearchQuery({ market: 'US', limit: 50, includeStale: true }).limit).toBe(50);
  });

  it('rejects unsupported markets, product types and unbounded limits', () => {
    expect(() => normalizeOfferSearchQuery({ market: 'FR' as 'RU' })).toThrow('Unsupported market');
    expect(() => normalizeOfferSearchQuery({
      market: 'RU',
      productType: 'medicine' as 'service',
    })).toThrow('Unsupported product type');
    expect(() => normalizeOfferSearchQuery({ market: 'RU', limit: 51 })).toThrow(RangeError);
  });

  it('keeps the browser response free of raw ingestion fields', () => {
    const offer: PublicOffer = {
      offerId: crypto.randomUUID(),
      market: 'RU',
      merchantId: crypto.randomUUID(),
      merchantName: 'Public merchant',
      storeId: null,
      storeName: null,
      city: null,
      productType: 'eyeglasses',
      productName: 'Model 01',
      brandName: null,
      comparableKey: 'sku:model-01',
      comparisonBasis: 'exact_sku',
      amountMinor: 1299000,
      currency: 'RUB',
      freshness: 'fresh',
      lastVerifiedAt: now,
      expiresAt: '2026-07-31T12:00:00.000Z',
      outboundUrl: 'https://merchant.example/model-01',
      isMinimumFreshPrice: true,
    };
    const envelope: OfferFinderEnvelope<PublicOffer> = {
      data: offer,
      meta: { version: 'v1', generatedAt: now },
      error: null,
    };

    expect(JSON.stringify(envelope)).not.toMatch(/payload|observationHash|diagnostic|sourceUrlHash/);
  });
});
