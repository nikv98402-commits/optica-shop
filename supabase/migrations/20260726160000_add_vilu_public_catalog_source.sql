-- First real Offer Finder source: one owner-authorized ViLu catalog feed.
-- Deliberately no schedule_cron: this source may only be run as a bounded canary.

DO $$
DECLARE
  v_market_id uuid;
  v_merchant_id uuid;
  v_brand_id uuid;
  v_product_id uuid;
BEGIN
  INSERT INTO public.offer_markets (
    code, country_code, default_currency, locale, timezone, enabled
  )
  VALUES ('RU', 'RU', 'RUB', 'ru-RU', 'Europe/Moscow', true)
  ON CONFLICT (code) DO UPDATE SET
    enabled = true,
    updated_at = now()
  RETURNING id INTO v_market_id;

  INSERT INTO public.offer_merchants (
    market_id, name, slug, website_origin, legal_name, verification_status, enabled
  )
  VALUES (
    v_market_id, 'ViLu', 'vilu', 'https://vilu.store', 'ViLu', 'verified', true
  )
  ON CONFLICT (market_id, slug) DO UPDATE SET
    website_origin = EXCLUDED.website_origin,
    verification_status = 'verified',
    enabled = true,
    updated_at = now()
  RETURNING id INTO v_merchant_id;

  INSERT INTO public.offer_brands (name, normalized_name, slug)
  VALUES ('ViLu', 'vilu', 'vilu')
  ON CONFLICT (normalized_name) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = now()
  RETURNING id INTO v_brand_id;

  INSERT INTO public.offer_products (
    brand_id, product_type, model_name, normalized_model, mpn, normalization_status
  )
  VALUES (
    v_brand_id, 'eyeglasses', 'Aurora Crystal', 'aurora crystal',
    'AURORA-52', 'accepted'
  )
  ON CONFLICT (brand_id, mpn) WHERE mpn IS NOT NULL DO UPDATE SET
    model_name = EXCLUDED.model_name,
    normalized_model = EXCLUDED.normalized_model,
    normalization_status = 'accepted',
    updated_at = now()
  RETURNING id INTO v_product_id;

  INSERT INTO public.offer_product_variants (
    product_id, sku, merchant_sku, size, lens_width_mm, bridge_width_mm,
    temple_length_mm, comparable_key, comparison_basis, normalization_rule_version
  )
  VALUES (
    v_product_id, 'VILU-AURORA-52', 'VILU-AURORA-52', '52-18-140',
    52, 18, 140, 'sku:vilu-aurora-52', 'exact_sku', 'offer-finder-normalization-v1'
  )
  ON CONFLICT (product_id, comparable_key) DO UPDATE SET
    sku = EXCLUDED.sku,
    merchant_sku = EXCLUDED.merchant_sku,
    size = EXCLUDED.size,
    lens_width_mm = EXCLUDED.lens_width_mm,
    bridge_width_mm = EXCLUDED.bridge_width_mm,
    temple_length_mm = EXCLUDED.temple_length_mm,
    updated_at = now();

  INSERT INTO public.offer_sources (
    id, merchant_id, name, adapter_key, adapter_version, source_type,
    approved_origins, schedule_cron, rate_limit_per_minute, concurrency_limit,
    terms_reviewed_at, robots_status, enabled
  )
  VALUES (
    '00000000-0000-4000-8000-000000000068',
    v_merchant_id,
    'ViLu public catalog bounded canary',
    'vilu_public_catalog',
    '1.0.0',
    'feed',
    '["https://vilu.store"]'::jsonb,
    NULL,
    1,
    1,
    '2026-07-26T00:00:00.000Z',
    'allowed',
    true
  )
  ON CONFLICT (merchant_id, adapter_key) DO UPDATE SET
    adapter_version = EXCLUDED.adapter_version,
    source_type = EXCLUDED.source_type,
    approved_origins = EXCLUDED.approved_origins,
    schedule_cron = NULL,
    rate_limit_per_minute = 1,
    concurrency_limit = 1,
    terms_reviewed_at = EXCLUDED.terms_reviewed_at,
    robots_status = 'allowed',
    enabled = true,
    updated_at = now();
END
$$;
