BEGIN;
SELECT plan(39);

SELECT has_table('public', 'knowledge_corpus_approvals', 'manifest approval registry exists');
SELECT has_table('public', 'knowledge_corpus_publications', 'corpus publication registry exists');
SELECT has_column('public', 'knowledge_sources', 'corpus_publication_id', 'sources extend the existing lifecycle');
SELECT has_function('public', 'begin_knowledge_corpus_publication',
  ARRAY['jsonb', 'integer', 'integer'], 'begin publication RPC exists');
SELECT has_function('public', 'stage_knowledge_corpus_source',
  ARRAY['uuid', 'jsonb', 'jsonb'], 'stage source RPC exists');
SELECT has_function('public', 'activate_knowledge_corpus_publication',
  ARRAY['uuid'], 'activate publication RPC exists');
SELECT has_function('public', 'rollback_knowledge_corpus_publication',
  ARRAY['uuid'], 'rollback publication RPC exists');
SELECT has_function('public', 'abort_knowledge_corpus_publication',
  ARRAY['uuid', 'text'], 'abort publication RPC exists');

SELECT function_privs_are('public', 'begin_knowledge_corpus_publication',
  ARRAY['jsonb', 'integer', 'integer'], 'anon', ARRAY[]::text[],
  'anon cannot begin corpus publication');
SELECT function_privs_are('public', 'stage_knowledge_corpus_source',
  ARRAY['uuid', 'jsonb', 'jsonb'], 'authenticated', ARRAY[]::text[],
  'authenticated cannot stage corpus sources');
SELECT function_privs_are('public', 'activate_knowledge_corpus_publication',
  ARRAY['uuid'], 'anon', ARRAY[]::text[],
  'anon cannot activate corpus publication');
SELECT table_privs_are('public', 'knowledge_corpus_approvals', 'anon', ARRAY[]::text[],
  'anon has no manifest approval table privileges');
SELECT table_privs_are('public', 'knowledge_corpus_publications', 'authenticated', ARRAY[]::text[],
  'authenticated has no corpus publication table privileges');
SELECT function_privs_are('public', 'begin_knowledge_corpus_publication',
  ARRAY['jsonb', 'integer', 'integer'], 'service_role', ARRAY['EXECUTE']::text[],
  'service role alone can begin corpus publication');
SELECT function_privs_are('public', 'stage_knowledge_corpus_source',
  ARRAY['uuid', 'jsonb', 'jsonb'], 'service_role', ARRAY['EXECUTE']::text[],
  'service role alone can stage corpus sources');
SELECT function_privs_are('public', 'activate_knowledge_corpus_publication',
  ARRAY['uuid'], 'service_role', ARRAY['EXECUTE']::text[],
  'service role alone can activate corpus publication');
SELECT function_privs_are('public', 'abort_knowledge_corpus_publication',
  ARRAY['uuid', 'text'], 'service_role', ARRAY['EXECUTE']::text[],
  'service role alone can abort corpus publication');
SELECT function_privs_are('public', 'rollback_knowledge_corpus_publication',
  ARRAY['uuid'], 'service_role', ARRAY['EXECUTE']::text[],
  'service role alone can roll back corpus publication');

INSERT INTO public.knowledge_corpus_approvals (
  manifest_sha256, corpus_version, dataset_revision, config_sha256,
  taxonomy_version, taxonomy_sha256, license_policy_version,
  chunk_policy_version, embedding_provider, embedding_model,
  embedding_dimensions, expected_source_count, expected_chunk_count,
  protected_artifact_sha256, approved_at, approved_by_role
) VALUES
  (repeat('1', 64), 'sql-test-v1', 'revision-test-v1', repeat('2', 64),
   'taxonomy-v1', repeat('3', 64), 'licenses-v1', 'chunks-v1',
   'cloudflare-workers-ai', '@cf/qwen/qwen3-embedding-0.6b', 1024, 1, 1,
   repeat('4', 64), '2026-08-10T06:00:00Z', 'owner-editor'),
  (repeat('5', 64), 'sql-test-v2', 'revision-test-v2', repeat('6', 64),
   'taxonomy-v1', repeat('7', 64), 'licenses-v1', 'chunks-v1',
   'cloudflare-workers-ai', '@cf/qwen/qwen3-embedding-0.6b', 1024, 1, 1,
   repeat('8', 64), '2026-08-10T06:05:00Z', 'owner-editor');

