-- Reconcile the single approved ViLu catalog source with the stable UUID used
-- by the bounded production workflow. This migration is intentionally scoped
-- to the existing merchant/adapter pair and never creates another source.

DO $$
DECLARE
  v_expected_source_id constant uuid := '00000000-0000-4000-8000-000000000068';
  v_merchant_id uuid;
  v_existing_source_id uuid;
  v_reference_count bigint;
BEGIN
  SELECT id
  INTO v_merchant_id
  FROM public.offer_merchants
  WHERE legal_name = 'ViLu'
    AND market_id = (
      SELECT id
      FROM public.offer_markets
      WHERE code = 'RU'
    )
  LIMIT 1;

  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'ViLu RU merchant is missing; apply the source seed migration first';
  END IF;

  SELECT id
  INTO v_existing_source_id
  FROM public.offer_sources
  WHERE merchant_id = v_merchant_id
    AND adapter_key = 'vilu_public_catalog';

  IF v_existing_source_id IS NULL THEN
    INSERT INTO public.offer_sources (
      id, merchant_id, name, adapter_key, adapter_version, source_type,
      approved_origins, schedule_cron, rate_limit_per_minute, concurrency_limit,
      terms_reviewed_at, robots_status, enabled
    )
    VALUES (
      v_expected_source_id,
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
    );
  ELSIF v_existing_source_id <> v_expected_source_id THEN
    SELECT
      (SELECT count(*) FROM public.offer_ingestion_runs WHERE source_id = v_existing_source_id)
      + (SELECT count(*) FROM public.offer_raw_observations WHERE source_id = v_existing_source_id)
      + (SELECT count(*) FROM public.offer_parser_incidents WHERE source_id = v_existing_source_id)
      + (SELECT count(*) FROM public.offer_offers WHERE source_id = v_existing_source_id)
    INTO v_reference_count;

    IF v_reference_count > 0 THEN
      RAISE EXCEPTION
        'ViLu public catalog source has non-canonical UUID and % dependent rows; refusing unsafe rewrite',
        v_reference_count;
    END IF;

    UPDATE public.offer_sources
    SET id = v_expected_source_id,
        updated_at = now()
    WHERE id = v_existing_source_id;
  END IF;

  UPDATE public.offer_sources
  SET name = 'ViLu public catalog bounded canary',
      adapter_version = '1.0.0',
      source_type = 'feed',
      approved_origins = '["https://vilu.store"]'::jsonb,
      schedule_cron = NULL,
      rate_limit_per_minute = 1,
      concurrency_limit = 1,
      terms_reviewed_at = '2026-07-26T00:00:00.000Z',
      robots_status = 'allowed',
      enabled = true,
      updated_at = now()
  WHERE id = v_expected_source_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.offer_sources
    WHERE id = v_expected_source_id
      AND merchant_id = v_merchant_id
      AND adapter_key = 'vilu_public_catalog'
      AND enabled
  ) THEN
    RAISE EXCEPTION 'ViLu public catalog source reconciliation failed';
  END IF;
END
$$;
