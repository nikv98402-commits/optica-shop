BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(14);

SELECT has_function(
  'public', 'evaluate_knowledge_retrieval',
  ARRAY['extensions.vector', 'text', 'integer', 'double precision'],
  'manifest-pinned evaluation RPC exists'
);
SELECT ok(
  NOT has_function_privilege('anon',
    'public.evaluate_knowledge_retrieval(extensions.vector,text,integer,double precision)', 'EXECUTE'),
  'anon cannot execute evaluation retrieval'
);
SELECT ok(
  NOT has_function_privilege('authenticated',
    'public.evaluate_knowledge_retrieval(extensions.vector,text,integer,double precision)', 'EXECUTE'),
  'authenticated users cannot execute evaluation retrieval'
);
SELECT ok(
  has_function_privilege('service_role',
    'public.evaluate_knowledge_retrieval(extensions.vector,text,integer,double precision)', 'EXECUTE'),
  'service role can execute evaluation retrieval'
);
SELECT is(
  (SELECT count(*)::integer FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = 'knowledge_chunks_embedding_cosine_idx'),
  1, 'the 1024-dimension cosine vector index remains installed'
);

INSERT INTO public.knowledge_corpus_approvals (
  manifest_sha256, corpus_version, dataset_revision, config_sha256,
  taxonomy_version, taxonomy_sha256, license_policy_version,
  chunk_policy_version, embedding_provider, embedding_model,
  embedding_dimensions, expected_source_count, expected_chunk_count,
  protected_artifact_sha256, approved_at, approved_by_role
) VALUES (
  repeat('9', 64), 'evaluation-sql-v1', 'revision-evaluation-v1', repeat('8', 64),
  'taxonomy-v1', repeat('7', 64), 'exact-open-licenses-v1',
  'chunks-v1', 'cloudflare-workers-ai', '@cf/qwen/qwen3-embedding-0.6b',
  1024, 1, 1, repeat('6', 64), '2026-08-11T00:00:00Z', 'owner-editor'
);
INSERT INTO public.knowledge_corpus_publications (
  id, corpus_version, dataset_revision, manifest_sha256, config_sha256,
  taxonomy_version, taxonomy_sha256, license_policy_version, chunk_policy_version,
  embedding_provider, embedding_model, embedding_dimensions, approved_at,
  approved_by_role, expected_source_count, expected_chunk_count, status, activated_at
) VALUES (
  '00000000-0000-4000-8000-000000000861', 'evaluation-sql-v1',
  'revision-evaluation-v1', repeat('9', 64), repeat('8', 64), 'taxonomy-v1',
  repeat('7', 64), 'exact-open-licenses-v1', 'chunks-v1',
  'cloudflare-workers-ai', '@cf/qwen/qwen3-embedding-0.6b', 1024,
  '2026-08-11T00:00:00Z', 'owner-editor', 1, 1, 'active', clock_timestamp()
);
INSERT INTO public.knowledge_sources (
  id, slug, title, url, publisher, published_at, language, license_code,
  adaptation_allowed, commercial_use_allowed, review_status, indexable,
  reviewed_at, reviewed_by_role, content_sha256, corpus_publication_id
) VALUES (
  '00000000-0000-4000-8000-000000000862', 'evaluation-source-v1',
  'Evaluation source', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1/',
  'PubMed Central', '2024-01-01', 'en', 'CC-BY-4.0', true, true,
  'approved', true, clock_timestamp(), 'owner-editor', repeat('5', 64),
  '00000000-0000-4000-8000-000000000861'
);
INSERT INTO public.knowledge_chunks (
  id, source_id, locale, heading, content, embedding, token_count, ordinal
) VALUES (
  '00000000-0000-4000-8000-000000000863',
  '00000000-0000-4000-8000-000000000862', 'en', 'Evaluation',
  'reviewed exact evidence', array_fill(0.0::real, ARRAY[1024])::extensions.vector, 3, 0
);

SELECT is(
  (SELECT count(*)::integer FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('9', 64), 8, -1)),
  1, 'exact approved active manifest is visible'
);
SELECT is(
  (SELECT count(*)::integer FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('4', 64), 8, -1)),
  0, 'manifest drift returns no chunks'
);
SELECT is(
  (SELECT manifest_sha256 FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('9', 64), 8, -1)
   LIMIT 1),
  repeat('9', 64), 'retrieval exposes provenance for the release report'
);

INSERT INTO public.knowledge_chunks (
  id, source_id, locale, heading, content, embedding, token_count, ordinal
)
SELECT
  gen_random_uuid(),
  '00000000-0000-4000-8000-000000000862',
  'en', 'Evaluation', 'additional reviewed evidence',
  array_fill(0.0::real, ARRAY[1024])::extensions.vector, 3, ordinal
FROM generate_series(1, 9) AS ordinal;

SELECT is(
  (SELECT count(*)::integer FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('9', 64), 99, -1)),
  8, 'match_count is capped at the Recall@8 evaluation depth'
);
SELECT is(
  (SELECT count(*)::integer FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('9', 64), 0, -1)),
  1, 'match_count is clamped to at least one result'
);

UPDATE public.knowledge_sources SET review_status = 'rejected'
WHERE id = '00000000-0000-4000-8000-000000000862';
SELECT is(
  (SELECT count(*)::integer FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('9', 64), 8, -1)),
  0, 'non-approved sources fail closed'
);
UPDATE public.knowledge_sources SET review_status = 'approved', indexable = false
WHERE id = '00000000-0000-4000-8000-000000000862';
SELECT is(
  (SELECT count(*)::integer FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('9', 64), 8, -1)),
  0, 'non-indexable sources fail closed'
);
UPDATE public.knowledge_sources SET indexable = true
WHERE id = '00000000-0000-4000-8000-000000000862';
UPDATE public.knowledge_corpus_publications SET status = 'staging', activated_at = NULL
WHERE id = '00000000-0000-4000-8000-000000000861';
SELECT is(
  (SELECT count(*)::integer FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('9', 64), 8, -1)),
  0, 'inactive publications fail closed'
);
UPDATE public.knowledge_corpus_publications SET status = 'active', activated_at = clock_timestamp()
WHERE id = '00000000-0000-4000-8000-000000000861';

UPDATE public.knowledge_corpus_approvals SET revoked_at = clock_timestamp()
WHERE manifest_sha256 = repeat('9', 64);
SELECT is(
  (SELECT count(*)::integer FROM public.evaluate_knowledge_retrieval(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, repeat('9', 64), 8, -1)),
  0, 'revoked approval fails closed even while publication row is active'
);

SELECT * FROM finish();
ROLLBACK;