INSERT INTO public.knowledge_corpus_approvals (
  manifest_sha256, corpus_version, dataset_revision, config_sha256,
  taxonomy_version, taxonomy_sha256, license_policy_version,
  chunk_policy_version, embedding_provider, embedding_model,
  embedding_dimensions, expected_source_count, expected_chunk_count,
  protected_artifact_sha256, approved_at, approved_by_role, revoked_at
) VALUES (
  repeat('c', 64), 'sql-test-revoked', 'revision-revoked', repeat('d', 64),
  'taxonomy-v1', repeat('e', 64), 'licenses-v1', 'chunks-v1',
  'cloudflare-workers-ai', '@cf/qwen/qwen3-embedding-0.6b', 1024, 1, 1,
  repeat('f', 64), '2026-08-10T06:10:00Z', 'owner-editor', clock_timestamp()
);

SELECT throws_ok(
  $$SELECT public.begin_knowledge_corpus_publication(
    jsonb_build_object(
      'corpusVersion', 'sql-test-revoked', 'datasetRevision', 'revision-revoked',
      'manifestSha256', repeat('c', 64), 'protectedArtifactSha256', repeat('f', 64),
      'configSha256', repeat('d', 64),
      'taxonomyVersion', 'taxonomy-v1', 'taxonomySha256', repeat('e', 64),
      'licensePolicyVersion', 'licenses-v1', 'chunkPolicyVersion', 'chunks-v1',
      'embeddingProvider', 'cloudflare-workers-ai',
      'embeddingModel', '@cf/qwen/qwen3-embedding-0.6b',
      'embeddingDimensions', 1024, 'approvedAt', '2026-08-10T06:10:00Z',
      'approvedByRole', 'owner-editor'), 1, 1)$$,
  'P0001', 'manifest is not present in the active owner-editor approval registry',
  'revoked manifest cannot begin publication'
);

SELECT throws_ok(
  $$SELECT public.begin_knowledge_corpus_publication(
    jsonb_build_object(
      'corpusVersion', 'sql-test-v1', 'datasetRevision', 'revision-test-v1',
      'manifestSha256', repeat('1', 64), 'protectedArtifactSha256', repeat('0', 64),
      'configSha256', repeat('2', 64), 'taxonomyVersion', 'taxonomy-v1',
      'taxonomySha256', repeat('3', 64), 'licensePolicyVersion', 'licenses-v1',
      'chunkPolicyVersion', 'chunks-v1', 'embeddingProvider', 'cloudflare-workers-ai',
      'embeddingModel', '@cf/qwen/qwen3-embedding-0.6b', 'embeddingDimensions', 1024,
      'approvedAt', '2026-08-10T06:00:00Z', 'approvedByRole', 'owner-editor'), 1, 1)$$,
  'P0001', 'manifest is not present in the active owner-editor approval registry',
  'mismatched protected artifact digest cannot begin publication'
);

SELECT throws_ok(
  $$SELECT public.begin_knowledge_corpus_publication(
    jsonb_build_object(
      'corpusVersion', 'unapproved', 'datasetRevision', 'revision',
      'manifestSha256', repeat('9', 64), 'protectedArtifactSha256', repeat('4', 64),
      'configSha256', repeat('2', 64),
      'taxonomyVersion', 'taxonomy-v1', 'taxonomySha256', repeat('3', 64),
      'licensePolicyVersion', 'licenses-v1', 'chunkPolicyVersion', 'chunks-v1',
      'embeddingProvider', 'cloudflare-workers-ai',
      'embeddingModel', '@cf/qwen/qwen3-embedding-0.6b',
      'embeddingDimensions', 1024, 'approvedAt', '2026-08-10T06:00:00Z',
      'approvedByRole', 'owner-editor'), 1, 1)$$,
  'P0001', 'manifest is not present in the active owner-editor approval registry',
  'unapproved manifest cannot begin publication'
);

