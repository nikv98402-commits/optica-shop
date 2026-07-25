import { describe, expect, it } from 'vitest';
import {
  deduplicateNormalizedObservations,
  deriveComparableIdentity,
  findCatalogMatch,
  hasAmbiguousCatalogIdentity,
  normalizeAvailability,
  normalizeIdentity,
  normalizeObservation,
  normalizeText,
  titleSimilarity,
} from './normalization.ts';
import {
  BASE_NORMALIZATION_INPUT,
  CATALOG_FIXTURE,
  FIXTURE_IDS,
} from './normalization.fixtures.ts';

const NOW = '2026-07-25T00:00:00.000Z';

describe('Offer Finder normalization', () => {
  it('normalizes Unicode and whitespace without losing display text', () => {
    expect(normalizeText('  Aurora   Ｃrystal ')).toBe('Aurora Crystal');
  });

  it('normalizes identity punctuation and case', () => {
    expect(normalizeIdentity(' Aurora / CRYSTAL 52 ')).toBe('aurora-crystal-52');
  });

  it.each([
    [{ available: true }, 'in_stock'],
    [{ available: false }, 'out_of_stock'],
    [{ availability: 'PRE-ORDER' }, 'preorder'],
    [{ availability: 'mystery' }, 'unknown'],
  ] as const)('normalizes availability %o', (payload, expected) => {
    expect(normalizeAvailability(payload)).toBe(expected);
  });

  it('prefers exact SKU identity', () => {
    expect(deriveComparableIdentity({ sku: 'SKU-1' })).toMatchObject({
      basis: 'exact_sku',
    });
  });

  it('uses exact product id when SKU is absent', () => {
    expect(deriveComparableIdentity({ productId: 'PRODUCT-1' })).toMatchObject({
      basis: 'exact_product_id',
    });
  });

  it('uses exact service type when product identifiers are absent', () => {
    expect(deriveComparableIdentity({ serviceType: 'Eye exam basic' })).toMatchObject({
      basis: 'exact_service_type',
    });
  });

  it('uses a package only when manually approved', () => {
    expect(
      deriveComparableIdentity({ normalizedPackageId: 'PKG-1', approvedPackage: true }),
    ).toMatchObject({ basis: 'approved_package' });
    expect(deriveComparableIdentity({ normalizedPackageId: 'PKG-1' }).key).toBeNull();
  });

  it('keeps SKU precedence when a distinct product id is also present', () => {
    expect(deriveComparableIdentity({ sku: 'SKU-1', productId: 'PRODUCT-1' })).toMatchObject({
      basis: 'exact_sku',
    });
  });

  it('produces stable but namespaced comparable keys', () => {
    const a = deriveComparableIdentity({ sku: 'sku-1' }).key;
    const b = deriveComparableIdentity({ sku: 'SKU-1' }).key;
    const c = deriveComparableIdentity({ productId: 'SKU-1' }).key;
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^sku:[a-f0-9]{24}$/);
  });

  it('accepts a complete exact observation', () => {
    expect(normalizeObservation(BASE_NORMALIZATION_INPUT, NOW)).toMatchObject({
      disposition: 'accepted',
      reasons: [],
      amountMinor: 1_299_000,
      regularAmountMinor: 1_499_000,
      currency: 'RUB',
      availability: 'in_stock',
      normalizedBrand: 'vilu',
      normalizedModel: 'aurora-crystal',
      comparisonBasis: 'exact_sku',
      freshness: 'fresh',
      catalogMatch: { variantId: FIXTURE_IDS.variant, automatic: true },
    });
  });

  it.each([0, -1, 12.5, Number.NaN, '1299000', undefined])(
    'quarantines invalid price %s',
    (listedPriceMinor) => {
      const result = normalizeObservation(
        {
          ...BASE_NORMALIZATION_INPUT,
          payload: { ...BASE_NORMALIZATION_INPUT.payload, listedPriceMinor },
        },
        NOW,
      );
      expect(result).toMatchObject({ disposition: 'quarantined', amountMinor: null });
      expect(result.reasons).toContain('invalid_price');
    },
  );

  it('quarantines unsupported currency', () => {
    const result = normalizeObservation(
      {
        ...BASE_NORMALIZATION_INPUT,
        payload: { ...BASE_NORMALIZATION_INPUT.payload, currency: 'EUR' },
      },
      NOW,
    );
    expect(result.disposition).toBe('quarantined');
    expect(result.reasons).toContain('unsupported_currency');
  });

  it('keeps regular price only when it is not below listed price', () => {
    const result = normalizeObservation(
      {
        ...BASE_NORMALIZATION_INPUT,
        payload: { ...BASE_NORMALIZATION_INPUT.payload, regularPriceMinor: 1 },
      },
      NOW,
    );
    expect(result.regularAmountMinor).toBeNull();
  });

  it('routes missing identity to review', () => {
    const payload = { ...BASE_NORMALIZATION_INPUT.payload };
    delete payload.sku;
    const result = normalizeObservation({ ...BASE_NORMALIZATION_INPUT, payload }, NOW);
    expect(result.disposition).toBe('review');
    expect(result.reasons).toContain('missing_identity');
  });

  it('routes a price jump above 3x to review', () => {
    const result = normalizeObservation(
      { ...BASE_NORMALIZATION_INPUT, previousAmountMinor: 400_000 },
      NOW,
    );
    expect(result.disposition).toBe('review');
    expect(result.reasons).toContain('price_anomaly');
  });

  it('allows an exact 3x price boundary', () => {
    const result = normalizeObservation(
      { ...BASE_NORMALIZATION_INPUT, previousAmountMinor: 433_000 },
      NOW,
    );
    expect(result.reasons).not.toContain('price_anomaly');
  });

  it.each([
    ['2026-07-22T00:00:00.000Z', 'fresh'],
    ['2026-07-21T23:59:59.999Z', 'stale'],
    ['2026-07-18T00:00:00.000Z', 'stale'],
    ['2026-07-17T23:59:59.999Z', 'expired'],
  ] as const)('classifies freshness boundary %s as %s', (collectedAt, freshness) => {
    expect(
      normalizeObservation({ ...BASE_NORMALIZATION_INPUT, collectedAt }, NOW).freshness,
    ).toBe(freshness);
  });

  it('matches exact SKU automatically', () => {
    expect(findCatalogMatch({ sku: 'vilu-aurora-52' }, CATALOG_FIXTURE)).toMatchObject({
      reason: 'exact_sku',
      automatic: true,
    });
  });

  it('matches exact GTIN automatically', () => {
    expect(findCatalogMatch({ gtin: '4600000000055' }, CATALOG_FIXTURE)).toMatchObject({
      reason: 'exact_gtin',
      automatic: true,
    });
  });

  it('never auto-merges a fuzzy title', () => {
    expect(
      findCatalogMatch({ title: 'Aurora Crystal ViLu 52 limited' }, CATALOG_FIXTURE),
    ).toMatchObject({ reason: 'fuzzy_title', automatic: false });
  });

  it('does not match unrelated titles', () => {
    expect(findCatalogMatch({ title: 'Completely unrelated service' }, CATALOG_FIXTURE)).toBeNull();
  });

  it('does not merge different SKUs solely from identical titles', () => {
    const result = findCatalogMatch(
      { sku: 'OTHER-SKU', title: 'ViLu Aurora Crystal 52' },
      CATALOG_FIXTURE,
    );
    expect(result).toMatchObject({ reason: 'fuzzy_title', automatic: false });
  });

  it('uses symmetric bounded title similarity', () => {
    expect(titleSimilarity('Aurora Crystal 52', 'Crystal Aurora 52')).toBe(1);
    expect(titleSimilarity('Aurora Crystal', 'Noir Line')).toBe(0);
  });

  it('quarantines conflicting exact catalog identifiers', () => {
    const payload = {
      ...BASE_NORMALIZATION_INPUT.payload,
      sku: CATALOG_FIXTURE[0].sku,
      productId: CATALOG_FIXTURE[1].productId,
    };
    expect(hasAmbiguousCatalogIdentity(payload, CATALOG_FIXTURE)).toBe(true);
    expect(
      normalizeObservation(
        { ...BASE_NORMALIZATION_INPUT, payload, catalog: CATALOG_FIXTURE },
        NOW,
      ),
    ).toMatchObject({
      disposition: 'quarantined',
      catalogMatch: null,
      reasons: expect.arrayContaining(['ambiguous_identity']),
    });
  });

  it('links every output to its raw observation', () => {
    expect(normalizeObservation(BASE_NORMALIZATION_INPUT, NOW).rawObservationId).toBe(
      FIXTURE_IDS.observation,
    );
  });

  it('deduplicates the same evidence while retaining distinct observations', () => {
    const first = normalizeObservation(BASE_NORMALIZATION_INPUT, NOW);
    const duplicate = { ...first };
    const next = {
      ...first,
      rawObservationId: '00000000-0000-4000-8000-000000000559',
    };
    expect(deduplicateNormalizedObservations([first, duplicate, next])).toHaveLength(2);
  });

  it('quarantines invalid provenance and future observations', () => {
    const result = normalizeObservation(
      {
        ...BASE_NORMALIZATION_INPUT,
        rawObservationId: 'not-a-uuid',
        collectedAt: '2026-07-26T00:00:00.000Z',
        protectedUrl: 'http://merchant.example/item',
      },
      NOW,
    );
    expect(result.disposition).toBe('quarantined');
    expect(result.reasons).toContain('invalid_observation');
  });

  it('quarantines a malformed collection timestamp without aborting the batch', () => {
    const result = normalizeObservation(
      {
        ...BASE_NORMALIZATION_INPUT,
        collectedAt: 'not-a-timestamp',
      },
      NOW,
    );
    expect(result).toMatchObject({
      disposition: 'quarantined',
      observedAt: null,
      freshness: 'expired',
    });
    expect(result.reasons).toContain('invalid_observation');
  });
});
