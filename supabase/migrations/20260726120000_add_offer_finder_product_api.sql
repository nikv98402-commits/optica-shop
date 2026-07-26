-- Offer Finder #56: narrow read model consumed only by the versioned Edge BFF.
-- This remains additive and does not expose operational tables to browser roles.

CREATE OR REPLACE FUNCTION public.offer_product_card_v1(
  p_market text,
  p_product_name text,
  p_brand_name text DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 12
)
RETURNS TABLE (
  offer_id uuid,
  market_code text,
  source_name text,
  merchant_name text,
  store_id uuid,
  store_name text,
  city text,
  product_name text,
  brand_name text,
  comparable_key text,
  amount_minor bigint,
  currency text,
  availability text,
  freshness text,
  last_verified_at timestamptz,
  outbound_url text,
  phone text,
  latitude numeric,
  longitude numeric,
  is_minimum_fresh_price boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.offer_id,
    cp.market_code,
    src.name,
    cp.merchant_name,
    cp.store_id,
    cp.store_name,
    cp.city,
    cp.product_name,
    cp.brand_name,
    cp.comparable_key,
    cp.amount_minor,
    cp.currency,
    o.availability,
    cp.freshness,
    cp.last_verified_at,
    CASE
      WHEN cp.protected_url ~ '^https://[^[:space:]]+$' THEN cp.protected_url
    END,
    st.phone,
    st.latitude,
    st.longitude,
    cp.is_minimum_fresh_price
  FROM public.offer_current_prices cp
  JOIN public.offer_offers o ON o.id = cp.offer_id
  JOIN public.offer_sources src ON src.id = o.source_id AND src.enabled
  LEFT JOIN public.offer_stores st ON st.id = cp.store_id
  WHERE p_market IN ('RU', 'AE', 'KZ', 'BY', 'AM', 'AZ', 'UZ', 'US', 'GB')
    AND cp.market_code = p_market
    AND lower(cp.product_name) = lower(trim(p_product_name))
    AND (p_brand_name IS NULL OR lower(cp.brand_name) = lower(trim(p_brand_name)))
    AND (p_store_id IS NULL OR cp.store_id = p_store_id)
    -- The protected projection already excludes expired, unpublished and
    -- non-accepted/quarantined observations. Product cards show fresh only.
    AND cp.freshness = 'fresh'
  ORDER BY
    cp.is_minimum_fresh_price DESC,
    cp.amount_minor,
    cp.last_verified_at DESC,
    cp.offer_id
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$$;

REVOKE ALL ON FUNCTION public.offer_product_card_v1(text,text,text,uuid,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.offer_product_card_v1(text,text,text,uuid,integer)
  TO service_role;

COMMENT ON FUNCTION public.offer_product_card_v1(text,text,text,uuid,integer) IS
  'Service-role-only fresh product offer projection for Offer Finder Edge BFF v1.';