INSERT INTO public.knowledge_corpus_publications (
  id, corpus_version, dataset_revision, manifest_sha256, config_sha256,
  taxonomy_version, taxonomy_sha256, license_policy_version,
  chunk_policy_version, embedding_provider, embedding_model,
  embedding_dimensions, approved_at, approved_by_role,
  expected_source_count, expected_chunk_count
) VALUES
  ('00000000-0000-4000-8000-000000000891', 'sql-test-v1', 'revision-test-v1',
   repeat('1', 64), repeat('2', 64), 'taxonomy-v1', repeat('3', 64),
   'licenses-v1', 'chunks-v1', 'cloudflare-workers-ai',
   '@cf/qwen/qwen3-embedding-0.6b', 1024, '2026-08-10T06:00:00Z',
   'owner-editor', 1, 1),
  ('00000000-0000-4000-8000-000000000892', 'sql-test-v2', 'revision-test-v2',
   repeat('5', 64), repeat('6', 64), 'taxonomy-v1', repeat('7', 64),
   'licenses-v1', 'chunks-v1', 'cloudflare-workers-ai',
   '@cf/qwen/qwen3-embedding-0.6b', 1024, '2026-08-10T06:05:00Z',
   'owner-editor', 1, 1);

SELECT throws_ok(
  $$SELECT public.stage_knowledge_corpus_source(
    '00000000-0000-4000-8000-000000000891',
    jsonb_build_object(
      'id', '00000000-0000-4000-8000-000000000893',
      'slug', 'sql-test-source-v1', 'title', 'Test source',
      'url', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1/',
      'publisher', 'PubMed Central', 'published_at', '2024-01-01',
      'language', 'en', 'license_code', 'CC-BY-4.0',
      'adaptation_allowed', true, 'commercial_use_allowed', true,
      'review_status', 'approved', 'indexable', true,
      'reviewed_at', '2026-08-10T06:00:00Z',
      'reviewed_by_role', 'owner-editor', 'content_sha256', repeat('a', 64)),
    jsonb_build_array(jsonb_build_object(
      'locale', 'en', 'content', 'bad vector', 'token_count', 2,
      'ordinal', 0, 'embedding', to_jsonb(array_fill(0.0, ARRAY[1023])))))$$,
  'P0001', 'invalid staged chunk; locale/content/token_count/ordinal and exactly 1024 embedding dimensions are required',
  'wrong embedding dimensions fail before staging commits'
);

SELECT lives_ok(
  $$SELECT public.stage_knowledge_corpus_source(
    '00000000-0000-4000-8000-000000000891',
    jsonb_build_object(
      'id', '00000000-0000-4000-8000-000000000893',
      'slug', 'sql-test-source-v1', 'title', 'Test source',
      'url', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1/',
      'publisher', 'PubMed Central', 'published_at', '2024-01-01',
      'language', 'en', 'license_code', 'CC-BY-4.0',
      'adaptation_allowed', true, 'commercial_use_allowed', true,
      'review_status', 'approved', 'indexable', true,
      'reviewed_at', '2026-08-10T06:00:00Z',
      'reviewed_by_role', 'owner-editor', 'content_sha256', repeat('a', 64)),
    jsonb_build_array(jsonb_build_object(
      'locale', 'en', 'content', 'active evidence', 'token_count', 2,
      'ordinal', 0, 'embedding', to_jsonb(array_fill(0.0, ARRAY[1024])))))$$,
  'valid approved source can be staged'
);

SELECT is(
  (SELECT count(*)::integer FROM public.match_knowledge_chunks(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, 8, -1)),
  0, 'staging corpus is invisible to retrieval'
);

SELECT lives_ok(
  $$SELECT public.activate_knowledge_corpus_publication(
    '00000000-0000-4000-8000-000000000891')$$,
  'complete staged corpus activates'
);
SELECT is(
  (SELECT count(*)::integer FROM public.match_knowledge_chunks(
    array_fill(0.0::real, ARRAY[1024])::extensions.vector, 8, -1)),
  1, 'active corpus is visible to retrieval'
);

