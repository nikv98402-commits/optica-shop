-- Versioned, server-only corpus publication for the existing Knowledge Assistant index.
-- Staged corpus rows remain invisible to retrieval until the complete version is
-- atomically activated. Existing ViLu-owned sources keep corpus_publication_id NULL.

CREATE TABLE public.knowledge_corpus_approvals (
  manifest_sha256 text PRIMARY KEY CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  corpus_version text UNIQUE NOT NULL CHECK (length(corpus_version) BETWEEN 3 AND 120),
  dataset_revision text NOT NULL CHECK (length(dataset_revision) BETWEEN 7 AND 160),
  config_sha256 text NOT NULL CHECK (config_sha256 ~ '^[0-9a-f]{64}$'),
  taxonomy_version text NOT NULL CHECK (length(taxonomy_version) BETWEEN 1 AND 120),
  taxonomy_sha256 text NOT NULL CHECK (taxonomy_sha256 ~ '^[0-9a-f]{64}$'),
  license_policy_version text NOT NULL CHECK (length(license_policy_version) BETWEEN 1 AND 120),
  chunk_policy_version text NOT NULL CHECK (length(chunk_policy_version) BETWEEN 1 AND 120),
  embedding_provider text NOT NULL CHECK (embedding_provider = 'cloudflare-workers-ai'),
  embedding_model text NOT NULL CHECK (embedding_model = '@cf/qwen/qwen3-embedding-0.6b'),
  embedding_dimensions integer NOT NULL CHECK (embedding_dimensions = 1024),
  expected_source_count integer NOT NULL CHECK (expected_source_count > 0),
  expected_chunk_count integer NOT NULL CHECK (expected_chunk_count > 0),
  protected_artifact_sha256 text NOT NULL CHECK (protected_artifact_sha256 ~ '^[0-9a-f]{64}$'),
  approved_at timestamptz NOT NULL,
  approved_by_role text NOT NULL CHECK (approved_by_role = 'owner-editor'),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.knowledge_corpus_approvals (
  manifest_sha256, corpus_version, dataset_revision, config_sha256,
  taxonomy_version, taxonomy_sha256, license_policy_version,
  chunk_policy_version, embedding_provider, embedding_model,
  embedding_dimensions, expected_source_count, expected_chunk_count,
  protected_artifact_sha256, approved_at, approved_by_role
) VALUES (
  '8cdee30ea536d4f53524fcd5b50893191ee8763423fc27cc8d7449d17d49fd9f',
  'ophthalmology-pilot-2026-08-10',
  '648b8cfc93953ca0663a9c96a8d842a91b98fb64',
  'f11dc813fe23d6b25f276e17c413cd42ef824347876e0cdacf2111208748fbc6',
  'ophthalmology-taxonomy-v1',
  'b8efd88caf6f13c34c9bbe79b7416567a2d39b4b55a6bb66aa8fc5367e4700c3',
  'exact-open-licenses-v1',
  'chars-2400-overlap-240-v1',
  'cloudflare-workers-ai',
  '@cf/qwen/qwen3-embedding-0.6b',
  1024,
  301,
  6663,
  '6f63485962b19269cdd7b7d459888ae4ec60289ecb6c761903e3ee322c050adf',
  '2026-08-10T09:29:52.9743526+03:00'::timestamptz,
  'owner-editor'
);

CREATE TABLE public.knowledge_corpus_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_version text UNIQUE NOT NULL CHECK (length(corpus_version) BETWEEN 3 AND 120),
  dataset_revision text NOT NULL CHECK (length(dataset_revision) BETWEEN 7 AND 160),
  manifest_sha256 text UNIQUE NOT NULL
    REFERENCES public.knowledge_corpus_approvals(manifest_sha256) ON DELETE RESTRICT,
  config_sha256 text NOT NULL CHECK (config_sha256 ~ '^[0-9a-f]{64}$'),
  taxonomy_version text NOT NULL CHECK (length(taxonomy_version) BETWEEN 1 AND 120),
  taxonomy_sha256 text NOT NULL CHECK (taxonomy_sha256 ~ '^[0-9a-f]{64}$'),
  license_policy_version text NOT NULL CHECK (length(license_policy_version) BETWEEN 1 AND 120),
  chunk_policy_version text NOT NULL CHECK (length(chunk_policy_version) BETWEEN 1 AND 120),
  embedding_provider text NOT NULL CHECK (embedding_provider = 'cloudflare-workers-ai'),
  embedding_model text NOT NULL CHECK (embedding_model = '@cf/qwen/qwen3-embedding-0.6b'),
  embedding_dimensions integer NOT NULL CHECK (embedding_dimensions = 1024),
  approved_at timestamptz NOT NULL,
  approved_by_role text NOT NULL CHECK (approved_by_role = 'owner-editor'),
  expected_source_count integer NOT NULL CHECK (expected_source_count > 0),
  expected_chunk_count integer NOT NULL CHECK (expected_chunk_count > 0),
  status text NOT NULL DEFAULT 'staging'
    CHECK (status IN ('staging', 'active', 'superseded', 'failed', 'rolled_back')),
  previous_publication_id uuid REFERENCES public.knowledge_corpus_publications(id),
  activated_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR activated_at IS NOT NULL),
  CHECK (status <> 'failed' OR (failed_at IS NOT NULL AND failure_code IS NOT NULL))
);

