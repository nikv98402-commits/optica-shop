-- Offer Finder #53: additive normalized foundation and closed ingestion boundary.
-- Parsers, scheduler, BFF and UI are intentionally outside this migration.

CREATE TABLE public.offer_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code IN ('RU', 'AE', 'KZ', 'BY', 'AM', 'AZ', 'UZ', 'US', 'GB')),
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  default_currency text NOT NULL CHECK (default_currency IN ('RUB', 'AED', 'KZT', 'BYN', 'AMD', 'AZN', 'UZS', 'USD', 'GBP')),
  locale text NOT NULL,
  timezone text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.offer_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.offer_markets(id),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  website_origin text CHECK (website_origin IS NULL OR website_origin ~ '^https://[^/?#]+$'),
  legal_name text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_id, slug)
);

CREATE TABLE public.offer_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.offer_merchants(id),
  external_id text NOT NULL,
  store_locator_key text,
  name text NOT NULL,
  city text NOT NULL,
  region text,
  postal_code text,
  address_line text NOT NULL,
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  phone text,
  website_url text CHECK (website_url IS NULL OR website_url ~ '^https://'),
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(opening_hours) = 'object'),
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  last_verified_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, external_id)
);

CREATE TABLE public.offer_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.offer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.offer_brands(id),
  product_type text NOT NULL CHECK (product_type IN ('eyeglasses', 'sunglasses', 'contact_lenses', 'service')),
  model_name text NOT NULL,
  normalized_model text NOT NULL,
  gtin text,
  mpn text,
  normalization_status text NOT NULL DEFAULT 'pending'
    CHECK (normalization_status IN ('pending', 'accepted', 'rejected', 'review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (gtin IS NOT NULL OR mpn IS NOT NULL OR brand_id IS NOT NULL)
);

CREATE UNIQUE INDEX offer_products_gtin_uidx ON public.offer_products(gtin) WHERE gtin IS NOT NULL;
CREATE UNIQUE INDEX offer_products_brand_mpn_uidx
  ON public.offer_products(brand_id, mpn) WHERE mpn IS NOT NULL;

CREATE TABLE public.offer_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.offer_products(id),
  sku text,
  merchant_sku text,
  color text,
  size text,
  lens_width_mm numeric(5,2),
  bridge_width_mm numeric(5,2),
  temple_length_mm numeric(5,2),
  comparable_key text NOT NULL CHECK (length(comparable_key) BETWEEN 3 AND 240),
  comparison_basis text NOT NULL
    CHECK (comparison_basis IN ('exact_sku', 'exact_product_id', 'exact_service_type', 'approved_package')),
  normalization_rule_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, comparable_key)
);

CREATE TABLE public.offer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.offer_markets(id),
  normalized_package_id text NOT NULL,
  service_type text NOT NULL,
  contents jsonb NOT NULL CHECK (jsonb_typeof(contents) = 'object'),
  equivalence_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(equivalence_metadata) = 'object'),
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_id, normalized_package_id),
  CHECK ((approved_at IS NULL) = (approved_by IS NULL))
);

CREATE TABLE public.offer_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.offer_merchants(id),
  name text NOT NULL,
  adapter_key text NOT NULL,
  adapter_version text NOT NULL,
  source_type text NOT NULL
    CHECK (source_type IN ('api', 'feed', 'json_ld', 'embedded_json', 'public_html', 'manual_file')),
  approved_origins jsonb NOT NULL CHECK (jsonb_typeof(approved_origins) = 'array'),
  schedule_cron text,
  rate_limit_per_minute integer NOT NULL DEFAULT 30 CHECK (rate_limit_per_minute BETWEEN 1 AND 600),
  concurrency_limit integer NOT NULL DEFAULT 1 CHECK (concurrency_limit BETWEEN 1 AND 10),
  terms_reviewed_at timestamptz,
  robots_status text NOT NULL DEFAULT 'unknown'
    CHECK (robots_status IN ('unknown', 'allowed', 'restricted', 'disallowed', 'not_applicable')),
  enabled boolean NOT NULL DEFAULT false,
  last_success_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, adapter_key)
);

