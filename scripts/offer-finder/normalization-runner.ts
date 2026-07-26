import { pathToFileURL } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  NORMALIZATION_RULE_VERSION,
  normalizeObservation,
  type CatalogCandidate,
  type NormalizedOfferObservation,
  type RawNormalizationPayload,
} from './normalization.ts';

export interface PendingNormalizationRow {
  observationId: string;
  sourceId: string;
  merchantId: string;
  marketId: string;
  externalOfferId: string;
  protectedUrl: string;
  collectedAt: string;
  payload: RawNormalizationPayload;
}

export interface NormalizationPublication {
  status: 'published' | 'review';
  offerId: string | null;
  reviewId: string | null;
}

export interface NormalizationStore {
  loadPending(sourceId: string | null, limit: number): Promise<PendingNormalizationRow[]>;
  loadCatalog(): Promise<CatalogCandidate[]>;
  publish(
    row: PendingNormalizationRow,
    observation: NormalizedOfferObservation,
  ): Promise<NormalizationPublication>;
  recordReview(
    row: PendingNormalizationRow,
    observation: NormalizedOfferObservation,
  ): Promise<string>;
}

export interface NormalizationRunSummary {
  processed: number;
  published: number;
  review: number;
  quarantined: number;
}

export class NormalizationRunner {
  private readonly store: NormalizationStore;

  constructor(store: NormalizationStore) {
    this.store = store;
  }

  async run(sourceId: string | null = null, limit = 100): Promise<NormalizationRunSummary> {
    const [rows, catalog] = await Promise.all([
      this.store.loadPending(sourceId, limit),
      this.store.loadCatalog(),
    ]);
    const summary: NormalizationRunSummary = {
      processed: 0,
      published: 0,
      review: 0,
      quarantined: 0,
    };
    for (const row of rows) {
      const normalized = normalizeObservation(
        {
          rawObservationId: row.observationId,
          sourceId: row.sourceId,
          merchantId: row.merchantId,
          marketId: row.marketId,
          externalOfferId: row.externalOfferId,
          protectedUrl: row.protectedUrl,
          collectedAt: row.collectedAt,
          payload: row.payload,
          catalog,
        },
      );
      summary.processed += 1;
      if (
        normalized.disposition === 'accepted' &&
        normalized.catalogMatch?.automatic &&
        normalized.amountMinor &&
        normalized.currency
      ) {
        const publication = await this.store.publish(row, normalized);
        if (publication.status === 'published') summary.published += 1;
        else summary.review += 1;
        continue;
      }
      await this.store.recordReview(row, normalized);
      if (normalized.disposition === 'quarantined') summary.quarantined += 1;
      else summary.review += 1;
    }
    return summary;
  }
}

function safeMessage(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value);
  return text.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]').slice(0, 500);
}