CREATE UNIQUE INDEX knowledge_corpus_one_active_idx
  ON public.knowledge_corpus_publications ((status))
  WHERE status = 'active';

ALTER TABLE public.knowledge_sources
  ADD COLUMN corpus_publication_id uuid
    REFERENCES public.knowledge_corpus_publications(id) ON DELETE RESTRICT;

CREATE INDEX knowledge_sources_corpus_publication_idx
  ON public.knowledge_sources(corpus_publication_id)
  WHERE corpus_publication_id IS NOT NULL;

ALTER TABLE public.knowledge_corpus_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_corpus_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.knowledge_corpus_approvals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.knowledge_corpus_publications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.knowledge_corpus_approvals TO service_role;
GRANT ALL ON public.knowledge_corpus_publications TO service_role;

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
    IF existing_publication.status <> 'failed' THEN
      RAISE EXCEPTION 'corpus publication already exists with status %', existing_publication.status;
    END IF;

    DELETE FROM public.knowledge_sources
    WHERE corpus_publication_id = existing_publication.id;

    UPDATE public.knowledge_corpus_publications
    SET status = 'staging',
        previous_publication_id = NULL,
        activated_at = NULL,
        failed_at = NULL,
        failure_code = NULL,
        updated_at = clock_timestamp()
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
    p_publication->>'corpusVersion',
    p_publication->>'datasetRevision',
    lower(p_publication->>'manifestSha256'),
    lower(p_publication->>'configSha256'),
    p_publication->>'taxonomyVersion',
    lower(p_publication->>'taxonomySha256'),
    p_publication->>'licensePolicyVersion',
    p_publication->>'chunkPolicyVersion',
    p_publication->>'embeddingProvider',
    p_publication->>'embeddingModel',
    (p_publication->>'embeddingDimensions')::integer,
    (p_publication->>'approvedAt')::timestamptz,
    p_publication->>'approvedByRole',
    p_expected_source_count,
    p_expected_chunk_count
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

  INSERT INTO public.knowledge_sources (
    id, slug, title, url, publisher, author, published_at, language,
    license_code, adaptation_allowed, commercial_use_allowed, review_status,
    indexable, reviewed_at, reviewed_by_role, content_sha256,
    corpus_publication_id, updated_at
  ) VALUES (
    (p_source->>'id')::uuid,
    p_source->>'slug',
    p_source->>'title',
    p_source->>'url',
    p_source->>'publisher',
    nullif(p_source->>'author', ''),
    nullif(p_source->>'published_at', '')::date,
    p_source->>'language',
    p_source->>'license_code',
    coalesce((p_source->>'adaptation_allowed')::boolean, false),
    coalesce((p_source->>'commercial_use_allowed')::boolean, false),
    'approved',
    true,
    (p_source->>'reviewed_at')::timestamptz,
    'owner-editor',
    lower(p_source->>'content_sha256'),
    p_publication_id,
    clock_timestamp()
  ) RETURNING id INTO saved_source_id;

  FOR chunk IN SELECT value FROM jsonb_array_elements(p_chunks)
  LOOP
    IF jsonb_typeof(chunk->'embedding') <> 'array'
      OR jsonb_array_length(chunk->'embedding') <> publication.embedding_dimensions THEN
      RAISE EXCEPTION 'embedding must contain exactly % dimensions', publication.embedding_dimensions;
    END IF;

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

