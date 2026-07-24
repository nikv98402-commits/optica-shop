export const OFFER_MARKETS = ['RU', 'AE', 'KZ', 'BY', 'AM', 'AZ', 'UZ', 'US', 'GB'] as const;
export type OfferMarketCode = (typeof OFFER_MARKETS)[number];

export const OFFER_CURRENCIES = ['RUB', 'AED', 'KZT', 'BYN', 'AMD', 'AZN', 'UZS', 'USD', 'GBP'] as const;
export type OfferCurrency = (typeof OFFER_CURRENCIES)[number];

export type OfferFreshness = 'fresh' | 'stale';
export type OfferComparisonBasis =
  | 'exact_sku'
  | 'exact_product_id'
  | 'exact_service_type'
  | 'approved_package';
export type OfferProductType = 'eyeglasses' | 'sunglasses' | 'contact_lenses' | 'service';

export interface OfferFinderError {
  code: 'validation_failed' | 'not_found' | 'conflict' | 'rate_limited' | 'unavailable';
  message: string;
}

export interface OfferFinderEnvelope<T> {
  data: T | null;
  meta: {
    version: 'v1';
    generatedAt: string;
    nextCursor?: string;
    staleIncluded?: boolean;
  };
  error: OfferFinderError | null;
}

export interface OfferSearchQuery {
  market: OfferMarketCode;
  city?: string;
  productType?: OfferProductType;
  comparableKey?: string;
  merchantId?: string;
  includeStale?: boolean;
  limit?: number;
  cursor?: string;
}

export interface PublicOffer {
  offerId: string;
  market: OfferMarketCode;
  merchantId: string;
  merchantName: string;
  storeId: string | null;
  storeName: string | null;
  city: string | null;
  productType: OfferProductType;
  productName: string;
  brandName: string | null;
  comparableKey: string;
  comparisonBasis: OfferComparisonBasis;
  amountMinor: number;
  currency: OfferCurrency;
  freshness: OfferFreshness;
  lastVerifiedAt: string;
  expiresAt: string;
  outboundUrl: string;
  isMinimumFreshPrice: boolean;
}

export interface PublicOfferStore {
  storeId: string;
  merchantId: string;
  merchantName: string;
  name: string;
  city: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  websiteUrl: string | null;
  openingHours: Record<string, unknown>;
  lastVerifiedAt: string;
}

export interface RawOfferObservationInput {
  runId: string;
  sourceId: string;
  externalOfferId: string;
  sourceUrlHash: string;
  observationHash: string;
  payload: Record<string, unknown>;
  collectedAt: string;
  contentType?: string;
  parserVersion: string;
}

const MARKET_SET = new Set<string>(OFFER_MARKETS);
const PRODUCT_TYPE_SET = new Set<string>(['eyeglasses', 'sunglasses', 'contact_lenses', 'service']);

export function classifyOfferFreshness(
  lastVerifiedAt: string | Date,
  now: string | Date = new Date(),
): OfferFreshness | 'expired' {
  const verified = new Date(lastVerifiedAt).getTime();
  const reference = new Date(now).getTime();
  if (!Number.isFinite(verified) || !Number.isFinite(reference) || verified > reference) {
    throw new TypeError('Invalid freshness timestamp');
  }

  const ageMs = reference - verified;
  if (ageMs <= 72 * 60 * 60 * 1000) return 'fresh';
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return 'stale';
  return 'expired';
}

export function normalizeOfferSearchQuery(input: OfferSearchQuery): Required<
  Pick<OfferSearchQuery, 'market' | 'includeStale' | 'limit'>
> & Omit<OfferSearchQuery, 'market' | 'includeStale' | 'limit'> {
  if (!MARKET_SET.has(input.market)) throw new TypeError('Unsupported market');
  if (input.productType && !PRODUCT_TYPE_SET.has(input.productType)) {
    throw new TypeError('Unsupported product type');
  }

  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new RangeError('Offer search limit must be between 1 and 50');
  }

  return {
    ...input,
    city: input.city?.trim() || undefined,
    comparableKey: input.comparableKey?.trim() || undefined,
    includeStale: input.includeStale ?? false,
    limit,
  };
}
