import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260810100000_add_approved_knowledge_corpus_publication.sql',
), 'utf8');
const stageOnlyMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260812120000_add_knowledge_corpus_stage_only.sql',
), 'utf8');
const publicationCli = readFileSync(resolve(
  process.cwd(),
  'scripts/publish-approved-corpus.mjs',
), 'utf8');

describe('knowledge corpus publication migration', () => {
  it('pins the explicitly approved manifest and Cloudflare embedding contract', () => {
    expect(migration).toContain('8cdee30ea536d4f53524fcd5b50893191ee8763423fc27cc8d7449d17d49fd9f');
    expect(migration).toContain("p_publication->>'protectedArtifactSha256'");
    expect(migration).toContain('approval.protected_artifact_sha256');
    expect(migration).toContain("embedding_model = '@cf/qwen/qwen3-embedding-0.6b'");
    expect(migration).toContain('embedding_dimensions = 1024');
    expect(migration).toContain("approved_by_role = 'owner-editor'");
  });

  it('keeps corpus tables and publication RPCs server-only', () => {
    expect(migration).toContain('REVOKE ALL ON public.knowledge_corpus_approvals FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('REVOKE ALL ON public.knowledge_corpus_publications FROM PUBLIC, anon, authenticated');
    for (const rpc of [
      'begin_knowledge_corpus_publication',
      'stage_knowledge_corpus_source',
      'activate_knowledge_corpus_publication',
      'abort_knowledge_corpus_publication',
      'rollback_knowledge_corpus_publication',
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${rpc}`);
      expect(migration).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${rpc}\\([\\s\\S]*?TO service_role;`));
    }
  });

  it('filters staged and superseded corpus versions from the existing retrieval RPC', () => {
    expect(migration).toContain("ks.corpus_publication_id IS NULL OR publication.status = 'active'");
    expect(migration).toContain("publication.status <> 'staging'");
    expect(migration).toContain('total_source_count <> publication.expected_source_count');
    expect(migration).toContain('staged corpus counts do not match approved manifest');
  });

  it('allows only failed instances of the exact approved manifest to retry', () => {
    expect(migration).toContain("existing_publication.status <> 'failed'");
    expect(migration).toContain("SET status = 'staging'");
    expect(migration).toContain('failed_at = NULL');
    expect(migration).toContain('failure_code = NULL');
  });
});

describe('knowledge corpus stage-only migration', () => {
  it('resumes only the same approved staging publication', () => {
    expect(stageOnlyMigration).toContain("existing_publication.status = 'staging'");
    expect(stageOnlyMigration).toContain('RETURN existing_publication.id');
    expect(stageOnlyMigration).toContain('staged source identity belongs to another publication');
    expect(stageOnlyMigration).toContain('ON CONFLICT (id) DO UPDATE SET');
    expect(stageOnlyMigration).toContain('DELETE FROM public.knowledge_chunks WHERE source_id = saved_source_id');
  });

  it('verifies counts, dimensions and duplicate identities before activation', () => {
    expect(stageOnlyMigration).toContain('verify_knowledge_corpus_staging');
    expect(stageOnlyMigration).toContain("vector_dims(embedding) <> 1024");
    expect(stageOnlyMigration).toContain("chunk->>'locale' NOT IN ('ru', 'en')");
    expect(stageOnlyMigration).toContain("nullif(btrim(chunk->>'content'), '') IS NULL");
    expect(stageOnlyMigration).toContain("coalesce((chunk->>'token_count')::integer, 0) < 1");
    expect(stageOnlyMigration).toContain("coalesce((chunk->>'ordinal')::integer, -1) < 0");
    expect(stageOnlyMigration).toContain("'duplicate_source_count'");
    expect(stageOnlyMigration).toContain("'duplicate_chunk_count'");
    expect(stageOnlyMigration).toContain("publication.status = 'staging'");
  });

  it('exposes only a bounded metadata-only staging smoke-test to service_role', () => {
    expect(stageOnlyMigration).toContain('match_staged_knowledge_chunks');
    expect(stageOnlyMigration).toContain('RETURNS TABLE (chunk_id uuid, source_id uuid, similarity double precision)');
    expect(stageOnlyMigration).toContain('LIMIT LEAST(GREATEST(match_count, 1), 8)');
    for (const rpc of [
      'list_staged_knowledge_corpus_source_ids',
      'verify_knowledge_corpus_staging',
      'match_staged_knowledge_chunks',
    ]) {
      expect(stageOnlyMigration).toContain(`REVOKE ALL ON FUNCTION public.${rpc}`);
      expect(stageOnlyMigration).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${rpc}\\([\\s\\S]*?TO service_role;`));
    }
  });

  it('does not invoke activation from staging SQL', () => {
    expect(stageOnlyMigration).not.toMatch(/PERFORM\s+public\.activate_knowledge_corpus_publication/i);
    expect(stageOnlyMigration).not.toMatch(/SELECT\s+public\.activate_knowledge_corpus_publication/i);
  });

  it('keeps staging and activation as separate explicit CLI commands', () => {
    expect(publicationCli).toContain("const stageOnly = args.includes('--stage-only')");
    expect(publicationCli).toContain("const activate = args.includes('--activate')");
    expect(publicationCli).toContain("args.includes('--publish')");
    expect(publicationCli).toContain("activationPerformed: false");
    expect(publicationCli).toMatch(/if \(activate\) \{[\s\S]*?activateStagedPublication/);
    expect(publicationCli).toMatch(/else \{[\s\S]*?stageApprovedArtifact/);
  });
});
