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
  reviewed_at timestamptz,
  reviewed_by_role text,
  content_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (review_status <> 'approved' OR (reviewed_at IS NOT NULL AND reviewed_by_role IS NOT NULL))
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

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.knowledge_sources FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.knowledge_chunks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.knowledge_sources TO service_role;
GRANT ALL ON public.knowledge_chunks TO service_role;

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
