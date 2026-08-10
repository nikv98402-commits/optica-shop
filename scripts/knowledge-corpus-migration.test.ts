import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260810100000_add_approved_knowledge_corpus_publication.sql',
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
