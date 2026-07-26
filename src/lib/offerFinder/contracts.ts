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

export type OfferNextAction =
  | { kind: 'website'; value: string }
  | { kind: 'phone'; value: string }
  | { kind: 'route'; value: string };

export interface ProductCardOffer {
  offerId: string;
  market: OfferMarketCode;
  source: string;
  merchantName: string;
  storeId: string | null;
  storeName: string | null;
  city: string | null;
  productName: string;
  brandName: string | null;
  comparableKey: string;
  amountMinor: number;
  currency: OfferCurrency;
  availability: 'in_stock' | 'preorder';
  freshness: 'fresh';
  lastVerifiedAt: string;
  isMinimumConfirmedPrice: boolean;
  nextAction: OfferNextAction | null;
}

export interface ProductOfferSearchResult {
  offers: ProductCardOffer[];
  minimumConfirmedPrice: ProductCardOffer | null;
}

export interface ProductOfferSearchInput {
  market: OfferMarketCode;
  product: string;
  brand?: string;
  storeId?: string;
  signal?: AbortSignal;
}

interface ProductOfferSearchOptions {
  fetcher?: typeof fetch;
  baseUrl?: string;
  anonKey?: string;
}

const MARKET_SET = new Set<string>(OFFER_MARKETS);
const PRODUCT_TYPE_SET = new Set<string>(['eyeglasses', 'sunglasses', 'contact_lenses', 'service']);
const CURRENCY_SET = new Set<string>(OFFER_CURRENCIES);

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

function isProductCardOffer(value: unknown): value is ProductCardOffer {
  if (!value || typeof value !== 'object') return false;
  const offer = value as Partial<ProductCardOffer>;
  return typeof offer.offerId === 'string'
    && MARKET_SET.has(offer.market || '')
    && typeof offer.source === 'string'
    && typeof offer.merchantName === 'string'
    && typeof offer.productName === 'string'
    && typeof offer.comparableKey === 'string'
    && Number.isSafeInteger(offer.amountMinor)
    && (offer.amountMinor || 0) >= 0
    && CURRENCY_SET.has(offer.currency || '')
    && (offer.availability === 'in_stock' || offer.availability === 'preorder')
    && offer.freshness === 'fresh'
    && typeof offer.lastVerifiedAt === 'string'
    && typeof offer.isMinimumConfirmedPrice === 'boolean';
}

export function formatOfferPrice(amountMinor: number, currency: OfferCurrency, locale = 'ru-RU') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export async function searchProductOffers(
  input: ProductOfferSearchInput,
  options: ProductOfferSearchOptions = {},
): Promise<ProductOfferSearchResult> {
  if (!MARKET_SET.has(input.market)) throw new TypeError('Unsupported market');
  const product = input.product.trim();
  const brand = input.brand?.trim() || '';
  if (!product || product.length > 160 || brand.length > 120) {
    throw new TypeError('Invalid product identity');
  }

  const baseUrl = (options.baseUrl ?? import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const anonKey = options.anonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!baseUrl || !anonKey) throw new Error('offer_finder_not_configured');

  const url = new URL(`${baseUrl}/functions/v1/offer-finder/v1/search`);
  url.searchParams.set('market', input.market);
  url.searchParams.set('product', product);
  if (brand) url.searchParams.set('brand', brand);
  if (input.storeId) url.searchParams.set('store', input.storeId);

  const response = await (options.fetcher ?? fetch)(url, {
    method: 'GET',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    signal: input.signal,
  });
  if (!response.ok) throw new Error(`offer_finder_http_${response.status}`);
  const payload = await response.json() as OfferFinderEnvelope<ProductOfferSearchResult>;
  const offers = payload.data?.offers;
  if (payload.error || !Array.isArray(offers) || !offers.every(isProductCardOffer)) {
    throw new Error('offer_finder_invalid_response');
  }
  const minimum = payload.data?.minimumConfirmedPrice;
  if (minimum !== null && minimum !== undefined && !isProductCardOffer(minimum)) {
    throw new Error('offer_finder_invalid_response');
  }
  return {
    offers,
    minimumConfirmedPrice: minimum ?? null,
  };
}
