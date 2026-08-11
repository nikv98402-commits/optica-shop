import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260811100000_add_knowledge_retrieval_evaluation.sql',
), 'utf8');
const baseMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260721100000_create_knowledge_assistant.sql',
), 'utf8');

describe('knowledge retrieval evaluation migration', () => {
  it('uses the existing 1024-dimension cosine vector index', () => {
    expect(baseMigration).toContain('knowledge_chunks_embedding_cosine_idx');
    expect(baseMigration).toContain('embedding extensions.vector(1024)');
    expect(baseMigration).toContain('extensions.vector_cosine_ops');
    expect(migration).toContain('query_embedding extensions.vector(1024)');
  });

  it('pins every result to an active, non-revoked approved manifest', () => {
    expect(migration).toContain('publication.manifest_sha256 = required_manifest_sha256');
    expect(migration).toContain("publication.status = 'active'");
    expect(migration).toContain('approval.revoked_at IS NULL');
    expect(migration).toContain("approval.approved_by_role = 'owner-editor'");
    expect(migration).toContain("approval.embedding_model = '@cf/qwen/qwen3-embedding-0.6b'");
    expect(migration).toContain('approval.embedding_dimensions = 1024');
  });

  it('is read-only, capped at eight results, and service-role-only', () => {
    expect(migration).toContain('LANGUAGE sql');
    expect(migration).toContain('STABLE');
    expect(migration).toContain('LIMIT LEAST(GREATEST(match_count, 1), 8)');
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.evaluate_knowledge_retrieval\([\s\S]*?FROM PUBLIC, anon, authenticated;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.evaluate_knowledge_retrieval\([\s\S]*?TO service_role;/);
  });
});
