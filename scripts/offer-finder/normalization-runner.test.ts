import { describe, expect, it } from 'vitest';
import {
  NormalizationRunner,
  type NormalizationStore,
  type PendingNormalizationRow,
} from './normalization-runner.ts';
import { BASE_NORMALIZATION_INPUT, CATALOG_FIXTURE } from './normalization.fixtures.ts';

function row(overrides: Partial<PendingNormalizationRow> = {}): PendingNormalizationRow {
  return {
    observationId: BASE_NORMALIZATION_INPUT.rawObservationId,
    sourceId: BASE_NORMALIZATION_INPUT.sourceId,
    merchantId: BASE_NORMALIZATION_INPUT.merchantId,
    marketId: BASE_NORMALIZATION_INPUT.marketId,
    externalOfferId: BASE_NORMALIZATION_INPUT.externalOfferId,
    protectedUrl: BASE_NORMALIZATION_INPUT.protectedUrl,
    collectedAt: BASE_NORMALIZATION_INPUT.collectedAt,
    payload: BASE_NORMALIZATION_INPUT.payload,
    ...overrides,
  };
}

describe('Offer Finder normalization runner', () => {
  it('publishes exact matches and routes invalid evidence to quarantine review', async () => {
    const published: string[] = [];
    const reviewed: string[] = [];
    const rows = [
      row(),
      row({
        observationId: '00000000-0000-4000-8000-000000000559',
        collectedAt: 'not-a-date',
      }),
    ];
    const store: NormalizationStore = {
      loadPending: async () => rows,
      loadCatalog: async () => CATALOG_FIXTURE,
      publish: async (pending) => {
        published.push(pending.observationId);
        return { status: 'published', offerId: 'offer-id', reviewId: null };
      },
      recordReview: async (pending) => {
        reviewed.push(pending.observationId);
        return 'review-id';
      },
    };
    const summary = await new NormalizationRunner(store).run();
    expect(summary).toEqual({ processed: 2, published: 1, review: 0, quarantined: 1 });
    expect(published).toEqual([rows[0].observationId]);
    expect(reviewed).toEqual([rows[1].observationId]);
  });

  it('routes fuzzy and unmatched catalog records to review rather than publishing', async () => {
    const reviewed: string[] = [];
    const store: NormalizationStore = {
      loadPending: async () => [
        row({
          payload: {
            ...BASE_NORMALIZATION_INPUT.payload,
            sku: 'UNKNOWN',
            productId: undefined,
            gtin: undefined,
            mpn: undefined,
            title: 'Unrelated frame',
          },
        }),
      ],
      loadCatalog: async () => CATALOG_FIXTURE,
      publish: async () => {
        throw new Error('must not publish');
      },
      recordReview: async (pending) => {
        reviewed.push(pending.observationId);
        return 'review-id';
      },
    };
    await expect(new NormalizationRunner(store).run()).resolves.toEqual({
      processed: 1,
      published: 0,
      review: 1,
      quarantined: 0,
    });
    expect(reviewed).toHaveLength(1);
  });
});
