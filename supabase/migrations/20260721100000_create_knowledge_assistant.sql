-- Isolated, server-only retrieval storage for the feature-flagged ViLu assistant.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  publisher text NOT NULL,
  author text,
  published_at date,
  language text NOT NULL CHECK (language IN ('ru', 'en')),
  license_code text NOT NULL,
  adaptation_allowed boolean NOT NULL DEFAULT false,
  commercial_use_allowed boolean NOT NULL DEFAULT false,
  review_status text NOT NULL CHECK (review_status IN ('draft', 'approved', 'rejected')),
  indexable boolean NOT NULL DEFAULT true,
  reviewed_at timestamptz,
  reviewed_by_role text,
  content_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (review_status <> 'approved' OR (reviewed_at IS NOT NULL AND reviewed_by_role IS NOT NULL)),
  CHECK (indexable = false OR content_sha256 IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('ru', 'en')),
  heading text,
  content text NOT NULL,
  embedding extensions.vector(1024) NOT NULL,
  token_count integer NOT NULL CHECK (token_count > 0),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, locale, ordinal)
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx
  ON public.knowledge_chunks(source_id);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_cosine_idx
  ON public.knowledge_chunks
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 10);

CREATE TABLE IF NOT EXISTS public.knowledge_rate_limits (
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_hash, window_start)
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.knowledge_sources FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.knowledge_chunks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.knowledge_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.knowledge_sources TO service_role;
GRANT ALL ON public.knowledge_chunks TO service_role;
GRANT ALL ON public.knowledge_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_knowledge_rate_limit(
  p_key_hash text,
  p_window_seconds integer DEFAULT 60,
  p_limit integer DEFAULT 20
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket_start timestamptz;
  observed_count integer;
BEGIN
  IF length(p_key_hash) < 16 OR length(p_key_hash) > 128
    OR p_window_seconds < 10 OR p_window_seconds > 3600
    OR p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'invalid rate limit input';
  END IF;

  bucket_start := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  DELETE FROM public.knowledge_rate_limits
  WHERE key_hash = p_key_hash AND window_start < bucket_start;

  INSERT INTO public.knowledge_rate_limits (key_hash, window_start, request_count, updated_at)
  VALUES (p_key_hash, bucket_start, 1, clock_timestamp())
  ON CONFLICT (key_hash, window_start) DO UPDATE
    SET request_count = public.knowledge_rate_limits.request_count + 1,
        updated_at = clock_timestamp()
  RETURNING request_count INTO observed_count;

  RETURN observed_count > p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_knowledge_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_knowledge_rate_limit(text, integer, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.replace_knowledge_source_chunks(
  p_source jsonb,
  p_chunks jsonb
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  saved_source_id uuid;
  chunk jsonb;
BEGIN
  IF jsonb_typeof(p_source) <> 'object' OR jsonb_typeof(p_chunks) <> 'array' THEN
    RAISE EXCEPTION 'invalid knowledge index payload';
  END IF;

  INSERT INTO public.knowledge_sources (
    id, slug, title, url, publisher, author, published_at, language,
    license_code, adaptation_allowed, commercial_use_allowed, review_status,
    indexable, reviewed_at, reviewed_by_role, content_sha256, updated_at
  ) VALUES (
    (p_source->>'id')::uuid, p_source->>'slug', p_source->>'title',
    p_source->>'url', p_source->>'publisher', nullif(p_source->>'author', ''),
    nullif(p_source->>'published_at', '')::date, p_source->>'language',
    p_source->>'license_code', coalesce((p_source->>'adaptation_allowed')::boolean, false),
    coalesce((p_source->>'commercial_use_allowed')::boolean, false),
    p_source->>'review_status', true, (p_source->>'reviewed_at')::timestamptz,
    p_source->>'reviewed_by_role', p_source->>'content_sha256', clock_timestamp()
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    url = EXCLUDED.url,
    publisher = EXCLUDED.publisher,
    author = EXCLUDED.author,
    published_at = EXCLUDED.published_at,
    language = EXCLUDED.language,
    license_code = EXCLUDED.license_code,
    adaptation_allowed = EXCLUDED.adaptation_allowed,
    commercial_use_allowed = EXCLUDED.commercial_use_allowed,
    review_status = EXCLUDED.review_status,
    indexable = true,
    reviewed_at = EXCLUDED.reviewed_at,
    reviewed_by_role = EXCLUDED.reviewed_by_role,
    content_sha256 = EXCLUDED.content_sha256,
    updated_at = clock_timestamp()
  RETURNING id INTO saved_source_id;

  DELETE FROM public.knowledge_chunks WHERE source_id = saved_source_id;

  FOR chunk IN SELECT value FROM jsonb_array_elements(p_chunks)
  LOOP
    INSERT INTO public.knowledge_chunks (
      source_id, locale, heading, content, embedding, token_count, ordinal
    ) VALUES (
      saved_source_id,
      chunk->>'locale',
      nullif(chunk->>'heading', ''),
      chunk->>'content',
      (chunk->'embedding')::text::extensions.vector,
      (chunk->>'token_count')::integer,
      (chunk->>'ordinal')::integer
    );
  END LOOP;

  RETURN saved_source_id;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_knowledge_source_chunks(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_knowledge_source_chunks(jsonb, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding extensions.vector(1024),
  match_count integer DEFAULT 8,
  similarity_threshold double precision DEFAULT 0.58
)
RETURNS TABLE (
  chunk_id uuid,
  source_id uuid,
  source_slug text,
  title text,
  url text,
  publisher text,
  published_at date,
  license_code text,
  locale text,
  heading text,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    kc.id,
    ks.id,
    ks.slug,
    ks.title,
    ks.url,
    ks.publisher,
    ks.published_at,
    ks.license_code,
    kc.locale,
    kc.heading,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_sources ks ON ks.id = kc.source_id
  WHERE ks.review_status = 'approved'
    AND ks.indexable = true
    AND 1 - (kc.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 8);
$$;

REVOKE ALL ON FUNCTION public.match_knowledge_chunks(extensions.vector, integer, double precision)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(extensions.vector, integer, double precision)
  TO service_role;

COMMENT ON TABLE public.knowledge_sources IS
  'Reviewed Knowledge Assistant registry metadata. Server-only; no browser policies.';
COMMENT ON TABLE public.knowledge_chunks IS
  'Reviewed source chunks and multilingual embeddings. Server-only; no browser policies.';
COMMENT ON TABLE public.knowledge_rate_limits IS
  'Hashed, short-window request counters for the server-only Knowledge Assistant endpoint.';
