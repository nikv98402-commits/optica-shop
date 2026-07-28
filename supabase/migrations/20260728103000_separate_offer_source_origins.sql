-- Separate the network fetch allowlist from product URLs exposed to users.
-- approved_fetch_origins controls ingestion requests.
-- approved_origins continues to control outbound/protected product URLs.

ALTER TABLE public.offer_sources
  ADD COLUMN IF NOT EXISTS approved_fetch_origins jsonb;

UPDATE public.offer_sources
SET approved_fetch_origins = approved_origins
WHERE approved_fetch_origins IS NULL;

ALTER TABLE public.offer_sources
  ALTER COLUMN approved_fetch_origins SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.offer_sources'::regclass
      AND conname = 'offer_sources_approved_fetch_origins_array'
  ) THEN
    ALTER TABLE public.offer_sources
      ADD CONSTRAINT offer_sources_approved_fetch_origins_array
      CHECK (jsonb_typeof(approved_fetch_origins) = 'array');
  END IF;
END
$$;

COMMENT ON COLUMN public.offer_sources.approved_fetch_origins IS
  'HTTPS origins the ingestion transport may request.';

COMMENT ON COLUMN public.offer_sources.approved_origins IS
  'HTTPS origins that normalized offers may expose as outbound product URLs.';

UPDATE public.offer_sources
SET
  approved_fetch_origins = '["https://raw.githubusercontent.com"]'::jsonb,
  approved_origins = '["https://vilu.store"]'::jsonb,
  schedule_cron = NULL,
  rate_limit_per_minute = 1,
  concurrency_limit = 1,
  updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000000072'
  AND adapter_key = 'vilu_github_raw_catalog';

UPDATE public.offer_sources
SET
  approved_fetch_origins = '["https://vilu.store"]'::jsonb,
  updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000000068'
  AND adapter_key = 'vilu_public_catalog';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.offer_sources
    WHERE id = '00000000-0000-4000-8000-000000000072'
      AND adapter_key = 'vilu_github_raw_catalog'
      AND approved_fetch_origins = '["https://raw.githubusercontent.com"]'::jsonb
      AND approved_origins = '["https://vilu.store"]'::jsonb
      AND schedule_cron IS NULL
      AND rate_limit_per_minute = 1
      AND concurrency_limit = 1
      AND enabled
  ) THEN
    RAISE EXCEPTION 'Second source origin separation failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.offer_sources
    WHERE id = '00000000-0000-4000-8000-000000000068'
      AND adapter_key = 'vilu_public_catalog'
      AND approved_fetch_origins = '["https://vilu.store"]'::jsonb
      AND approved_origins = '["https://vilu.store"]'::jsonb
  ) THEN
    RAISE EXCEPTION 'First source origin policy changed unexpectedly';
  END IF;
END
$$;
