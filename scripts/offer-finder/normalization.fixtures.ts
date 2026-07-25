import type { CatalogCandidate, NormalizationInput } from './normalization.ts';

export const FIXTURE_IDS = {
  observation: '00000000-0000-4000-8000-000000000551',
  source: '00000000-0000-4000-8000-000000000552',
  merchant: '00000000-0000-4000-8000-000000000553',
  market: '00000000-0000-4000-8000-000000000554',
  variant: '00000000-0000-4000-8000-000000000555',
  product: '00000000-0000-4000-8000-000000000556',
} as const;

export const CATALOG_FIXTURE: CatalogCandidate[] = [
  {
    variantId: FIXTURE_IDS.variant,
    productId: FIXTURE_IDS.product,
    sku: 'VILU-AURORA-52',
    gtin: '4600000000055',
    mpn: 'AURORA-52',
    title: 'ViLu Aurora Crystal 52',
    brand: 'ViLu',
    model: 'Aurora Crystal',
  },
  {
    variantId: '00000000-0000-4000-8000-000000000557',
    productId: '00000000-0000-4000-8000-000000000558',
    sku: 'VILU-NOIR-54',
    title: 'ViLu Noir Line 54',
    brand: 'ViLu',
    model: 'Noir Line',
  },
];

export const BASE_NORMALIZATION_INPUT: NormalizationInput = {
  rawObservationId: FIXTURE_IDS.observation,
  sourceId: FIXTURE_IDS.source,
  merchantId: FIXTURE_IDS.merchant,
  marketId: FIXTURE_IDS.market,
  externalOfferId: 'offer-aurora-52',
  protectedUrl: 'https://merchant.example/aurora-52',
  collectedAt: '2026-07-25T00:00:00.000Z',
  payload: {
    listedPriceMinor: 1_299_000,
    regularPriceMinor: 1_499_000,
    currency: 'RUB',
    availability: 'in stock',
    title: 'ViLu Aurora Crystal 52',
    brand: ' ViLu ',
    model: 'Aurora   Crystal',
    productType: 'eyeglasses',
    sku: 'VILU-AURORA-52',
    gtin: '4600000000055',
    mpn: 'AURORA-52',
    storeExternalId: 'store-1',
    storeName: 'ViLu Центр',
  },
  catalog: CATALOG_FIXTURE,
};