CREATE TABLE public.offer_ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.offer_sources(id),
  trigger text NOT NULL CHECK (trigger IN ('schedule', 'manual', 'canary')),
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'degraded', 'failed', 'cancelled')),
  adapter_version text NOT NULL,
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(checkpoint) = 'object'),
  started_at timestamptz,
  finished_at timestamptz,
  heartbeat_at timestamptz,
  fetched_count integer NOT NULL DEFAULT 0 CHECK (fetched_count >= 0),
  observed_count integer NOT NULL DEFAULT 0 CHECK (observed_count >= 0),
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  updated_count integer NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  unchanged_count integer NOT NULL DEFAULT 0 CHECK (unchanged_count >= 0),
  quarantined_count integer NOT NULL DEFAULT 0 CHECK (quarantined_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  safe_error_code text,
  diagnostic_summary text CHECK (diagnostic_summary IS NULL OR length(diagnostic_summary) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
);

CREATE TABLE public.offer_raw_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.offer_ingestion_runs(id),
  source_id uuid NOT NULL REFERENCES public.offer_sources(id),
  external_offer_id text NOT NULL,
  source_url_hash text NOT NULL CHECK (source_url_hash ~ '^[a-f0-9]{64}$'),
  observation_hash text NOT NULL CHECK (observation_hash ~ '^[a-f0-9]{64}$'),
  payload_json jsonb NOT NULL CHECK (jsonb_typeof(payload_json) = 'object'),
  collected_at timestamptz NOT NULL,
  content_type text,
  parser_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_offer_id, observation_hash)
);

CREATE TABLE public.offer_parser_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.offer_sources(id),
  run_id uuid REFERENCES public.offer_ingestion_runs(id),
  deduplication_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  expected_fingerprint text,
  actual_fingerprint text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.offer_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.offer_sources(id),
  merchant_id uuid NOT NULL REFERENCES public.offer_merchants(id),
  store_id uuid REFERENCES public.offer_stores(id),
  variant_id uuid REFERENCES public.offer_product_variants(id),
  package_id uuid REFERENCES public.offer_packages(id),
  external_offer_id text NOT NULL,
  protected_url text NOT NULL CHECK (protected_url ~ '^https://'),
  availability text NOT NULL DEFAULT 'unknown'
    CHECK (availability IN ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
  publication_status text NOT NULL DEFAULT 'pending'
    CHECK (publication_status IN ('pending', 'published', 'quarantined', 'disabled')),
  last_observation_id uuid NOT NULL REFERENCES public.offer_raw_observations(id),
  last_verified_at timestamptz NOT NULL,
  stale_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_offer_id),
  CHECK ((variant_id IS NOT NULL)::integer + (package_id IS NOT NULL)::integer = 1),
  CHECK (stale_at = last_verified_at + interval '72 hours'),
  CHECK (expires_at = last_verified_at + interval '7 days')
);

CREATE TABLE public.offer_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offer_offers(id),
  observation_id uuid NOT NULL REFERENCES public.offer_raw_observations(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('RUB', 'AED', 'KZT', 'BYN', 'AMD', 'AZN', 'UZS', 'USD', 'GBP')),
  regular_amount_minor bigint CHECK (regular_amount_minor IS NULL OR regular_amount_minor >= amount_minor),
  promotion_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(promotion_metadata) = 'object'),
  valid_from timestamptz NOT NULL,
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, observation_id)
);

CREATE TABLE public.offer_match_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate jsonb NOT NULL CHECK (jsonb_typeof(candidate) = 'object'),
  confidence numeric(5,4) CHECK (confidence BETWEEN 0 AND 1),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  decision text CHECK (decision IN ('approve', 'reject', 'split', 'merge')),
  reviewed_by text,
  reviewed_at timestamptz,
  normalization_rule_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((decision IS NULL) = (reviewed_at IS NULL)),
  CHECK (reviewed_at IS NULL OR reviewed_by IS NOT NULL)
);

CREATE INDEX offer_merchants_market_idx ON public.offer_merchants(market_id, enabled);
CREATE INDEX offer_stores_city_idx ON public.offer_stores(merchant_id, lower(city), enabled);
CREATE INDEX offer_stores_public_city_idx ON public.offer_stores(lower(city), enabled, verification_status);
CREATE INDEX offer_stores_locator_key_idx ON public.offer_stores(store_locator_key) WHERE store_locator_key IS NOT NULL;
CREATE INDEX offer_products_type_model_idx ON public.offer_products(product_type, normalized_model);
CREATE INDEX offer_variants_comparable_idx ON public.offer_product_variants(comparable_key, comparison_basis);
CREATE INDEX offer_sources_merchant_idx ON public.offer_sources(merchant_id, enabled);
CREATE INDEX offer_runs_source_started_idx ON public.offer_ingestion_runs(source_id, started_at DESC);
CREATE INDEX offer_runs_status_started_idx ON public.offer_ingestion_runs(status, started_at DESC);
CREATE INDEX offer_observations_source_collected_idx
  ON public.offer_raw_observations(source_id, collected_at DESC);
CREATE INDEX offer_offers_freshness_idx
  ON public.offer_offers(publication_status, expires_at, stale_at, last_verified_at DESC);