CREATE OR REPLACE FUNCTION public.activate_knowledge_corpus_publication(
  p_publication_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  publication public.knowledge_corpus_publications%ROWTYPE;
  prior_id uuid;
  total_source_count integer;
  source_count integer;
  chunk_count integer;
BEGIN
  LOCK TABLE public.knowledge_corpus_publications IN SHARE ROW EXCLUSIVE MODE;

  SELECT * INTO publication
  FROM public.knowledge_corpus_publications
  WHERE id = p_publication_id
  FOR UPDATE;

  IF NOT FOUND OR publication.status <> 'staging' THEN
    RAISE EXCEPTION 'corpus publication is not staging';
  END IF;

  SELECT count(*) INTO total_source_count
  FROM public.knowledge_sources
  WHERE corpus_publication_id = p_publication_id;

  SELECT count(*) INTO source_count
  FROM public.knowledge_sources
  WHERE corpus_publication_id = p_publication_id
    AND review_status = 'approved'
    AND indexable = true
    AND reviewed_by_role = 'owner-editor'
    AND license_code IN (
      'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'PDM-1.0', 'Public Domain'
    );

  SELECT count(*) INTO chunk_count
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_sources ks ON ks.id = kc.source_id
  WHERE ks.corpus_publication_id = p_publication_id;

  IF total_source_count <> publication.expected_source_count
    OR source_count <> publication.expected_source_count
    OR chunk_count <> publication.expected_chunk_count THEN
    RAISE EXCEPTION 'staged corpus counts do not match approved manifest';
  END IF;

  SELECT id INTO prior_id
  FROM public.knowledge_corpus_publications
  WHERE status = 'active'
  FOR UPDATE;

  IF prior_id IS NOT NULL THEN
    UPDATE public.knowledge_corpus_publications
    SET status = 'superseded', updated_at = clock_timestamp()
    WHERE id = prior_id;
  END IF;

  UPDATE public.knowledge_corpus_publications
  SET status = 'active',
      previous_publication_id = prior_id,
      activated_at = clock_timestamp(),
      updated_at = clock_timestamp()
  WHERE id = p_publication_id;

  RETURN p_publication_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.abort_knowledge_corpus_publication(
  p_publication_id uuid,
  p_failure_code text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_failure_code !~ '^[a-z0-9_]{3,64}$' THEN
    RAISE EXCEPTION 'invalid failure code';
  END IF;

  DELETE FROM public.knowledge_sources
  WHERE corpus_publication_id = p_publication_id
    AND EXISTS (
      SELECT 1 FROM public.knowledge_corpus_publications publication
      WHERE publication.id = p_publication_id AND publication.status = 'staging'
    );

  UPDATE public.knowledge_corpus_publications
  SET status = 'failed', failed_at = clock_timestamp(),
      failure_code = p_failure_code, updated_at = clock_timestamp()
  WHERE id = p_publication_id AND status = 'staging';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'corpus publication is not staging';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_knowledge_corpus_publication(
  p_active_publication_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_id uuid;
BEGIN
  LOCK TABLE public.knowledge_corpus_publications IN SHARE ROW EXCLUSIVE MODE;

  SELECT previous_publication_id INTO previous_id
  FROM public.knowledge_corpus_publications
  WHERE id = p_active_publication_id AND status = 'active'
  FOR UPDATE;

  IF previous_id IS NULL THEN
    RAISE EXCEPTION 'active corpus publication has no rollback target';
  END IF;

  PERFORM 1 FROM public.knowledge_corpus_publications
  WHERE id = previous_id AND status = 'superseded'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rollback target is unavailable';
  END IF;

  UPDATE public.knowledge_corpus_publications
  SET status = 'rolled_back', updated_at = clock_timestamp()
  WHERE id = p_active_publication_id;

  UPDATE public.knowledge_corpus_publications
  SET status = 'active', activated_at = clock_timestamp(), updated_at = clock_timestamp()
  WHERE id = previous_id;

  RETURN previous_id;
END;
$$;

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
  LEFT JOIN public.knowledge_corpus_publications publication
    ON publication.id = ks.corpus_publication_id
  WHERE ks.review_status = 'approved'
    AND ks.indexable = true
    AND (ks.corpus_publication_id IS NULL OR publication.status = 'active')
    AND 1 - (kc.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 8);
$$;

REVOKE ALL ON FUNCTION public.begin_knowledge_corpus_publication(jsonb, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stage_knowledge_corpus_source(uuid, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_knowledge_corpus_publication(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.abort_knowledge_corpus_publication(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_knowledge_corpus_publication(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks(extensions.vector, integer, double precision)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.begin_knowledge_corpus_publication(jsonb, integer, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.stage_knowledge_corpus_source(uuid, jsonb, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_knowledge_corpus_publication(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.abort_knowledge_corpus_publication(uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_knowledge_corpus_publication(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(extensions.vector, integer, double precision)
  TO service_role;

COMMENT ON TABLE public.knowledge_corpus_publications IS
  'Approved corpus versions staged and atomically activated for the existing server-only Knowledge Assistant index.';
COMMENT ON TABLE public.knowledge_corpus_approvals IS
  'Explicit owner-editor manifest approvals. Server-only and fail-closed; revoked manifests cannot start publication.';
COMMENT ON COLUMN public.knowledge_sources.corpus_publication_id IS
  'Nullable version link. NULL preserves the existing reviewed ViLu source lifecycle.';
