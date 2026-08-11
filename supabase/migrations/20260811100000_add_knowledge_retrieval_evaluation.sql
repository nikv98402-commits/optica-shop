-- Read-only, manifest-pinned retrieval surface for the #86 release gate.
-- The runtime RPC remains unchanged; this function deliberately excludes
-- ViLu-owned unversioned sources so evaluation can prove corpus provenance.

CREATE OR REPLACE FUNCTION public.evaluate_knowledge_retrieval(
  query_embedding extensions.vector(1024),
  required_manifest_sha256 text,
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
  similarity double precision,
  corpus_publication_id uuid,
  corpus_version text,
  manifest_sha256 text,
  publication_status text
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
    1 - (kc.embedding <=> query_embedding) AS similarity,
    publication.id,
    publication.corpus_version,
    publication.manifest_sha256,
    publication.status
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_sources ks ON ks.id = kc.source_id
  JOIN public.knowledge_corpus_publications publication
    ON publication.id = ks.corpus_publication_id
  JOIN public.knowledge_corpus_approvals approval
    ON approval.manifest_sha256 = publication.manifest_sha256
  WHERE required_manifest_sha256 ~ '^[0-9a-f]{64}$'
    AND publication.manifest_sha256 = required_manifest_sha256
    AND publication.status = 'active'
    AND approval.revoked_at IS NULL
    AND approval.approved_by_role = 'owner-editor'
    AND approval.embedding_model = '@cf/qwen/qwen3-embedding-0.6b'
    AND approval.embedding_dimensions = 1024
    AND ks.review_status = 'approved'
    AND ks.indexable = true
    AND 1 - (kc.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 8);
$$;

REVOKE ALL ON FUNCTION public.evaluate_knowledge_retrieval(
  extensions.vector, text, integer, double precision
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_knowledge_retrieval(
  extensions.vector, text, integer, double precision
) TO service_role;

COMMENT ON FUNCTION public.evaluate_knowledge_retrieval(
  extensions.vector, text, integer, double precision
) IS 'Service-role-only, read-only retrieval gate pinned to one approved active corpus manifest; capped at Recall@8 evaluation depth.';
