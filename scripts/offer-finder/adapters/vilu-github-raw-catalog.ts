import {
  IngestionError,
  type AdapterObservation,
  type SourceAdapter,
} from '../ingestion.ts';

const FEED_URL =
  'https://raw.githubusercontent.com/nikv98402-commits/optica-shop/main/public/offer-finder/aurora-crystal.json';
const PRODUCT_URL = 'https://vilu.store/products/aurora-crystal';
const MAX_CANARY_OFFERS = 1;

interface GitHubRawOffer {
  id: string;
  offerUrl: string;
  listedPriceMinor: number;
  regularPriceMinor?: number;
  currency: string;
  availability: string;
  title: string;
  brand: string;
  model: string;
  productType: string;
  sku: string;
  gtin?: string;
  mpn?: string;
}

interface GitHubRawCatalogDocument {
  schemaVersion: string;
  offers: GitHubRawOffer[];
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new IngestionError('MALFORMED_OBSERVATION', `GitHub raw feed field ${field} is invalid`);
  }
  return value.trim();
}

function positiveMinor(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new IngestionError('MALFORMED_OBSERVATION', `GitHub raw feed field ${field} is invalid`);
  }
  return Number(value);
}

function parseOffer(value: unknown, collectedAt: string, contentType: string): AdapterObservation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new IngestionError('MALFORMED_OBSERVATION', 'GitHub raw feed offer is not an object');
  }
  const offer = value as Record<string, unknown>;
  const offerUrl = new URL(requiredText(offer.offerUrl, 'offerUrl'));
  if (offerUrl.toString() !== PRODUCT_URL) {
    throw new IngestionError(
      'DESTINATION_NOT_ALLOWED',
      'GitHub raw offer URL is not the approved ViLu product URL',
    );
  }
  const listedPriceMinor = positiveMinor(offer.listedPriceMinor, 'listedPriceMinor');
  const regularPriceMinor = offer.regularPriceMinor === undefined
    ? undefined
    : positiveMinor(offer.regularPriceMinor, 'regularPriceMinor');
  if (regularPriceMinor !== undefined && regularPriceMinor < listedPriceMinor) {
    throw new IngestionError(
      'MALFORMED_OBSERVATION',
      'GitHub raw regular price is lower than listed price',
    );
  }
  return {
    externalOfferId: requiredText(offer.id, 'id'),
    sourceUrl: offerUrl.toString(),
    payload: {
      listedPriceMinor,
      regularPriceMinor,
      currency: requiredText(offer.currency, 'currency'),
      availability: requiredText(offer.availability, 'availability'),
      title: requiredText(offer.title, 'title'),
      brand: requiredText(offer.brand, 'brand'),
      model: requiredText(offer.model, 'model'),
      productType: requiredText(offer.productType, 'productType'),
      sku: requiredText(offer.sku, 'sku'),
      gtin: typeof offer.gtin === 'string' ? offer.gtin.trim() : undefined,
      mpn: typeof offer.mpn === 'string' ? offer.mpn.trim() : undefined,
    },
    collectedAt,
    contentType,
  };
}

export const viluGitHubRawCatalogAdapter: SourceAdapter = {
  key: 'vilu_github_raw_catalog',
  version: '1.0.0',
  async collect(context): Promise<AdapterObservation[]> {
    const configuredUrl = process.env.OFFER_FINDER_VILU_GITHUB_RAW_FEED_URL ?? FEED_URL;
    const url = new URL(configuredUrl);
    if (url.toString() !== FEED_URL) {
      throw new IngestionError(
        'DESTINATION_NOT_ALLOWED',
        'GitHub raw feed URL is not the approved bounded feed',
      );
    }
    const response = await context.fetch(url.toString(), {
      accept: ['application/json', 'text/plain'],
    });
    const document = response.json<GitHubRawCatalogDocument>();
    if (document.schemaVersion !== '1.0' || !Array.isArray(document.offers)) {
      throw new IngestionError('MALFORMED_OBSERVATION', 'GitHub raw feed schema is unsupported');
    }
    if (document.offers.length !== MAX_CANARY_OFFERS) {
      throw new IngestionError(
        'POLICY_BLOCKED',
        `Bounded GitHub raw canary requires exactly ${MAX_CANARY_OFFERS} offer`,
      );
    }
    const collectedAt = new Date().toISOString();
    return document.offers.map((offer) =>
      parseOffer(offer, collectedAt, response.contentType));
  },
};
