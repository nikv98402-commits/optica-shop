BEGIN;
SELECT plan(8);

INSERT INTO public.offer_markets (
  id, code, country_code, default_currency, locale, timezone, enabled
)
VALUES (
  '00000000-0000-4000-8000-000000000571',
  'US', 'US', 'USD', 'en-US', 'America/New_York', true
);
INSERT INTO public.offer_merchants (id, market_id, name, slug, website_origin)
VALUES ('00000000-0000-4000-8000-000000000572',
  '00000000-0000-4000-8000-000000000571',
  'Operations merchant', 'operations-merchant', 'https://example.test');
INSERT INTO public.offer_sources (
  id, merchant_id, name, adapter_key, adapter_version, source_type,
  approved_origins, approved_fetch_origins, enabled, terms_reviewed_at, robots_status
) VALUES (
  '00000000-0000-4000-8000-000000000573',
  '00000000-0000-4000-8000-000000000572',
  'Operations canary', 'operations_canary', '1.0.0', 'api',
  '["https://example.test"]'::jsonb, '["https://example.test"]'::jsonb,
  true, now(), 'not_applicable'
);
INSERT INTO public.offer_ingestion_runs (
  id, source_id, trigger, status, adapter_version, started_at, heartbeat_at
) VALUES (
  '00000000-0000-4000-8000-000000000574',
  '00000000-0000-4000-8000-000000000573',
  'canary', 'running', '1.0.0', now(), now()
);

SELECT throws_ok(
  $$INSERT INTO public.offer_ingestion_runs
    (source_id, trigger, status, adapter_version, started_at, heartbeat_at)
    VALUES ('00000000-0000-4000-8000-000000000573',
      'schedule', 'running', '1.0.0', now(), now())$$,
  '23505', NULL, 'only one active run is allowed per source'
);
UPDATE public.offer_ingestion_runs
SET status = 'succeeded', finished_at = now(), heartbeat_at = now(),
    fetched_count = 10, accepted_count = 10
WHERE id = '00000000-0000-4000-8000-000000000574';
SELECT ok((SELECT last_success_at IS NOT NULL FROM public.offer_sources
  WHERE id = '00000000-0000-4000-8000-000000000573'),
  'successful run updates source last_success_at');
SELECT is((SELECT consecutive_failures FROM public.offer_sources
  WHERE id = '00000000-0000-4000-8000-000000000573'), 0,
  'successful run resets source failures');

INSERT INTO public.offer_ingestion_runs (
  id, source_id, trigger, status, adapter_version, started_at, heartbeat_at
) VALUES ('00000000-0000-4000-8000-000000000575',
  '00000000-0000-4000-8000-000000000573', 'schedule', 'running', '1.0.0', now(), now());
UPDATE public.offer_ingestion_runs
SET status = 'failed', finished_at = now(), heartbeat_at = now()
WHERE id = '00000000-0000-4000-8000-000000000575';
SELECT is((SELECT consecutive_failures FROM public.offer_sources
  WHERE id = '00000000-0000-4000-8000-000000000573'), 1,
  'failed run increments source failures');
SELECT has_function('public', 'offer_operations_health_v1',
  ARRAY['uuid', 'timestamp with time zone'], 'operations health RPC exists');
SELECT function_privs_are('public', 'offer_operations_health_v1',
  ARRAY['uuid', 'timestamp with time zone'], 'anon', ARRAY[]::text[],
  'anon cannot execute health RPC');
SELECT function_privs_are('public', 'offer_operations_health_v1',
  ARRAY['uuid', 'timestamp with time zone'], 'authenticated', ARRAY[]::text[],
  'authenticated cannot execute health RPC');
SELECT ok(EXISTS (
  SELECT 1
  FROM public.offer_operations_health_v1(
    '00000000-0000-4000-8000-000000000573', now()) health,
    unnest(health.alert_codes) alert_code
  WHERE alert_code = 'NO_FRESH_OFFERS'
  ),
  'health RPC reports missing fresh offers');

SELECT * FROM finish();
ROLLBACK;
