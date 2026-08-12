-- Resumable, service-role-only staging for an approved corpus publication.
-- This migration does not activate a publication. Activation remains an explicit RPC.

CREATE OR REPLACE FUNCTION public.begin_knowledge_corpus_publication(
  p_publication jsonb,
  p_expected_source_count integer,
  p_expected_chunk_count integer
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  publication_id uuid;
  approval public.knowledge_corpus_approvals%ROWTYPE;
  existing_publication public.knowledge_corpus_publications%ROWTYPE;
BEGIN
  IF jsonb_typeof(p_publication) <> 'object'
    OR p_expected_source_count < 1 OR p_expected_source_count > 100000
    OR p_expected_chunk_count < 1 OR p_expected_chunk_count > 2000000
    OR lower(coalesce(p_publication->>'manifestSha256', '')) !~ '^[0-9a-f]{64}$'
    OR lower(coalesce(p_publication->>'protectedArtifactSha256', '')) !~ '^[0-9a-f]{64}$'
    OR lower(coalesce(p_publication->>'configSha256', '')) !~ '^[0-9a-f]{64}$'
    OR lower(coalesce(p_publication->>'taxonomySha256', '')) !~ '^[0-9a-f]{64}$'
    OR p_publication->>'approvedByRole' <> 'owner-editor'
    OR p_publication->>'embeddingProvider' <> 'cloudflare-workers-ai'
    OR p_publication->>'embeddingModel' <> '@cf/qwen/qwen3-embedding-0.6b'
    OR coalesce((p_publication->>'embeddingDimensions')::integer, 0) <> 1024 THEN
    RAISE EXCEPTION 'invalid or unapproved corpus publication';
  END IF;

  SELECT * INTO approval
  FROM public.knowledge_corpus_approvals
  WHERE manifest_sha256 = lower(p_publication->>'manifestSha256')
    AND revoked_at IS NULL
  FOR SHARE;

  IF NOT FOUND
    OR approval.corpus_version <> p_publication->>'corpusVersion'
    OR approval.dataset_revision <> p_publication->>'datasetRevision'
    OR approval.protected_artifact_sha256 <> lower(p_publication->>'protectedArtifactSha256')
    OR approval.config_sha256 <> lower(p_publication->>'configSha256')
    OR approval.taxonomy_version <> p_publication->>'taxonomyVersion'
    OR approval.taxonomy_sha256 <> lower(p_publication->>'taxonomySha256')
    OR approval.license_policy_version <> p_publication->>'licensePolicyVersion'
    OR approval.chunk_policy_version <> p_publication->>'chunkPolicyVersion'
    OR approval.embedding_provider <> p_publication->>'embeddingProvider'
    OR approval.embedding_model <> p_publication->>'embeddingModel'
    OR approval.embedding_dimensions <> (p_publication->>'embeddingDimensions')::integer
    OR approval.approved_at <> (p_publication->>'approvedAt')::timestamptz
    OR approval.approved_by_role <> p_publication->>'approvedByRole'
    OR approval.expected_source_count <> p_expected_source_count
    OR approval.expected_chunk_count <> p_expected_chunk_count THEN
    RAISE EXCEPTION 'manifest is not present in the active owner-editor approval registry';
  END IF;

  SELECT * INTO existing_publication
  FROM public.knowledge_corpus_publications
  WHERE manifest_sha256 = approval.manifest_sha256
  FOR UPDATE;

  IF FOUND THEN
    IF existing_publication.status = 'staging' THEN
      RETURN existing_publication.id;
    END IF;
    IF existing_publication.status <> 'failed' THEN
      RAISE EXCEPTION 'corpus publication already exists with status %', existing_publication.status;
    END IF;

    DELETE FROM public.knowledge_sources
    WHERE corpus_publication_id = existing_publication.id;

    UPDATE public.knowledge_corpus_publications
    SET status = 'staging', previous_publication_id = NULL, activated_at = NULL,
        failed_at = NULL, failure_code = NULL, updated_at = clock_timestamp()
    WHERE id = existing_publication.id
    RETURNING id INTO publication_id;
    RETURN publication_id;
  END IF;

  INSERT INTO public.knowledge_corpus_publications (
    corpus_version, dataset_revision, manifest_sha256, config_sha256,
    taxonomy_version, taxonomy_sha256, license_policy_version,
    chunk_policy_version, embedding_provider, embedding_model,
    embedding_dimensions, approved_at, approved_by_role,
    expected_source_count, expected_chunk_count
  ) VALUES (
    p_publication->>'corpusVersion', p_publication->>'datasetRevision',
    lower(p_publication->>'manifestSha256'), lower(p_publication->>'configSha256'),
    p_publication->>'taxonomyVersion', lower(p_publication->>'taxonomySha256'),
    p_publication->>'licensePolicyVersion', p_publication->>'chunkPolicyVersion',
    p_publication->>'embeddingProvider', p_publication->>'embeddingModel',
    (p_publication->>'embeddingDimensions')::integer,
    (p_publication->>'approvedAt')::timestamptz, p_publication->>'approvedByRole',
    p_expected_source_count, p_expected_chunk_count
  )
  RETURNING id INTO publication_id;
  RETURN publication_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.stage_knowledge_corpus_source(
  p_publication_id uuid,
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
  publication public.knowledge_corpus_publications%ROWTYPE;
  existing_source public.knowledge_sources%ROWTYPE;
  saved_source_id uuid;
  chunk jsonb;
BEGIN
  SELECT * INTO publication
  FROM public.knowledge_corpus_publications
  WHERE id = p_publication_id
  FOR UPDATE;

  IF NOT FOUND OR publication.status <> 'staging'
    OR jsonb_typeof(p_source) <> 'object'
    OR jsonb_typeof(p_chunks) <> 'array'
    OR jsonb_array_length(p_chunks) < 1
    OR p_source->>'review_status' <> 'approved'
    OR p_source->>'reviewed_by_role' <> 'owner-editor'
    OR coalesce((p_source->>'indexable')::boolean, false) <> true
    OR p_source->>'license_code' NOT IN (
      'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'PDM-1.0', 'Public Domain'
    )
    OR lower(coalesce(p_source->>'content_sha256', '')) !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid staged corpus source';
  END IF;

  SELECT * INTO existing_source
  FROM public.knowledge_sources
  WHERE id = (p_source->>'id')::uuid
  FOR UPDATE;
  IF FOUND AND (existing_source.slug <> p_source->>'slug'
    OR existing_source.corpus_publication_id IS DISTINCT FROM p_publication_id) THEN
    RAISE EXCEPTION 'staged source identity belongs to another publication';
  END IF;
  PERFORM 1 FROM public.knowledge_sources
  WHERE slug = p_source->>'slug' AND id <> (p_source->>'id')::uuid;
  IF FOUND THEN
    RAISE EXCEPTION 'staged source slug belongs to another source';
  END IF;

  INSERT INTO public.knowledge_sources (
    id, slug, title, url, publisher, author, published_at, language,
    license_code, adaptation_allowed, commercial_use_allowed, review_status,
    indexable, reviewed_at, reviewed_by_role, content_sha256,
    corpus_publication_id, updated_at
  ) VALUES (
    (p_source->>'id')::uuid, p_source->>'slug', p_source->>'title',
    p_source->>'url', p_source->>'publisher', nullif(p_source->>'author', ''),
    nullif(p_source->>'published_at', '')::date, p_source->>'language',
    p_source->>'license_code', coalesce((p_source->>'adaptation_allowed')::boolean, false),
    coalesce((p_source->>'commercial_use_allowed')::boolean, false),
    'approved', true, (p_source->>'reviewed_at')::timestamptz, 'owner-editor',
    lower(p_source->>'content_sha256'), p_publication_id, clock_timestamp()
  )
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug, title = EXCLUDED.title, url = EXCLUDED.url,
    publisher = EXCLUDED.publisher, author = EXCLUDED.author,
    published_at = EXCLUDED.published_at, language = EXCLUDED.language,
    license_code = EXCLUDED.license_code,
    adaptation_allowed = EXCLUDED.adaptation_allowed,
    commercial_use_allowed = EXCLUDED.commercial_use_allowed,
    review_status = 'approved', indexable = true,
    reviewed_at = EXCLUDED.reviewed_at, reviewed_by_role = 'owner-editor',
    content_sha256 = EXCLUDED.content_sha256,
    corpus_publication_id = EXCLUDED.corpus_publication_id,
    updated_at = clock_timestamp()
  RETURNING id INTO saved_source_id;

  DELETE FROM public.knowledge_chunks WHERE source_id = saved_source_id;
  FOR chunk IN SELECT value FROM jsonb_array_elements(p_chunks)
  LOOP
    IF jsonb_typeof(chunk) <> 'object'
      OR chunk->>'locale' NOT IN ('ru', 'en')
      OR nullif(btrim(chunk->>'content'), '') IS NULL
      OR coalesce((chunk->>'token_count')::integer, 0) < 1
      OR coalesce((chunk->>'ordinal')::integer, -1) < 0
      OR jsonb_typeof(chunk->'embedding') <> 'array'
      OR jsonb_array_length(chunk->'embedding') <> publication.embedding_dimensions THEN
      RAISE EXCEPTION 'invalid staged chunk; locale/content/token_count/ordinal and exactly % embedding dimensions are required', publication.embedding_dimensions;
    END IF;
    INSERT INTO public.knowledge_chunks (
      source_id, locale, heading, content, embedding, token_count, ordinal
    ) VALUES (
      saved_source_id, chunk->>'locale', nullif(chunk->>'heading', ''),
      chunk->>'content', (chunk->'embedding')::text::extensions.vector,
      (chunk->>'token_count')::integer, (chunk->>'ordinal')::integer
    );
  END LOOP;
  RETURN saved_source_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_staged_knowledge_corpus_source_ids(p_publication_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(source.id ORDER BY source.id), ARRAY[]::uuid[])
  FROM public.knowledge_sources source
  JOIN public.knowledge_corpus_publications publication
    ON publication.id = source.corpus_publication_id
  WHERE publication.id = p_publication_id AND publication.status = 'staging';
$$;

CREATE OR REPLACE FUNCTION public.verify_knowledge_corpus_staging(p_publication_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH publication AS (
    SELECT * FROM public.knowledge_corpus_publications
    WHERE id = p_publication_id
  ), source_rows AS (
    SELECT ks.* FROM public.knowledge_sources ks
    WHERE ks.corpus_publication_id = p_publication_id
  ), chunk_rows AS (
    SELECT kc.* FROM public.knowledge_chunks kc
    JOIN source_rows source ON source.id = kc.source_id
  ), duplicate_sources AS (
    SELECT count(*) AS count FROM (
      SELECT slug FROM source_rows GROUP BY slug HAVING count(*) > 1
    ) duplicate_groups
  ), duplicate_chunks AS (
    SELECT count(*) AS count FROM (
      SELECT source_id, locale, ordinal FROM chunk_rows
      GROUP BY source_id, locale, ordinal HAVING count(*) > 1
    ) duplicate_groups
  )
  SELECT jsonb_build_object(
    'publication_id', publication.id,
    'status', publication.status,
    'manifest_sha256', publication.manifest_sha256,
    'expected_source_count', publication.expected_source_count,
    'actual_source_count', (SELECT count(*) FROM source_rows),
    'expected_chunk_count', publication.expected_chunk_count,
    'actual_chunk_count', (SELECT count(*) FROM chunk_rows),
    'invalid_embedding_count', (SELECT count(*) FROM chunk_rows WHERE vector_dims(embedding) <> 1024),
    'duplicate_source_count', (SELECT count FROM duplicate_sources),
    'duplicate_chunk_count', (SELECT count FROM duplicate_chunks),
    'complete', publication.status = 'staging'
      AND (SELECT count(*) FROM source_rows) = publication.expected_source_count
      AND (SELECT count(*) FROM chunk_rows) = publication.expected_chunk_count
      AND (SELECT count(*) FROM chunk_rows WHERE vector_dims(embedding) <> 1024) = 0
      AND (SELECT count FROM duplicate_sources) = 0
      AND (SELECT count FROM duplicate_chunks) = 0
  )
  FROM publication;
$$;

CREATE OR REPLACE FUNCTION public.match_staged_knowledge_chunks(
  p_publication_id uuid,
  query_embedding extensions.vector(1024),
  match_count integer DEFAULT 3,
  similarity_threshold double precision DEFAULT 0.99
)
RETURNS TABLE (chunk_id uuid, source_id uuid, similarity double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT kc.id, ks.id, 1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_sources ks ON ks.id = kc.source_id
  JOIN public.knowledge_corpus_publications publication
    ON publication.id = ks.corpus_publication_id
  WHERE publication.id = p_publication_id
    AND publication.status = 'staging'
    AND ks.review_status = 'approved'
    AND ks.indexable = true
    AND 1 - (kc.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 8);
$$;

REVOKE ALL ON FUNCTION public.verify_knowledge_corpus_staging(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_staged_knowledge_corpus_source_ids(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_staged_knowledge_chunks(
  uuid, extensions.vector, integer, double precision
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_knowledge_corpus_staging(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.list_staged_knowledge_corpus_source_ids(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.match_staged_knowledge_chunks(
  uuid, extensions.vector, integer, double precision
) TO service_role;

COMMENT ON FUNCTION public.verify_knowledge_corpus_staging(uuid) IS
  'Service-role-only fail-closed staging validation; never activates a corpus publication.';
COMMENT ON FUNCTION public.match_staged_knowledge_chunks(
  uuid, extensions.vector, integer, double precision
) IS 'Service-role-only bounded smoke-test for one staging publication; never exposes staged content.';
