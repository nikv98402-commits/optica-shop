\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'offer_markets', 'offer_merchants', 'offer_stores', 'offer_brands',
    'offer_products', 'offer_product_variants', 'offer_packages', 'offer_sources',
    'offer_ingestion_runs', 'offer_raw_observations', 'offer_parser_incidents',
    'offer_offers', 'offer_price_history', 'offer_match_reviews'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = table_name AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled for %', table_name;
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.offer_raw_observations', 'SELECT')
    OR has_table_privilege('anon', 'public.offer_offers', 'INSERT')
    OR has_table_privilege('authenticated', 'public.offer_sources', 'SELECT')
  THEN
    RAISE EXCEPTION 'browser roles received Offer Finder table privileges';
  END IF;

  IF NOT has_function_privilege(
    'anon',
    'public.offer_search_v1(text,text,text,text,uuid,boolean,integer,timestamptz,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'safe public search function is not executable';
  END IF;
END;
$$;

DO $$
DECLARE
  v_market_id uuid := gen_random_uuid();
  v_merchant_id uuid := gen_random_uuid();
  v_source_id uuid := gen_random_uuid();
  v_run_id uuid := gen_random_uuid();
  v_observation_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.offer_markets
    (id, code, country_code, default_currency, locale, timezone)
  VALUES (v_market_id, 'RU', 'RU', 'RUB', 'ru-RU', 'Europe/Moscow');
  INSERT INTO public.offer_merchants (id, market_id, name, slug)
  VALUES (v_merchant_id, v_market_id, 'Fixture merchant', 'fixture-merchant');
  INSERT INTO public.offer_sources
    (id, merchant_id, name, adapter_key, adapter_version, source_type, approved_origins)
  VALUES (
    v_source_id, v_merchant_id, 'Fixture source', 'fixture', '1.0.0', 'manual_file',
    '["https://fixture.invalid"]'::jsonb
  );
  INSERT INTO public.offer_ingestion_runs
    (id, source_id, trigger, status, adapter_version, started_at)
  VALUES (v_run_id, v_source_id, 'manual', 'running', '1.0.0', clock_timestamp());
  INSERT INTO public.offer_raw_observations
    (id, run_id, source_id, external_offer_id, source_url_hash, observation_hash,
     payload_json, collected_at, parser_version)
  VALUES (
    v_observation_id, v_run_id, v_source_id, 'external-1', repeat('a', 64), repeat('b', 64),
    '{"price":1299}'::jsonb, clock_timestamp(), '1.0.0'
  );

  INSERT INTO public.offer_raw_observations
    (run_id, source_id, external_offer_id, source_url_hash, observation_hash,
     payload_json, collected_at, parser_version)
  VALUES (
    v_run_id, v_source_id, 'external-1', repeat('a', 64), repeat('b', 64),
    '{"price":1299}'::jsonb, clock_timestamp(), '1.0.0'
  )
  ON CONFLICT (source_id, external_offer_id, observation_hash) DO NOTHING;

  IF (SELECT count(*) FROM public.offer_raw_observations
      WHERE source_id = v_source_id AND external_offer_id = 'external-1') <> 1 THEN
    RAISE EXCEPTION 'raw observation import is not idempotent';
  END IF;

  BEGIN
    UPDATE public.offer_raw_observations
    SET payload_json = '{"price":1}'::jsonb
    WHERE id = v_observation_id;
    RAISE EXCEPTION 'immutable observation update unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
END;
$$;

ROLLBACK;
