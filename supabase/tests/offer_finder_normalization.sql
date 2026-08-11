\set ON_ERROR_STOP on
BEGIN;
SELECT plan(1);

DO $
DECLARE
  v_market uuid := gen_random_uuid();
  v_other_market uuid := gen_random_uuid();
  v_merchant uuid := gen_random_uuid();
  v_source uuid := gen_random_uuid();
  v_run uuid := gen_random_uuid();
  v_product_a uuid := gen_random_uuid();
  v_product_b uuid := gen_random_uuid();
  v_variant_a uuid := gen_random_uuid();
  v_variant_b uuid := gen_random_uuid();
  v_other_package uuid := gen_random_uuid();
  v_observation_a uuid := gen_random_uuid();
  v_observation_b uuid := gen_random_uuid();
  v_offer uuid;
  v_review uuid;
  v_status text;
  v_before_key text;
BEGIN
  INSERT INTO public.offer_markets
    (id, code, country_code, default_currency, locale, timezone)
  VALUES (v_market, 'RU', 'RU', 'RUB', 'ru-RU', 'Europe/Moscow')
  ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
  RETURNING id INTO v_market;
  INSERT INTO public.offer_markets
    (id, code, country_code, default_currency, locale, timezone)
  VALUES (v_other_market, 'AE', 'AE', 'AED', 'en-AE', 'Asia/Dubai')
  ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
  RETURNING id INTO v_other_market;
  INSERT INTO public.offer_merchants (id, market_id, name, slug)
  VALUES (v_merchant, v_market, 'Normalization fixture', 'normalization-fixture');
  INSERT INTO public.offer_sources (
    id, merchant_id, name, adapter_key, adapter_version, source_type,
    approved_origins, approved_fetch_origins, enabled
  ) VALUES (
    v_source, v_merchant, 'Normalization source', 'normalization-fixture', '1.0.0',
    'manual_file', '["https://fixture.invalid"]'::jsonb,
    '["https://fixture.invalid"]'::jsonb, true
  );
  INSERT INTO public.offer_ingestion_runs (
    id, source_id, trigger, status, adapter_version, started_at
  ) VALUES (v_run, v_source, 'manual', 'running', '1.0.0', now());
  INSERT INTO public.offer_products (
    id, product_type, model_name, normalized_model, mpn, normalization_status
  ) VALUES
    (v_product_a, 'eyeglasses', 'Fixture A', 'fixture-a', 'FIX-A', 'accepted'),
    (v_product_b, 'eyeglasses', 'Fixture B', 'fixture-b', 'FIX-B', 'accepted');
  INSERT INTO public.offer_product_variants (
    id, product_id, sku, comparable_key, comparison_basis, normalization_rule_version
  ) VALUES
    (v_variant_a, v_product_a, 'SKU-A', 'sku:fixture-a', 'exact_sku', 'offer-finder-normalization-v1'),
    (v_variant_b, v_product_b, 'SKU-B', 'sku:fixture-b', 'exact_sku', 'offer-finder-normalization-v1');
  INSERT INTO public.offer_packages (
    id, market_id, normalized_package_id, service_type, contents, approved_at, approved_by
  ) VALUES (
    v_other_package, v_other_market, 'foreign-package', 'eye_exam',
    '{}'::jsonb, now(), 'qa@example.test'
  );
  INSERT INTO public.offer_raw_observations (
    id, run_id, source_id, external_offer_id, source_url_hash, observation_hash,
    payload_json, collected_at, parser_version, protected_url
  ) VALUES (
    v_observation_a, v_run, v_source, 'external-a', repeat('a', 64), repeat('b', 64),
    '{"listedPriceMinor":10000,"currency":"RUB","sku":"SKU-A"}',
    now() - interval '1 hour', '1.0.0', 'https://fixture.invalid/item-a'
  );

  SELECT result.status, result.offer_id, result.review_id
  INTO v_status, v_offer, v_review
  FROM public.offer_publish_normalized_observation_v1(
    v_observation_a, v_variant_a, NULL, NULL, 'https://fixture.invalid/item-a',
    'in_stock', 10000, 'RUB', 12000, '{}'::jsonb, 'offer-finder-normalization-v1'
  ) result;

  IF v_status <> 'published' OR v_offer IS NULL OR v_review IS NOT NULL THEN
    RAISE EXCEPTION 'accepted normalization was not published';
  END IF;
  IF (SELECT last_observation_id FROM public.offer_offers WHERE id = v_offer) <> v_observation_a THEN
    RAISE EXCEPTION 'normalized offer lost raw observation provenance';
  END IF;
  IF (SELECT stale_at = last_verified_at + interval '72 hours' FROM public.offer_offers WHERE id = v_offer) IS NOT TRUE
    OR (SELECT expires_at = last_verified_at + interval '7 days' FROM public.offer_offers WHERE id = v_offer) IS NOT TRUE
  THEN
    RAISE EXCEPTION 'freshness boundaries were not persisted exactly';
  END IF;
  IF (SELECT count(*) FROM public.offer_price_history WHERE offer_id = v_offer) <> 1 THEN
    RAISE EXCEPTION 'price history was not linked to offer';
  END IF;

  PERFORM public.offer_publish_normalized_observation_v1(
    v_observation_a, v_variant_a, NULL, NULL, 'https://fixture.invalid/item-a',
    'in_stock', 10000, 'RUB', 12000, '{}'::jsonb, 'offer-finder-normalization-v1'
  );
  IF (SELECT count(*) FROM public.offer_offers WHERE source_id = v_source) <> 1
    OR (SELECT count(*) FROM public.offer_price_history WHERE offer_id = v_offer) <> 1
  THEN
    RAISE EXCEPTION 'normalization retry is not idempotent';
  END IF;

  INSERT INTO public.offer_raw_observations (
    id, run_id, source_id, external_offer_id, source_url_hash, observation_hash,
    payload_json, collected_at, parser_version, protected_url
  ) VALUES (
    v_observation_b, v_run, v_source, 'external-a', repeat('a', 64), repeat('c', 64),
    '{"listedPriceMinor":40001,"currency":"RUB","sku":"SKU-A"}',
    now(), '1.0.0', 'https://fixture.invalid/item-a'
  );
  SELECT result.status, result.offer_id, result.review_id
  INTO v_status, v_offer, v_review
  FROM public.offer_publish_normalized_observation_v1(
    v_observation_b, v_variant_a, NULL, NULL, 'https://fixture.invalid/item-a',
    'in_stock', 40001, 'RUB', NULL, '{}'::jsonb, 'offer-finder-normalization-v1'
  ) result;
  IF v_status <> 'review' OR v_offer IS NOT NULL OR v_review IS NULL THEN
    RAISE EXCEPTION 'price anomaly was not routed to review';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.offer_price_history WHERE observation_id = v_observation_b
  ) THEN
    RAISE EXCEPTION 'price anomaly was auto-published';
  END IF;
  PERFORM public.offer_publish_normalized_observation_v1(
    v_observation_b, v_variant_a, NULL, NULL, 'https://fixture.invalid/item-a',
    'in_stock', 40001, 'RUB', NULL, '{}'::jsonb, 'offer-finder-normalization-v1'
  );
  IF (
    SELECT count(*) FROM public.offer_match_reviews
    WHERE raw_observation_id = v_observation_b AND review_kind = 'price_anomaly'
  ) <> 1 THEN
    RAISE EXCEPTION 'price anomaly retry created duplicate review work';
  END IF;

  BEGIN
    PERFORM public.offer_publish_normalized_observation_v1(
      v_observation_b, NULL, v_other_package, NULL, 'https://fixture.invalid/package',
      'in_stock', 10000, 'RUB', NULL, '{}'::jsonb, 'offer-finder-normalization-v1'
    );
    RAISE EXCEPTION 'cross-market package unexpectedly published';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  v_review := public.offer_record_match_review_v1(
    v_observation_b,
    '{"kind":"fuzzy_title","variantId":"candidate"}'::jsonb,
    0.75,
    '{"title":"Fixture A"}'::jsonb,
    'offer-finder-normalization-v1'
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.offer_match_reviews
    WHERE id = v_review AND decision IS NULL AND raw_observation_id = v_observation_b
  ) THEN
    RAISE EXCEPTION 'fuzzy candidate review was not linked to raw evidence';
  END IF;
  PERFORM public.offer_record_match_review_v1(
    v_observation_b,
    '{"kind":"fuzzy_title","variantId":"candidate"}'::jsonb,
    0.75,
    '{"title":"Fixture A"}'::jsonb,
    'offer-finder-normalization-v1'
  );
  IF (
    SELECT count(*) FROM public.offer_match_reviews
    WHERE raw_observation_id = v_observation_b AND review_kind = 'catalog_match'
  ) <> 1 THEN
    RAISE EXCEPTION 'catalog review retry created duplicate review work';
  END IF;

  v_before_key := (SELECT comparable_key FROM public.offer_product_variants WHERE id = v_variant_a);
  v_review := public.offer_apply_comparable_review_v1(
    'split', v_variant_a, NULL, 'manual:fixture-a-split', 'qa@example.test',
    'Distinct lens package confirmed', 'offer-finder-normalization-v1'
  );
  IF (SELECT comparable_key FROM public.offer_product_variants WHERE id = v_variant_a)
      <> 'manual:fixture-a-split'
    OR NOT EXISTS (
      SELECT 1 FROM public.offer_match_reviews
      WHERE id = v_review
        AND decision = 'split'
        AND previous_comparable_key = v_before_key
        AND resulting_comparable_key = 'manual:fixture-a-split'
    )
  THEN
    RAISE EXCEPTION 'manual split lacks deterministic update or audit';
  END IF;

  v_review := public.offer_apply_comparable_review_v1(
    'merge', v_variant_a, v_variant_b, NULL, 'qa@example.test',
    'Exact manufacturer identity confirmed', 'offer-finder-normalization-v1'
  );
  IF (SELECT comparable_key FROM public.offer_product_variants WHERE id = v_variant_a)
      <> (SELECT comparable_key FROM public.offer_product_variants WHERE id = v_variant_b)
    OR NOT EXISTS (
      SELECT 1 FROM public.offer_match_reviews WHERE id = v_review AND decision = 'merge'
    )
  THEN
    RAISE EXCEPTION 'manual merge lacks deterministic update or audit';
  END IF;

  BEGIN
    PERFORM public.offer_apply_comparable_review_v1(
      'split', v_variant_a, NULL,
      (SELECT comparable_key FROM public.offer_product_variants WHERE id = v_variant_a),
      'qa@example.test', 'Must fail same key', 'offer-finder-normalization-v1'
    );
    RAISE EXCEPTION 'same-key split unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    PERFORM public.offer_apply_comparable_review_v1(
      'merge', v_variant_a, v_variant_a, NULL, 'qa@example.test',
      'Must fail self merge', 'offer-finder-normalization-v1'
    );
    RAISE EXCEPTION 'self merge unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  IF has_function_privilege(
    'anon',
    'public.offer_record_match_review_v1(uuid,jsonb,numeric,jsonb,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.offer_record_match_review_v1(uuid,jsonb,numeric,jsonb,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.offer_list_pending_normalization_v1(uuid,integer)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.offer_list_pending_normalization_v1(uuid,integer)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.offer_publish_normalized_observation_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,bigint,jsonb,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.offer_publish_normalized_observation_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,bigint,jsonb,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.offer_apply_comparable_review_v1(text,uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.offer_apply_comparable_review_v1(text,uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'browser role can execute normalization mutation';
  END IF;
END;
$body$;

SELECT pass('Offer Finder normalization invariants hold');
SELECT * FROM finish();
ROLLBACK;
