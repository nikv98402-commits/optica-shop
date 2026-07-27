import { describe, expect, it } from 'vitest';
import { demoProducts, getOfferFinderBrandName } from './products';

describe('Offer Finder product identity', () => {
  it('uses the canonical source brand without changing the catalog label', () => {
    const aurora = demoProducts.find(({ id }) => id === 'aurora-crystal');

    expect(aurora?.brand_name).toBe('ViLu Atelier');
    expect(aurora && getOfferFinderBrandName(aurora)).toBe('ViLu');
  });

  it('falls back to the catalog brand for products without an override', () => {
    const noir = demoProducts.find(({ id }) => id === 'noir-line');

    expect(noir && getOfferFinderBrandName(noir)).toBe('Maison Optique');
  });
});