CREATE INDEX offer_offers_merchant_store_idx ON public.offer_offers(merchant_id, store_id);
CREATE INDEX offer_prices_offer_observed_idx ON public.offer_price_history(offer_id, observed_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_offer_raw_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'offer_raw_observations are immutable';
END;
$$;

CREATE TRIGGER offer_raw_observations_immutable
BEFORE UPDATE OR DELETE ON public.offer_raw_observations
FOR EACH ROW EXECUTE FUNCTION public.prevent_offer_raw_observation_mutation();

CREATE VIEW public.offer_current_prices
WITH (security_invoker = true)
AS
SELECT
  o.id AS offer_id,
  mkt.code AS market_code,
  m.id AS merchant_id,
  m.name AS merchant_name,
  st.id AS store_id,
  st.name AS store_name,
  st.city,
  COALESCE(p.product_type, 'service') AS product_type,
  COALESCE(p.model_name, pkg.service_type) AS product_name,
  b.name AS brand_name,
  COALESCE(v.comparable_key, 'package:' || pkg.normalized_package_id) AS comparable_key,
  COALESCE(v.comparison_basis, 'approved_package') AS comparison_basis,
  ph.amount_minor,
  ph.currency,
  o.last_verified_at,
  o.expires_at,
  CASE WHEN o.stale_at >= CURRENT_TIMESTAMP THEN 'fresh' ELSE 'stale' END AS freshness,
  o.protected_url,
  row_number() OVER (
    PARTITION BY mkt.code, COALESCE(v.comparable_key, 'package:' || pkg.normalized_package_id)
    ORDER BY
      CASE WHEN o.stale_at >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END,
      ph.amount_minor,
      o.last_verified_at DESC,
      o.id
  ) = 1 AND o.stale_at >= CURRENT_TIMESTAMP AS is_minimum_fresh_price
FROM public.offer_offers o
JOIN public.offer_sources src ON src.id = o.source_id AND src.enabled
JOIN public.offer_merchants m ON m.id = o.merchant_id AND m.enabled
JOIN public.offer_markets mkt ON mkt.id = m.market_id AND mkt.enabled
LEFT JOIN public.offer_product_variants v ON v.id = o.variant_id
LEFT JOIN public.offer_products p ON p.id = v.product_id AND p.normalization_status = 'accepted'
LEFT JOIN public.offer_brands b ON b.id = p.brand_id
LEFT JOIN public.offer_packages pkg
  ON pkg.id = o.package_id AND pkg.approved_at IS NOT NULL AND pkg.approved_by IS NOT NULL
LEFT JOIN public.offer_stores st ON st.id = o.store_id AND st.enabled
JOIN LATERAL (
  SELECT h.amount_minor, h.currency
  FROM public.offer_price_history h
  WHERE h.offer_id = o.id
  ORDER BY h.observed_at DESC, h.id DESC
  LIMIT 1
) ph ON true
JOIN public.offer_raw_observations ro ON ro.id = o.last_observation_id
WHERE o.publication_status = 'published'
  AND o.availability IN ('in_stock', 'preorder')
  AND o.expires_at >= CURRENT_TIMESTAMP
  AND o.last_verified_at <= CURRENT_TIMESTAMP
  AND (
    (o.variant_id IS NOT NULL AND p.id IS NOT NULL)
    OR (o.package_id IS NOT NULL AND pkg.id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.offer_search_v1(
  p_market text,
  p_city text DEFAULT NULL,
  p_product_type text DEFAULT NULL,
  p_comparable_key text DEFAULT NULL,
  p_merchant_id uuid DEFAULT NULL,
  p_include_stale boolean DEFAULT false,
  p_limit integer DEFAULT 20,
  p_cursor_verified_at timestamptz DEFAULT NULL,
  p_cursor_offer_id uuid DEFAULT NULL
)
RETURNS TABLE (
  offer_id uuid, market_code text, merchant_id uuid, merchant_name text,
  store_id uuid, store_name text, city text, product_type text, product_name text,
  brand_name text, comparable_key text, comparison_basis text, amount_minor bigint,
  currency text, freshness text, last_verified_at timestamptz, expires_at timestamptz,
  outbound_url text, is_minimum_fresh_price boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.offer_id, cp.market_code, cp.merchant_id, cp.merchant_name,
    cp.store_id, cp.store_name, cp.city, cp.product_type, cp.product_name,
    cp.brand_name, cp.comparable_key, cp.comparison_basis, cp.amount_minor,
    cp.currency, cp.freshness, cp.last_verified_at, cp.expires_at,
    CASE WHEN cp.protected_url ~ '^https://[^[:space:]]+$' THEN cp.protected_url END,
    cp.is_minimum_fresh_price
  FROM public.offer_current_prices cp
  WHERE p_market IN ('RU', 'AE', 'KZ', 'BY', 'AM', 'AZ', 'UZ', 'US', 'GB')
    AND cp.market_code = p_market
    AND (p_city IS NULL OR lower(cp.city) = lower(trim(p_city)))
    AND (p_product_type IS NULL OR cp.product_type = p_product_type)
    AND (p_comparable_key IS NULL OR cp.comparable_key = p_comparable_key)
    AND (p_merchant_id IS NULL OR cp.merchant_id = p_merchant_id)
    AND (p_include_stale OR cp.freshness = 'fresh')
    AND (
      p_cursor_verified_at IS NULL
      OR (cp.last_verified_at, cp.offer_id) < (p_cursor_verified_at, p_cursor_offer_id)
    )
  ORDER BY cp.last_verified_at DESC, cp.offer_id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

CREATE OR REPLACE FUNCTION public.offer_details_v1(p_offer_id uuid)
RETURNS TABLE (
  offer_id uuid, market_code text, merchant_id uuid, merchant_name text,
  store_id uuid, store_name text, city text, product_type text, product_name text,
  brand_name text, comparable_key text, comparison_basis text, amount_minor bigint,
  currency text, freshness text, last_verified_at timestamptz, expires_at timestamptz,
  outbound_url text, is_minimum_fresh_price boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.offer_id, cp.market_code, cp.merchant_id, cp.merchant_name,
    cp.store_id, cp.store_name, cp.city, cp.product_type, cp.product_name,
    cp.brand_name, cp.comparable_key, cp.comparison_basis, cp.amount_minor,
    cp.currency, cp.freshness, cp.last_verified_at, cp.expires_at,
    CASE WHEN cp.protected_url ~ '^https://[^[:space:]]+$' THEN cp.protected_url END,
    cp.is_minimum_fresh_price
  FROM public.offer_current_prices cp
  WHERE cp.offer_id = p_offer_id;
$$;

CREATE OR REPLACE FUNCTION public.offer_stores_v1(
  p_market text,
  p_city text DEFAULT NULL,
  p_offer_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  store_id uuid, merchant_id uuid, merchant_name text, name text, city text,
  address_line text, latitude numeric, longitude numeric, phone text,
  website_url text, opening_hours jsonb, last_verified_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    st.id, m.id, m.name, st.name, st.city, st.address_line,
    st.latitude, st.longitude, st.phone,
    CASE WHEN st.website_url ~ '^https://[^[:space:]]+$' THEN st.website_url END,
    st.opening_hours, st.last_verified_at
  FROM public.offer_stores st
  JOIN public.offer_merchants m ON m.id = st.merchant_id AND m.enabled
  JOIN public.offer_markets mkt ON mkt.id = m.market_id AND mkt.enabled
  LEFT JOIN public.offer_offers o ON o.store_id = st.id
  WHERE p_market IN ('RU', 'AE', 'KZ', 'BY', 'AM', 'AZ', 'UZ', 'US', 'GB')
    AND mkt.code = p_market
    AND st.enabled
    AND st.verification_status = 'verified'
    AND (p_city IS NULL OR lower(st.city) = lower(trim(p_city)))
    AND (p_offer_id IS NULL OR o.id = p_offer_id)
  ORDER BY st.last_verified_at DESC NULLS LAST, st.id
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

ALTER TABLE public.offer_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_raw_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_parser_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_match_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.offer_markets, public.offer_merchants, public.offer_stores,
  public.offer_brands, public.offer_products, public.offer_product_variants,
  public.offer_packages, public.offer_sources, public.offer_ingestion_runs,
  public.offer_raw_observations, public.offer_parser_incidents, public.offer_offers,
  public.offer_price_history, public.offer_match_reviews FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.offer_current_prices FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.offer_markets, public.offer_merchants, public.offer_stores,
  public.offer_brands, public.offer_products, public.offer_product_variants,
  public.offer_packages, public.offer_sources, public.offer_ingestion_runs,
  public.offer_parser_incidents, public.offer_offers,
  public.offer_price_history, public.offer_match_reviews TO service_role;
GRANT SELECT, INSERT ON public.offer_raw_observations TO service_role;
GRANT SELECT ON public.offer_current_prices TO service_role;

REVOKE ALL ON FUNCTION public.prevent_offer_raw_observation_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offer_search_v1(text,text,text,text,uuid,boolean,integer,timestamptz,uuid)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.offer_details_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.offer_stores_v1(text,text,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.offer_search_v1(text,text,text,text,uuid,boolean,integer,timestamptz,uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.offer_details_v1(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.offer_stores_v1(text,text,uuid,integer)
  TO anon, authenticated, service_role;

COMMENT ON TABLE public.offer_raw_observations IS
  'Immutable source evidence. Service-role only; never returned to browser clients.';
COMMENT ON VIEW public.offer_current_prices IS
  'Protected projection of non-expired exact-comparison offers; consume through v1 functions only.';
COMMENT ON FUNCTION public.offer_search_v1(text,text,text,text,uuid,boolean,integer,timestamptz,uuid) IS
  'Safe bounded Offer Finder v1 search projection.';
