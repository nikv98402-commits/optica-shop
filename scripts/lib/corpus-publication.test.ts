import { describe, expect, it, vi } from 'vitest';
import {
  EMBEDDING_DIMENSIONS,
  chunkText,
  createEmbeddingClient,
  mapDocument,
  publicationMetadata,
  publishApprovedArtifact,
  validateApproval,
  validateEmbedding,
  validateProtectedArtifactDigest,
} from './corpus-publication.mjs';

const approval = {
  corpusVersion: 'test-corpus-v1',
  datasetRevision: '648b8cfc93953ca0663a9c96a8d842a91b98fb64',
  manifestSha256: 'a'.repeat(64),
  configSha256: 'b'.repeat(64),
  taxonomyVersion: 'taxonomy-v1',
  taxonomySha256: 'c'.repeat(64),
  licensePolicyVersion: 'licenses-v1',
  chunkPolicyVersion: 'chunks-v1',
  embeddingProvider: 'cloudflare-workers-ai',
  embeddingModel: '@cf/qwen/qwen3-embedding-0.6b',
  embeddingDimensions: 1024,
  approvedAt: '2026-08-10T06:29:52.974Z',
  approvedByRole: 'owner-editor',
  protectedArtifactSha256: 'd'.repeat(64),
  expectedSourceCount: 1,
  expectedChunkCount: 1,
};

describe('approved corpus publication contract', () => {
  it('requires the exact owner-editor and embedding contract', () => {
    expect(validateApproval(approval)).toEqual(approval);
    expect(() => validateApproval({ ...approval, approvedByRole: 'admin' })).toThrow('owner-editor');
    expect(() => validateApproval({ ...approval, embeddingDimensions: 768 })).toThrow('1024');
  });

  it('requires the exact protected workflow-artifact digest', () => {
    expect(validateProtectedArtifactDigest('d'.repeat(64), approval)).toBe('d'.repeat(64));
    expect(() => validateProtectedArtifactDigest(undefined, approval)).toThrow('is required');
    expect(() => validateProtectedArtifactDigest('e'.repeat(64), approval)).toThrow('differs');
  });

  it('rejects malformed embedding vectors', () => {
    expect(validateEmbedding(Array(EMBEDDING_DIMENSIONS).fill(0))).toHaveLength(1024);
    expect(() => validateEmbedding(Array(1023).fill(0))).toThrow('1024');
    expect(() => validateEmbedding([...Array(1023).fill(0), Number.NaN])).toThrow('finite');
  });

  it('reproduces the configured deterministic chunk policy', () => {
    expect(chunkText('first paragraph\n\nsecond paragraph', {
      maxCharacters: 24,
      overlapCharacters: 4,
    })).toEqual(['first paragraph', 'raph\n\nsecond paragraph']);
  });

  it('maps only approved indexed source metadata', () => {
    const mapped = mapDocument({
      document_id: '1'.repeat(64),
      source_identifier: 'PMC123456',
      content_sha256: '2'.repeat(64),
      license: 'CC-BY-4.0',
      language: 'en',
      clean_text: 'Ophthalmology evidence.',
      title: '',
      creator: 'Test Author',
      year: 2024,
    }, approval);
    expect(mapped.source.url).toBe('https://pmc.ncbi.nlm.nih.gov/articles/PMC123456/');
    expect(mapped.source.reviewed_by_role).toBe('owner-editor');
    expect(mapped.source.title).toBe('PubMed Central PMC123456');
    expect(() => mapDocument({
      document_id: '1'.repeat(64), source_identifier: 'PMC123456',
      content_sha256: '2'.repeat(64), license: 'unknown', language: 'en',
      clean_text: 'text', year: 2024,
    }, approval)).toThrow('unapproved license');
  });

  it('uses Cloudflare direct fallback and validates every batch vector', async () => {
    const vector = Array(1024).fill(0.25);
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ result: { data: [vector, vector] } }));
    const embed = createEmbeddingClient({
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/test/ai/v1',
      apiKey: 'secret',
      fetchImpl,
    });
    await expect(embed(['one', 'two'])).resolves.toEqual([vector, vector]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('activates only after every source is staged', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce('source-id')
      .mockResolvedValueOnce('publication-id');
    const embedBatch = vi.fn().mockResolvedValue([Array(1024).fill(0)]);
    const loaded = {
      approval,
      mappedDocuments: [{
        source: { id: 'source-id' },
        chunks: [{ locale: 'en', content: 'text', token_count: 1, ordinal: 0 }],
      }],
    };
    await expect(publishApprovedArtifact(loaded, { embedBatch, rpc })).resolves.toBe('publication-id');
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'begin_knowledge_corpus_publication',
      'stage_knowledge_corpus_source',
      'activate_knowledge_corpus_publication',
    ]);
    expect(publicationMetadata(approval)).toHaveProperty(
      'protectedArtifactSha256',
      approval.protectedArtifactSha256,
    );
  });

  it('aborts partial staging without activation when embedding fails', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce(undefined);
    const embedBatch = vi.fn().mockRejectedValue(new Error('provider unavailable'));
    await expect(publishApprovedArtifact({
      approval,
      mappedDocuments: [{ source: {}, chunks: [{ content: 'text' }] }],
    }, { embedBatch, rpc })).rejects.toThrow('provider unavailable');
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'begin_knowledge_corpus_publication',
      'abort_knowledge_corpus_publication',
    ]);
  });

  it('aborts a partial publication when staging fails', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockRejectedValueOnce(new Error('staging failed'))
      .mockResolvedValueOnce(undefined);
    const embedBatch = vi.fn().mockResolvedValue([Array(1024).fill(0)]);
    await expect(publishApprovedArtifact({
      approval,
      mappedDocuments: [{ source: {}, chunks: [{ content: 'text' }] }],
    }, { embedBatch, rpc })).rejects.toThrow('staging failed');
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'begin_knowledge_corpus_publication',
      'stage_knowledge_corpus_source',
      'abort_knowledge_corpus_publication',
    ]);
  });

  it('aborts a complete staging set when activation fails', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce('source-id')
      .mockRejectedValueOnce(new Error('activation failed'))
      .mockResolvedValueOnce(undefined);
    const embedBatch = vi.fn().mockResolvedValue([Array(1024).fill(0)]);
    await expect(publishApprovedArtifact({
      approval,
      mappedDocuments: [{ source: {}, chunks: [{ content: 'text' }] }],
    }, { embedBatch, rpc })).rejects.toThrow('activation failed');
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'begin_knowledge_corpus_publication',
      'stage_knowledge_corpus_source',
      'activate_knowledge_corpus_publication',
      'abort_knowledge_corpus_publication',
    ]);
  });

  it('preserves the original publication error when abort also fails', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockRejectedValueOnce(new Error('staging failed'))
      .mockRejectedValueOnce(new Error('abort failed'));
    const embedBatch = vi.fn().mockResolvedValue([Array(1024).fill(0)]);
    await expect(publishApprovedArtifact({
      approval,
      mappedDocuments: [{ source: {}, chunks: [{ content: 'text' }] }],
    }, { embedBatch, rpc })).rejects.toThrow('staging failed');
  });
});
