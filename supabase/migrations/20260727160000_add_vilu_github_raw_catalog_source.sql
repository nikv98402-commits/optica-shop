-- Second real Offer Finder source: one owner-authorized public repository file.
-- No schedule is attached. The source is manual bounded-canary only.

DO $$
DECLARE
  v_market_id uuid;
  v_merchant_id uuid;
  v_source_id constant uuid := '00000000-0000-4000-8000-000000000072';
BEGIN
  SELECT id INTO v_market_id
  FROM public.offer_markets
  WHERE code = 'RU';

  IF v_market_id IS NULL THEN
    RAISE EXCEPTION 'RU market is missing; apply Offer Finder foundation migrations first';
  END IF;

  SELECT id INTO v_merchant_id
  FROM public.offer_merchants
  WHERE market_id = v_market_id
    AND slug = 'vilu';

  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'ViLu RU merchant is missing; apply the first source migration first';
  END IF;

  INSERT INTO public.offer_sources (
    id, merchant_id, name, adapter_key, adapter_version, source_type,
    approved_origins, schedule_cron, rate_limit_per_minute, concurrency_limit,
    terms_reviewed_at, robots_status, enabled
  )
  VALUES (
    v_source_id,
    v_merchant_id,
    'ViLu GitHub raw catalog bounded canary',
    'vilu_github_raw_catalog',
    '1.0.0',
    'feed',
    '["https://raw.githubusercontent.com"]'::jsonb,
    NULL,
    1,
    1,
    '2026-07-27T00:00:00.000Z',
    'not_applicable',
    true
  )
  ON CONFLICT (merchant_id, adapter_key) DO UPDATE SET
    name = EXCLUDED.name,
    adapter_version = '1.0.0',
    source_type = 'feed',
    approved_origins = '["https://raw.githubusercontent.com"]'::jsonb,
    schedule_cron = NULL,
    rate_limit_per_minute = 1,
    concurrency_limit = 1,
    terms_reviewed_at = '2026-07-27T00:00:00.000Z',
    robots_status = 'not_applicable',
    enabled = true,
    updated_at = now();

  IF NOT EXISTS (
    SELECT 1
    FROM public.offer_sources
    WHERE merchant_id = v_merchant_id
      AND adapter_key = 'vilu_github_raw_catalog'
      AND approved_origins = '["https://raw.githubusercontent.com"]'::jsonb
      AND schedule_cron IS NULL
      AND rate_limit_per_minute = 1
      AND concurrency_limit = 1
      AND enabled
  ) THEN
    RAISE EXCEPTION 'ViLu GitHub raw catalog source setup failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.offer_sources
    WHERE id = '00000000-0000-4000-8000-000000000068'
      AND (
        adapter_key <> 'vilu_public_catalog'
        OR approved_origins <> '["https://vilu.store"]'::jsonb
      )
  ) THEN
    RAISE EXCEPTION 'First ViLu source changed unexpectedly';
  END IF;
END
$$;
