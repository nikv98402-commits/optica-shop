import { createHash } from 'node:crypto';
import {
  OFFER_CURRENCIES,
  classifyOfferFreshness,
  type OfferComparisonBasis,
  type OfferCurrency,
  type OfferFreshness,
  type OfferProductType,
} from '../../src/lib/offerFinder/contracts.ts';

export const NORMALIZATION_RULE_VERSION = 'offer-finder-normalization-v1';

export type NormalizedAvailability = 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
export type NormalizationDisposition = 'accepted' | 'review' | 'quarantined';
export type NormalizationReason =
  | 'invalid_observation'
  | 'invalid_price'
  | 'unsupported_currency'
  | 'missing_identity'
  | 'ambiguous_identity'
  | 'unmatched_catalog'
  | 'price_anomaly'
  | 'fuzzy_catalog_candidate';

export interface RawNormalizationPayload {
  listedPriceMinor?: unknown;
  regularPriceMinor?: unknown;
  currency?: unknown;
  availability?: unknown;
  available?: unknown;
  title?: unknown;
  brand?: unknown;
  model?: unknown;
  productType?: unknown;
  sku?: unknown;
  productId?: unknown;
  serviceType?: unknown;
  normalizedPackageId?: unknown;
  approvedPackage?: unknown;
  storeExternalId?: unknown;
  storeName?: unknown;
  gtin?: unknown;
  mpn?: unknown;
}

export interface NormalizationInput {
  rawObservationId: string;
  sourceId: string;
  merchantId: string;
  marketId: string;
  externalOfferId: string;
  protectedUrl: string;
  collectedAt: string;
  payload: RawNormalizationPayload;
  previousAmountMinor?: number | null;
  catalog?: readonly CatalogCandidate[];
}

export interface CatalogCandidate {
  variantId: string;
  productId: string;
  sku?: string | null;
  merchantSku?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  title: string;
  brand?: string | null;
  model?: string | null;
}

export interface MatchCandidate {
  variantId: string;
  confidence: number;
  reason: 'exact_sku' | 'exact_product_id' | 'exact_gtin' | 'exact_mpn' | 'fuzzy_title';
  automatic: boolean;
}

export interface NormalizedOfferObservation {
  disposition: NormalizationDisposition;
  reasons: NormalizationReason[];
  rawObservationId: string;
  sourceId: string;
  merchantId: string;
  marketId: string;
  externalOfferId: string;
  protectedUrl: string;
  observedAt: string | null;
  freshness: OfferFreshness | 'expired';
  amountMinor: number | null;
  regularAmountMinor: number | null;
  currency: OfferCurrency | null;
  availability: NormalizedAvailability;
  title: string | null;
  brand: string | null;
  normalizedBrand: string | null;
  model: string | null;
  normalizedModel: string | null;
  productType: OfferProductType | null;
  storeExternalId: string | null;
  storeName: string | null;
  comparableKey: string | null;
  comparisonBasis: OfferComparisonBasis | null;
  catalogMatch: MatchCandidate | null;
  normalizationRuleVersion: typeof NORMALIZATION_RULE_VERSION;
}

