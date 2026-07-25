BEGIN;

ALTER TABLE public.offer_raw_observations
  ADD COLUMN protected_url text CHECK (
    protected_url IS NULL OR protected_url ~ '^https://[^/?#]+(?:[/?#]|$)'
  );

ALTER TABLE public.offer_match_reviews
  ADD COLUMN raw_observation_id uuid REFERENCES public.offer_raw_observations(id),
  ADD COLUMN variant_id uuid REFERENCES public.offer_product_variants(id),
  ADD COLUMN previous_comparable_key text,
  ADD COLUMN resulting_comparable_key text,
  ADD COLUMN action_reason text,
  ADD COLUMN review_kind text NOT NULL DEFAULT 'catalog_match'
    CHECK (review_kind IN (
      'catalog_match', 'normalization_quarantine', 'price_anomaly', 'comparable_review'
    ));

CREATE INDEX offer_match_reviews_pending_idx
  ON public.offer_match_reviews(created_at DESC)
  WHERE decision IS NULL;
CREATE INDEX offer_match_reviews_observation_idx
  ON public.offer_match_reviews(raw_observation_id)
  WHERE raw_observation_id IS NOT NULL;
CREATE UNIQUE INDEX offer_match_reviews_pending_dedup_idx
  ON public.offer_match_reviews(
    raw_observation_id, review_kind, normalization_rule_version
  )
  WHERE raw_observation_id IS NOT NULL AND decision IS NULL;