export class SupabaseNormalizationStore implements NormalizationStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): SupabaseNormalizationStore {
    const url = env.OFFER_FINDER_SUPABASE_URL;
    const key = env.OFFER_FINDER_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Offer Finder normalization secrets are not configured');
    return new SupabaseNormalizationStore(
      createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
    );
  }

  async loadPending(sourceId: string | null, limit: number): Promise<PendingNormalizationRow[]> {
    const { data, error } = await this.client.rpc('offer_list_pending_normalization_v1', {
      p_source_id: sourceId,
      p_limit: limit,
    });
    if (error) throw new Error(`Unable to load normalization batch: ${safeMessage(error)}`);
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      observationId: String(row.observation_id),
      sourceId: String(row.source_id),
      merchantId: String(row.merchant_id),
      marketId: String(row.market_id),
      externalOfferId: String(row.external_offer_id),
      protectedUrl: String(row.protected_url),
      collectedAt: String(row.collected_at),
      payload: row.payload_json as RawNormalizationPayload,
    }));
  }

  async loadCatalog(): Promise<CatalogCandidate[]> {
    const { data, error } = await this.client
      .from('offer_product_variants')
      .select(
        'id,product_id,sku,merchant_sku,offer_products!inner(model_name,gtin,mpn,offer_brands(name))',
      )
      .eq('offer_products.normalization_status', 'accepted');
    if (error) throw new Error(`Unable to load normalization catalog: ${safeMessage(error)}`);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const productValue = row.offer_products;
      const product = (Array.isArray(productValue) ? productValue[0] : productValue) as
        | Record<string, unknown>
        | undefined;
      const brandValue = product?.offer_brands;
      const brand = (Array.isArray(brandValue) ? brandValue[0] : brandValue) as
        | Record<string, unknown>
        | undefined;
      return {
        variantId: String(row.id),
        productId: String(row.product_id),
        sku: typeof row.sku === 'string' ? row.sku : null,
        merchantSku: typeof row.merchant_sku === 'string' ? row.merchant_sku : null,
        gtin: typeof product?.gtin === 'string' ? product.gtin : null,
        mpn: typeof product?.mpn === 'string' ? product.mpn : null,
        title: String(product?.model_name ?? ''),
        brand: typeof brand?.name === 'string' ? brand.name : null,
        model: typeof product?.model_name === 'string' ? product.model_name : null,
      };
    });
  }

  async publish(
    row: PendingNormalizationRow,
    observation: NormalizedOfferObservation,
  ): Promise<NormalizationPublication> {
    if (
      !observation.catalogMatch?.automatic ||
      !observation.amountMinor ||
      !observation.currency
    ) {
      throw new TypeError('Only accepted exact catalog matches can be published');
    }
    const { data, error } = await this.client.rpc('offer_publish_normalized_observation_v1', {
      p_observation_id: row.observationId,
      p_variant_id: observation.catalogMatch.variantId,
      p_package_id: null,
      p_store_id: null,
      p_protected_url: row.protectedUrl,
      p_availability: observation.availability,
      p_amount_minor: observation.amountMinor,
      p_currency: observation.currency,
      p_regular_amount_minor: observation.regularAmountMinor,
      p_promotion_metadata: {},
      p_rule_version: NORMALIZATION_RULE_VERSION,
    });
    if (error) throw new Error(`Unable to publish normalized offer: ${safeMessage(error)}`);
    const result = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    return {
      status: result?.status === 'published' ? 'published' : 'review',
      offerId: typeof result?.offer_id === 'string' ? result.offer_id : null,
      reviewId: typeof result?.review_id === 'string' ? result.review_id : null,
    };
  }

  async recordReview(
    row: PendingNormalizationRow,
    observation: NormalizedOfferObservation,
  ): Promise<string> {
    const { data, error } = await this.client.rpc('offer_record_match_review_v1', {
      p_observation_id: row.observationId,
      p_candidate: {
        kind:
          observation.disposition === 'quarantined'
            ? 'normalization_quarantine'
            : observation.catalogMatch?.reason ?? 'unmatched_catalog',
        variantId: observation.catalogMatch?.variantId ?? null,
        reasons: observation.reasons,
      },
      p_confidence: observation.catalogMatch?.confidence ?? null,
      p_evidence: {
        externalOfferId: row.externalOfferId,
        normalizedBrand: observation.normalizedBrand,
        normalizedModel: observation.normalizedModel,
      },
      p_rule_version: NORMALIZATION_RULE_VERSION,
    });
    if (error) throw new Error(`Unable to record normalization review: ${safeMessage(error)}`);
    return String(data);
  }
}

async function main(): Promise<void> {
  const sourceFlag = process.argv.indexOf('--source-id');
  const sourceId = sourceFlag >= 0 ? process.argv[sourceFlag + 1] : null;
  const summary = await new NormalizationRunner(
    SupabaseNormalizationStore.fromEnvironment(),
  ).run(sourceId);
  console.log(JSON.stringify(summary));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(safeMessage(error));
    process.exitCode = 1;
  });
}