const CURRENCY_SET = new Set<string>(OFFER_CURRENCIES);
const PRODUCT_TYPES = new Set<OfferProductType>([
  'eyeglasses',
  'sunglasses',
  'contact_lenses',
  'service',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return normalized || null;
}

export function normalizeIdentity(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return text
    .toLocaleLowerCase('ru-RU')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || null;
}

function normalizedIdentifier(value: unknown): string | null {
  const text = normalizeText(value);
  return text?.toLocaleUpperCase('en-US') ?? null;
}

function integerMinor(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function normalizeCurrency(value: unknown): OfferCurrency | null {
  const currency = normalizeText(value)?.toUpperCase();
  return currency && CURRENCY_SET.has(currency) ? (currency as OfferCurrency) : null;
}

export function normalizeAvailability(payload: RawNormalizationPayload): NormalizedAvailability {
  if (typeof payload.available === 'boolean') return payload.available ? 'in_stock' : 'out_of_stock';
  const value = normalizeIdentity(payload.availability);
  if (!value) return 'unknown';
  if (['in-stock', 'available', 'instock', 'yes'].includes(value)) return 'in_stock';
  if (['out-of-stock', 'unavailable', 'sold-out', 'no'].includes(value)) return 'out_of_stock';
  if (['preorder', 'pre-order', 'backorder'].includes(value)) return 'preorder';
  return 'unknown';
}

function comparablePart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

export function deriveComparableIdentity(payload: RawNormalizationPayload): {
  key: string | null;
  basis: OfferComparisonBasis | null;
} {
  const sku = normalizedIdentifier(payload.sku);
  const productId = normalizedIdentifier(payload.productId);
  const serviceType = normalizeIdentity(payload.serviceType);
  const packageId = normalizedIdentifier(payload.normalizedPackageId);
  const packageApproved = payload.approvedPackage === true;

  if (sku) return { key: `sku:${comparablePart(sku)}`, basis: 'exact_sku' };
  if (productId) {
    return {
      key: `product:${comparablePart(productId)}`,
      basis: 'exact_product_id',
    };
  }
  if (serviceType) {
    return {
      key: `service:${comparablePart(serviceType)}`,
      basis: 'exact_service_type',
    };
  }
  if (packageId && packageApproved) {
    return {
      key: `package:${comparablePart(packageId)}`,
      basis: 'approved_package',
    };
  }
  return { key: null, basis: null };
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeIdentity(value)?.split('-').filter(Boolean) ?? []);
}

export function titleSimilarity(left: string, right: string): number {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / (a.size + b.size - intersection);
}

export function findCatalogMatch(
  payload: RawNormalizationPayload,
  catalog: readonly CatalogCandidate[] = [],
): MatchCandidate | null {
  const sku = normalizedIdentifier(payload.sku);
  const productId = normalizedIdentifier(payload.productId);
  const gtin = normalizedIdentifier(payload.gtin);
  const mpn = normalizedIdentifier(payload.mpn);

  const exactMatchers: Array<{
    value: string | null;
    reason: MatchCandidate['reason'];
    read: (candidate: CatalogCandidate) => string | null;
  }> = [
    {
      value: sku,
      reason: 'exact_sku',
      read: (candidate) => normalizedIdentifier(candidate.sku ?? candidate.merchantSku),
    },
    {
      value: productId,
      reason: 'exact_product_id',
      read: (candidate) => normalizedIdentifier(candidate.productId),
    },
    { value: gtin, reason: 'exact_gtin', read: (candidate) => normalizedIdentifier(candidate.gtin) },
    { value: mpn, reason: 'exact_mpn', read: (candidate) => normalizedIdentifier(candidate.mpn) },
  ];

  for (const matcher of exactMatchers) {
    if (!matcher.value) continue;
    const matches = catalog.filter((candidate) => matcher.read(candidate) === matcher.value);
    if (matches.length === 1) {
      return {
        variantId: matches[0].variantId,
        confidence: 1,
        reason: matcher.reason,
        automatic: true,
      };
    }
    if (matches.length > 1) return null;
  }

  const title = normalizeText(payload.title);
  if (!title) return null;
  const ranked = catalog
    .map((candidate) => ({ candidate, confidence: titleSimilarity(title, candidate.title) }))
    .filter(({ confidence }) => confidence >= 0.6)
    .sort((a, b) => b.confidence - a.confidence);
  if (!ranked.length) return null;
  return {
    variantId: ranked[0].candidate.variantId,
    confidence: ranked[0].confidence,
    reason: 'fuzzy_title',
    automatic: false,
  };
}

export function hasAmbiguousCatalogIdentity(
  payload: RawNormalizationPayload,
  catalog: readonly CatalogCandidate[] = [],
): boolean {
  const identifiers = [
    {
      value: normalizedIdentifier(payload.sku),
      read: (candidate: CatalogCandidate) =>
        normalizedIdentifier(candidate.sku ?? candidate.merchantSku),
    },
    {
      value: normalizedIdentifier(payload.productId),
      read: (candidate: CatalogCandidate) => normalizedIdentifier(candidate.productId),
    },
    {
      value: normalizedIdentifier(payload.gtin),
      read: (candidate: CatalogCandidate) => normalizedIdentifier(candidate.gtin),
    },
    {
      value: normalizedIdentifier(payload.mpn),
      read: (candidate: CatalogCandidate) => normalizedIdentifier(candidate.mpn),
    },
  ];
  const matchedVariants = new Set<string>();
  for (const identifier of identifiers) {
    if (!identifier.value) continue;
    const matches = catalog.filter(
      (candidate) => identifier.read(candidate) === identifier.value,
    );
    if (matches.length > 1) return true;
    if (matches[0]) matchedVariants.add(matches[0].variantId);
  }
  return matchedVariants.size > 1;
}

function isPriceAnomaly(current: number, previous?: number | null): boolean {
  if (!previous || previous <= 0) return false;
  return current / previous > 3 || previous / current > 3;
}

export function normalizeObservation(
  input: NormalizationInput,
  now: string | Date = new Date(),
): NormalizedOfferObservation {
  const reasons: NormalizationReason[] = [];
  const observed = new Date(input.collectedAt);
  const validObservation =
    UUID.test(input.rawObservationId) &&
    UUID.test(input.sourceId) &&
    UUID.test(input.merchantId) &&
    UUID.test(input.marketId) &&
    Boolean(normalizeText(input.externalOfferId)) &&
    observed.toString() !== 'Invalid Date' &&
    observed.getTime() <= new Date(now).getTime() &&
    /^https:\/\//.test(input.protectedUrl);
  if (!validObservation) reasons.push('invalid_observation');

  const amountMinor = integerMinor(input.payload.listedPriceMinor);
  if (amountMinor === null) reasons.push('invalid_price');
  const regularAmountMinor = integerMinor(input.payload.regularPriceMinor);
  const currency = normalizeCurrency(input.payload.currency);
  if (!currency) reasons.push('unsupported_currency');

  const identity = deriveComparableIdentity(input.payload);
  const ambiguousIdentity = hasAmbiguousCatalogIdentity(input.payload, input.catalog);
  if (ambiguousIdentity) reasons.push('ambiguous_identity');
  else if (!identity.key) reasons.push('missing_identity');

  const catalogMatch = ambiguousIdentity ? null : findCatalogMatch(input.payload, input.catalog);
  if (catalogMatch?.reason === 'fuzzy_title') reasons.push('fuzzy_catalog_candidate');
  else if (!ambiguousIdentity && identity.key && !catalogMatch) reasons.push('unmatched_catalog');
  if (amountMinor && isPriceAnomaly(amountMinor, input.previousAmountMinor)) {
    reasons.push('price_anomaly');
  }

  const hardFailures: NormalizationReason[] = [
    'invalid_observation',
    'invalid_price',
    'unsupported_currency',
    'ambiguous_identity',
  ];
  const disposition: NormalizationDisposition = reasons.some((reason) => hardFailures.includes(reason))
    ? 'quarantined'
    : reasons.length
      ? 'review'
      : 'accepted';
  const productType = normalizeIdentity(input.payload.productType);

  return {
    disposition,
    reasons,
    rawObservationId: input.rawObservationId,
    sourceId: input.sourceId,
    merchantId: input.merchantId,
    marketId: input.marketId,
    externalOfferId: normalizeText(input.externalOfferId) ?? '',
    protectedUrl: input.protectedUrl,
    observedAt: observed.toString() === 'Invalid Date' ? null : observed.toISOString(),
    freshness: validObservation ? classifyOfferFreshness(observed, now) : 'expired',
    amountMinor,
    regularAmountMinor:
      regularAmountMinor && amountMinor && regularAmountMinor >= amountMinor
        ? regularAmountMinor
        : null,
    currency,
    availability: normalizeAvailability(input.payload),
    title: normalizeText(input.payload.title),
    brand: normalizeText(input.payload.brand),
    normalizedBrand: normalizeIdentity(input.payload.brand),
    model: normalizeText(input.payload.model),
    normalizedModel: normalizeIdentity(input.payload.model),
    productType:
      productType && PRODUCT_TYPES.has(productType as OfferProductType)
        ? (productType as OfferProductType)
        : null,
    storeExternalId: normalizeText(input.payload.storeExternalId),
    storeName: normalizeText(input.payload.storeName),
    comparableKey: identity.key,
    comparisonBasis: identity.basis,
    catalogMatch,
    normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
  };
}

export function deduplicateNormalizedObservations(
  observations: readonly NormalizedOfferObservation[],
): NormalizedOfferObservation[] {
  const byEvidence = new Map<string, NormalizedOfferObservation>();
  for (const observation of observations) {
    const key = `${observation.sourceId}:${observation.externalOfferId}:${observation.rawObservationId}`;
    const current = byEvidence.get(key);
    if (!current || (current.observedAt ?? '') < (observation.observedAt ?? '')) {
      byEvidence.set(key, observation);
    }
  }
  return [...byEvidence.values()];
}