CREATE OR REPLACE FUNCTION public.offer_record_match_review_v1(
  p_observation_id uuid,
  p_candidate jsonb,
  p_confidence numeric,
  p_evidence jsonb,
  p_rule_version text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_review_id uuid;
  v_review_kind text;
BEGIN
  IF p_observation_id IS NULL
    OR jsonb_typeof(p_candidate) <> 'object'
    OR jsonb_typeof(p_evidence) <> 'object'
    OR p_rule_version IS NULL
    OR length(trim(p_rule_version)) < 3
    OR (p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1))
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid match review payload';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.offer_raw_observations WHERE id = p_observation_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'raw observation not found';
  END IF;

  v_review_kind := CASE
    WHEN p_candidate ->> 'kind' = 'normalization_quarantine'
      THEN 'normalization_quarantine'
    ELSE 'catalog_match'
  END;

  INSERT INTO public.offer_match_reviews (
    raw_observation_id, candidate, confidence, evidence, normalization_rule_version,
    review_kind
  )
  VALUES (
    p_observation_id, p_candidate, p_confidence, p_evidence, trim(p_rule_version),
    v_review_kind
  )
  ON CONFLICT (raw_observation_id, review_kind, normalization_rule_version)
    WHERE raw_observation_id IS NOT NULL AND decision IS NULL
  DO UPDATE SET
    candidate = EXCLUDED.candidate,
    confidence = EXCLUDED.confidence,
    evidence = EXCLUDED.evidence,
    updated_at = now()
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.offer_list_pending_normalization_v1(
  p_source_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  observation_id uuid,
  source_id uuid,
  merchant_id uuid,
  market_id uuid,
  external_offer_id text,
  protected_url text,
  collected_at timestamptz,
  payload_json jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    observation.id,
    observation.source_id,
    source.merchant_id,
    merchant.market_id,
    observation.external_offer_id,
    observation.protected_url,
    observation.collected_at,
    observation.payload_json
  FROM public.offer_raw_observations observation
  JOIN public.offer_sources source ON source.id = observation.source_id
  JOIN public.offer_merchants merchant ON merchant.id = source.merchant_id
  WHERE observation.protected_url IS NOT NULL
    AND (p_source_id IS NULL OR observation.source_id = p_source_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.offer_price_history history
      WHERE history.observation_id = observation.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.offer_match_reviews review
      WHERE review.raw_observation_id = observation.id
    )
  ORDER BY observation.collected_at, observation.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$$;

CREATE OR REPLACE FUNCTION public.offer_publish_normalized_observation_v1(
  p_observation_id uuid,
  p_variant_id uuid,
  p_package_id uuid,
  p_store_id uuid,
  p_protected_url text,
  p_availability text,
  p_amount_minor bigint,
  p_currency text,
  p_regular_amount_minor bigint,
  p_promotion_metadata jsonb,
  p_rule_version text
)
RETURNS TABLE(status text, offer_id uuid, review_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_observation public.offer_raw_observations%ROWTYPE;
  v_source public.offer_sources%ROWTYPE;
  v_offer_id uuid;
  v_review_id uuid;
  v_previous_amount bigint;
  v_approved_origin boolean;
BEGIN
  SELECT * INTO v_observation
  FROM public.offer_raw_observations
  WHERE id = p_observation_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'raw observation not found';
  END IF;

  SELECT * INTO v_source
  FROM public.offer_sources
  WHERE id = v_observation.source_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'source not found';
  END IF;
  IF NOT v_source.enabled THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'source is not enabled';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      v_observation.source_id::text || ':' || v_observation.external_offer_id,
      0
    )
  );

  IF (p_variant_id IS NOT NULL)::integer + (p_package_id IS NOT NULL)::integer <> 1
    OR p_amount_minor <= 0
    OR p_currency NOT IN ('RUB', 'AED', 'KZT', 'BYN', 'AMD', 'AZN', 'UZS', 'USD', 'GBP')
    OR p_availability NOT IN ('in_stock', 'out_of_stock', 'preorder', 'unknown')
    OR p_regular_amount_minor IS NOT NULL AND p_regular_amount_minor < p_amount_minor
    OR jsonb_typeof(COALESCE(p_promotion_metadata, '{}'::jsonb)) <> 'object'
    OR p_rule_version IS NULL
    OR length(trim(p_rule_version)) < 3
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid normalized offer payload';
  END IF;

  IF p_variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.offer_product_variants v
    JOIN public.offer_products p ON p.id = v.product_id
    WHERE v.id = p_variant_id
      AND p.normalization_status = 'accepted'
      AND v.normalization_rule_version = p_rule_version
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'variant is not accepted for this rule';
  END IF;
  IF p_package_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.offer_packages pkg
    JOIN public.offer_merchants merchant ON merchant.id = v_source.merchant_id
    WHERE pkg.id = p_package_id
      AND pkg.approved_at IS NOT NULL
      AND pkg.market_id = merchant.market_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'package is not approved for the source market';
  END IF;
  IF p_store_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.offer_stores
    WHERE id = p_store_id AND merchant_id = v_source.merchant_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'store does not belong to source merchant';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(v_source.approved_origins) origin(value)
    WHERE origin.value = 'https://' || split_part(p_protected_url, '/', 3)
  ) INTO v_approved_origin;
  IF p_protected_url !~ '^https://[^/?#]+(?:[/?#]|$)' OR NOT v_approved_origin THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'protected URL origin is not approved';
  END IF;

  SELECT h.amount_minor INTO v_previous_amount
  FROM public.offer_offers o
  JOIN public.offer_price_history h ON h.offer_id = o.id
  WHERE o.source_id = v_observation.source_id
    AND o.external_offer_id = v_observation.external_offer_id
  ORDER BY h.observed_at DESC, h.id DESC
  LIMIT 1;

  IF v_previous_amount IS NOT NULL
    AND (p_amount_minor::numeric / v_previous_amount > 3
      OR v_previous_amount::numeric / p_amount_minor > 3)
  THEN
    INSERT INTO public.offer_match_reviews (
      raw_observation_id, variant_id, candidate, confidence, evidence,
      normalization_rule_version, review_kind
    )
    VALUES (
      p_observation_id,
      p_variant_id,
      jsonb_build_object(
        'kind', 'price_anomaly',
        'externalOfferId', v_observation.external_offer_id
      ),
      NULL,
      jsonb_build_object(
        'previousAmountMinor', v_previous_amount,
        'observedAmountMinor', p_amount_minor,
        'currency', p_currency
      ),
      p_rule_version,
      'price_anomaly'
    )
    ON CONFLICT (raw_observation_id, review_kind, normalization_rule_version)
      WHERE raw_observation_id IS NOT NULL AND decision IS NULL
    DO UPDATE SET
      variant_id = EXCLUDED.variant_id,
      candidate = EXCLUDED.candidate,
      evidence = EXCLUDED.evidence,
      updated_at = now()
    RETURNING id INTO v_review_id;
    RETURN QUERY SELECT 'review'::text, NULL::uuid, v_review_id;
    RETURN;
  END IF;

  INSERT INTO public.offer_offers (
    source_id, merchant_id, store_id, variant_id, package_id, external_offer_id,
    protected_url, availability, publication_status, last_observation_id,
    last_verified_at, stale_at, expires_at
  )
  VALUES (
    v_observation.source_id, v_source.merchant_id, p_store_id, p_variant_id, p_package_id,
    v_observation.external_offer_id, p_protected_url, p_availability, 'published',
    p_observation_id, v_observation.collected_at, v_observation.collected_at + interval '72 hours',
    v_observation.collected_at + interval '7 days'
  )
  ON CONFLICT (source_id, external_offer_id) DO UPDATE
  SET store_id = EXCLUDED.store_id,
      variant_id = EXCLUDED.variant_id,
      package_id = EXCLUDED.package_id,
      protected_url = EXCLUDED.protected_url,
      availability = EXCLUDED.availability,
      publication_status = EXCLUDED.publication_status,
      last_observation_id = EXCLUDED.last_observation_id,
      last_verified_at = EXCLUDED.last_verified_at,
      stale_at = EXCLUDED.stale_at,
      expires_at = EXCLUDED.expires_at,
      updated_at = now()
  WHERE public.offer_offers.last_verified_at <= EXCLUDED.last_verified_at
  RETURNING id INTO v_offer_id;

  IF v_offer_id IS NULL THEN
    SELECT id INTO v_offer_id
    FROM public.offer_offers
    WHERE source_id = v_observation.source_id
      AND external_offer_id = v_observation.external_offer_id;
  END IF;

  INSERT INTO public.offer_price_history (
    offer_id, observation_id, amount_minor, currency, regular_amount_minor,
    promotion_metadata, valid_from, observed_at
  )
  VALUES (
    v_offer_id, p_observation_id, p_amount_minor, p_currency, p_regular_amount_minor,
    COALESCE(p_promotion_metadata, '{}'::jsonb), v_observation.collected_at,
    v_observation.collected_at
  )
  ON CONFLICT ON CONSTRAINT offer_price_history_offer_id_observation_id_key DO NOTHING;

  RETURN QUERY SELECT 'published'::text, v_offer_id, NULL::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.offer_apply_comparable_review_v1(
  p_action text,
  p_variant_id uuid,
  p_target_variant_id uuid,
  p_new_comparable_key text,
  p_reviewed_by text,
  p_reason text,
  p_rule_version text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous_key text;
  v_resulting_key text;
  v_review_id uuid;
BEGIN
  IF p_action NOT IN ('split', 'merge')
    OR p_variant_id IS NULL
    OR p_reviewed_by IS NULL
    OR length(trim(p_reviewed_by)) < 2
    OR p_reason IS NULL
    OR length(trim(p_reason)) < 3
    OR p_rule_version IS NULL
    OR length(trim(p_rule_version)) < 3
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid comparable review payload';
  END IF;

  SELECT comparable_key INTO v_previous_key
  FROM public.offer_product_variants
  WHERE id = p_variant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'variant not found';
  END IF;

  IF p_action = 'merge' THEN
    IF p_target_variant_id IS NULL OR p_target_variant_id = p_variant_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'merge requires another target variant';
    END IF;
    SELECT comparable_key INTO v_resulting_key
    FROM public.offer_product_variants
    WHERE id = p_target_variant_id
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'target variant not found';
    END IF;
  ELSE
    IF p_target_variant_id IS NOT NULL
      OR p_new_comparable_key IS NULL
      OR length(trim(p_new_comparable_key)) NOT BETWEEN 3 AND 240
      OR trim(p_new_comparable_key) = v_previous_key
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'split requires a distinct comparable key';
    END IF;
    v_resulting_key := trim(p_new_comparable_key);
  END IF;

  UPDATE public.offer_product_variants
  SET comparable_key = v_resulting_key,
      normalization_rule_version = p_rule_version,
      updated_at = now()
  WHERE id = p_variant_id;

  INSERT INTO public.offer_match_reviews (
    variant_id, candidate, confidence, evidence, decision, reviewed_by, reviewed_at,
    normalization_rule_version, previous_comparable_key, resulting_comparable_key,
    action_reason, review_kind
  )
  VALUES (
    p_variant_id,
    jsonb_build_object('action', p_action, 'targetVariantId', p_target_variant_id),
    1,
    jsonb_build_object('reason', trim(p_reason)),
    p_action,
    trim(p_reviewed_by),
    now(),
    p_rule_version,
    v_previous_key,
    v_resulting_key,
    trim(p_reason),
    'comparable_review'
  )
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.offer_record_match_review_v1(uuid,jsonb,numeric,jsonb,text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offer_list_pending_normalization_v1(uuid,integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offer_publish_normalized_observation_v1(
  uuid,uuid,uuid,uuid,text,text,bigint,text,bigint,jsonb,text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offer_apply_comparable_review_v1(
  text,uuid,uuid,text,text,text,text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.offer_record_match_review_v1(uuid,jsonb,numeric,jsonb,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.offer_list_pending_normalization_v1(uuid,integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.offer_publish_normalized_observation_v1(
  uuid,uuid,uuid,uuid,text,text,bigint,text,bigint,jsonb,text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.offer_apply_comparable_review_v1(
  text,uuid,uuid,text,text,text,text
) TO service_role;

COMMENT ON FUNCTION public.offer_publish_normalized_observation_v1(
  uuid,uuid,uuid,uuid,text,text,bigint,text,bigint,jsonb,text
) IS 'Service-role-only atomic publication of one normalized raw Offer Finder observation.';
COMMENT ON FUNCTION public.offer_apply_comparable_review_v1(
  text,uuid,uuid,text,text,text,text
) IS 'Service-role-only audited manual split or merge of an exact comparable group.';

COMMIT;