SELECT lives_ok(
  $$SELECT public.stage_knowledge_corpus_source(
    '00000000-0000-4000-8000-000000000892',
    jsonb_build_object(
      'id', '00000000-0000-4000-8000-000000000894',
      'slug', 'sql-test-source-v2', 'title', 'Replacement source',
      'url', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2/',
      'publisher', 'PubMed Central', 'published_at', '2025-01-01',
      'language', 'en', 'license_code', 'CC-BY-4.0',
      'adaptation_allowed', true, 'commercial_use_allowed', true,
      'review_status', 'approved', 'indexable', true,
      'reviewed_at', '2026-08-10T06:05:00Z',
      'reviewed_by_role', 'owner-editor', 'content_sha256', repeat('b', 64)),
    jsonb_build_array(jsonb_build_object(
      'locale', 'en', 'content', 'replacement evidence', 'token_count', 2,
      'ordinal', 0, 'embedding', to_jsonb(array_fill(0.0, ARRAY[1024])))))$$,
  'replacement corpus stages independently'
);
SELECT lives_ok(
  $$SELECT public.activate_knowledge_corpus_publication(
    '00000000-0000-4000-8000-000000000892')$$,
  'replacement activation is atomic'
);
SELECT is(
  (SELECT status FROM public.knowledge_corpus_publications
   WHERE id = '00000000-0000-4000-8000-000000000891'),
  'superseded', 'prior active corpus is retained as rollback target'
);
SELECT is(
  public.rollback_knowledge_corpus_publication(
    '00000000-0000-4000-8000-000000000892'),
  '00000000-0000-4000-8000-000000000891'::uuid,
  'rollback reactivates the immediate prior corpus'
);
SELECT is(
  (SELECT status FROM public.knowledge_corpus_publications
   WHERE id = '00000000-0000-4000-8000-000000000892'),
  'rolled_back', 'rolled-back corpus is no longer active'
);

UPDATE public.knowledge_corpus_publications
SET status = 'failed', failed_at = clock_timestamp(), failure_code = 'sql_test'
WHERE id = '00000000-0000-4000-8000-000000000892';

SELECT is(
  public.begin_knowledge_corpus_publication(
    jsonb_build_object(
      'corpusVersion', 'sql-test-v2', 'datasetRevision', 'revision-test-v2',
      'manifestSha256', repeat('5', 64), 'protectedArtifactSha256', repeat('8', 64),
      'configSha256', repeat('6', 64),
      'taxonomyVersion', 'taxonomy-v1', 'taxonomySha256', repeat('7', 64),
      'licensePolicyVersion', 'licenses-v1', 'chunkPolicyVersion', 'chunks-v1',
      'embeddingProvider', 'cloudflare-workers-ai',
      'embeddingModel', '@cf/qwen/qwen3-embedding-0.6b',
      'embeddingDimensions', 1024, 'approvedAt', '2026-08-10T06:05:00Z',
      'approvedByRole', 'owner-editor'), 1, 1),
  '00000000-0000-4000-8000-000000000892'::uuid,
  'failed publication can restart with the same exact approval'
);
SELECT is(
  (SELECT status FROM public.knowledge_corpus_publications
   WHERE id = '00000000-0000-4000-8000-000000000892'),
  'staging', 'retry clears failed state without creating a second publication'
);
SELECT is(
  (SELECT count(*)::integer FROM public.knowledge_sources
   WHERE corpus_publication_id = '00000000-0000-4000-8000-000000000892'),
  0, 'retry removes any partial rows before restaging'
);

SELECT throws_ok(
  $$SELECT public.activate_knowledge_corpus_publication(
    '00000000-0000-4000-8000-000000000892')$$,
  'P0001', 'staged corpus counts do not match approved manifest',
  'activation refuses an incomplete staging set'
);
SELECT throws_ok(
  $$SELECT public.abort_knowledge_corpus_publication(
    '00000000-0000-4000-8000-000000000892', 'INVALID-CODE')$$,
  'P0001', 'invalid failure code',
  'abort rejects unstable failure codes'
);
SELECT lives_ok(
  $$SELECT public.abort_knowledge_corpus_publication(
    '00000000-0000-4000-8000-000000000892', 'sql_test_abort')$$,
  'abort cleans the incomplete staging set'
);
SELECT is(
  (SELECT status FROM public.knowledge_corpus_publications
   WHERE id = '00000000-0000-4000-8000-000000000892'),
  'failed', 'aborted publication is marked failed'
);
SELECT throws_ok(
  $$SELECT public.rollback_knowledge_corpus_publication(
    '00000000-0000-4000-8000-000000000891')$$,
  'P0001', 'active corpus publication has no rollback target',
  'rollback fails closed when no predecessor exists'
);

SELECT * FROM finish();
ROLLBACK;
