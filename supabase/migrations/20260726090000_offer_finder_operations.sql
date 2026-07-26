-- Offer Finder production operations: run exclusivity, source health and service-only monitoring.

CREATE UNIQUE INDEX offer_runs_one_active_per_source_idx
  ON public.offer_ingestion_runs(source_id)
  WHERE status IN ('queued', 'running');

CREATE OR REPLACE FUNCTION public.offer_sync_source_run_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('succeeded', 'degraded') THEN
    UPDATE public.offer_sources
    SET last_success_at = COALESCE(NEW.finished_at, now()),
        consecutive_failures = 0,
        updated_at = now()
    WHERE id = NEW.source_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.offer_sources
    SET consecutive_failures = consecutive_failures + 1,
        updated_at = now()
    WHERE id = NEW.source_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER offer_ingestion_runs_sync_source_state
AFTER UPDATE OF status ON public.offer_ingestion_runs
FOR EACH ROW
EXECUTE FUNCTION public.offer_sync_source_run_state();

CREATE OR REPLACE FUNCTION public.offer_operations_health_v1(
  p_source_id uuid DEFAULT NULL,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  source_id uuid,
  source_name text,
  enabled boolean,
  last_success_at timestamptz,
  consecutive_failures integer,
  last_run_at timestamptz,
  last_run_status text,
  last_heartbeat_at timestamptz,
  parse_success_rate numeric,
  quarantine_rate numeric,
  fresh_offer_count bigint,
  open_incident_count bigint,
  alert_codes text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH source_runs AS (
    SELECT s.id, s.name, s.enabled, s.last_success_at, s.consecutive_failures,
      r.started_at, r.status, r.heartbeat_at, r.finished_at,
      r.fetched_count, r.accepted_count, r.quarantined_count, r.failed_count
    FROM public.offer_sources s
    LEFT JOIN LATERAL (
      SELECT *
      FROM public.offer_ingestion_runs candidate
      WHERE candidate.source_id = s.id
      ORDER BY candidate.created_at DESC
      LIMIT 1
    ) r ON true
    WHERE p_source_id IS NULL OR s.id = p_source_id
  )
  SELECT sr.id, sr.name, sr.enabled, sr.last_success_at, sr.consecutive_failures,
    sr.started_at, sr.status, sr.heartbeat_at,
    CASE WHEN COALESCE(sr.fetched_count, 0) = 0 THEN NULL
      ELSE round((sr.accepted_count::numeric / sr.fetched_count::numeric) * 100, 2) END,
    CASE WHEN COALESCE(sr.fetched_count, 0) = 0 THEN 0
      ELSE round((sr.quarantined_count::numeric / sr.fetched_count::numeric) * 100, 2) END,
    (SELECT count(*) FROM public.offer_offers o
      WHERE o.source_id = sr.id AND o.publication_status = 'published'
        AND o.expires_at > p_now),
    (SELECT count(*) FROM public.offer_parser_incidents i
      WHERE i.source_id = sr.id AND i.status = 'open'),
    array_remove(ARRAY[
      CASE WHEN sr.enabled AND (sr.last_success_at IS NULL OR sr.last_success_at < p_now - interval '30 hours')
        THEN 'NO_SUCCESS_30H' END,
      CASE WHEN sr.consecutive_failures >= 2 THEN 'CONSECUTIVE_FAILURES' END,
      CASE WHEN sr.status = 'running' AND (sr.heartbeat_at IS NULL OR sr.heartbeat_at < p_now - interval '15 minutes')
        THEN 'STALE_HEARTBEAT' END,
      CASE WHEN sr.status IN ('succeeded','degraded','failed','cancelled') AND sr.heartbeat_at IS NULL
        THEN 'MISSING_TERMINAL_HEARTBEAT' END,
      CASE WHEN COALESCE(sr.fetched_count, 0) > 0
        AND (sr.accepted_count::numeric / sr.fetched_count::numeric) < 0.95
        THEN 'PARSE_SUCCESS_BELOW_95' END,
      CASE WHEN COALESCE(sr.fetched_count, 0) > 0
        AND (sr.quarantined_count::numeric / sr.fetched_count::numeric) > 0.05
        THEN 'QUARANTINE_ABOVE_5' END,
      CASE WHEN sr.enabled AND NOT EXISTS (
        SELECT 1 FROM public.offer_offers o
        WHERE o.source_id = sr.id AND o.publication_status = 'published' AND o.expires_at > p_now
      ) THEN 'NO_FRESH_OFFERS' END
    ], NULL)
  FROM source_runs sr;
$$;

REVOKE ALL ON FUNCTION public.offer_sync_source_run_state() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offer_operations_health_v1(uuid,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.offer_operations_health_v1(uuid,timestamptz) TO service_role;
