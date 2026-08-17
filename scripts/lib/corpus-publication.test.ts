import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EMBEDDING_DIMENSIONS,
  activateStagedPublication,
  chunkText,
  createCheckpointStore,
  createEmbeddingClient,
  createProxyDispatcher,
  createSupabaseRpcClient,
  mapDocument,
  preflightPublicationConnections,
  publicationMetadata,
  proxyUrlFromEnvironment,
  stageApprovedArtifact,
  validateApproval,
  validateEmbedding,
  validatePublicationGraph,
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

const vector = Array(1024).fill(0.25);
const sourceId = '00000000-0000-4000-8000-000000000001';
const loaded = {
  approval,
  mappedDocuments: [{
    source: { id: sourceId, slug: 'source-one' },
    chunks: [{ locale: 'en', content: 'text', token_count: 1, ordinal: 0 }],
  }],
};

function verifiedStaging() {
  return {
    publication_id: 'publication-id',
    status: 'staging',
    manifest_sha256: approval.manifestSha256,
    expected_source_count: 1,
    actual_source_count: 1,
    expected_chunk_count: 1,
    actual_chunk_count: 1,
    invalid_embedding_count: 0,
    duplicate_source_count: 0,
    duplicate_chunk_count: 0,
    complete: true,
  };
}

function checkpoint(status = 'staging', completedSourceIds: string[] = []) {
  return {
    version: 1,
    mode: 'stage-only',
    manifestSha256: approval.manifestSha256,
    protectedArtifactSha256: approval.protectedArtifactSha256,
    expectedSourceCount: 1,
    expectedChunkCount: 1,
    publicationId: 'publication-id',
    completedSourceIds,
    status,
    updatedAt: '2026-08-12T00:00:00.000Z',
  };
}

function memoryCheckpointStore(initial: ReturnType<typeof checkpoint> | null = null) {
  let value = initial;
  return {
    load: vi.fn(async () => value),
    save: vi.fn(async (next) => { value = next; }),
    current: () => value,
  };
}

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

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
    const dispatcher = { dispatch: vi.fn() };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ result: { data: [vector, vector] } }));
    const embed = createEmbeddingClient({
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/test/ai/v1',
      apiKey: 'secret',
      fetchImpl,
      dispatcher,
    });
    await expect(embed(['one', 'two'])).resolves.toEqual([vector, vector]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.every(([, options]) => options.dispatcher === dispatcher)).toBe(true);
  });

  it('retries transient Cloudflare failures with bounded backoff', async () => {
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'retry-after': '1' } }))
      .mockResolvedValueOnce(Response.json({ data: [{ embedding: vector }] }));
    const embed = createEmbeddingClient({
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/test/ai/v1',
      apiKey: 'secret',
      fetchImpl,
      sleepImpl,
      randomImpl: () => 0.5,
    });
    await expect(embed(['one'])).resolves.toEqual([vector]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledWith(1000);
  });

  it('aborts and retries a stalled Cloudflare request', async () => {
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn()
      .mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      }))
      .mockResolvedValueOnce(Response.json({ data: [{ embedding: vector }] }));
    const embed = createEmbeddingClient({
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/test/ai/v1',
      apiKey: 'secret',
      fetchImpl,
      maxRetries: 1,
      requestTimeoutMs: 1,
      sleepImpl,
      randomImpl: () => 0.5,
    });
    await expect(embed(['one'])).resolves.toEqual([vector]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it('passes the configured proxy dispatcher to Cloudflare requests', async () => {
    const dispatcher = { dispatch: vi.fn() };
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      data: [{ embedding: vector }],
    }));
    const embed = createEmbeddingClient({
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/test/ai/v1',
      apiKey: 'secret',
      fetchImpl,
      dispatcher,
    });
    await embed(['one']);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ dispatcher });
  });

  it('uses proxy environment precedence and validates proxy URLs', async () => {
    expect(proxyUrlFromEnvironment({
      HTTPS_PROXY: 'http://127.0.0.1:10809',
      HTTP_PROXY: 'http://fallback:8080',
    })).toBe('http://127.0.0.1:10809');
    expect(proxyUrlFromEnvironment({})).toBeNull();
    expect(createProxyDispatcher(null)).toBeNull();
    expect(() => createProxyDispatcher('not a URL')).toThrow('URL is invalid');
    expect(() => createProxyDispatcher('socks5://127.0.0.1:10809'))
      .toThrow('must use http or https');
    const dispatcher = createProxyDispatcher('http://127.0.0.1:10809');
    expect(dispatcher?.constructor.name).toBe('ProxyAgent');
    await dispatcher?.close();
  });

  it('preflights both endpoints through the proxy before staging', async () => {
    const dispatcher = { dispatch: vi.fn() };
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(preflightPublicationConnections({
      supabaseUrl: 'https://project.supabase.co',
      embeddingBaseUrl: 'https://api.cloudflare.com/client/v4/accounts/test/ai/v1',
      dispatcher,
      fetchImpl,
      sleepImpl,
      randomImpl: () => 0.5,
    })).resolves.toEqual({ Supabase: 200, 'embedding provider': 404 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.every(([, options]) => options.dispatcher === dispatcher)).toBe(true);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it('fails preflight on terminal proxy and upstream statuses', async () => {
    await expect(preflightPublicationConnections({
      supabaseUrl: 'https://project.supabase.co',
      embeddingBaseUrl: 'https://api.cloudflare.com/client/v4/accounts/test/ai/v1',
      fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 407 })),
      maxRetries: 0,
    })).rejects.toThrow('Supabase preflight failed with status 407');
    await expect(preflightPublicationConnections({
      supabaseUrl: 'https://project.supabase.co',
      embeddingBaseUrl: 'https://api.cloudflare.com/client/v4/accounts/test/ai/v1',
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline')),
      maxRetries: 0,
    })).rejects.toThrow('Supabase preflight connection failed after retries');
  });

  it('retries timed-out Supabase RPCs and preserves the proxy dispatcher', async () => {
    const dispatcher = { dispatch: vi.fn() };
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('connect timeout'), { code: 'UND_ERR_CONNECT_TIMEOUT' }))
      .mockResolvedValueOnce(Response.json('publication-id'));
    const rpc = createSupabaseRpcClient({
      url: 'https://project.supabase.co',
      serviceRoleKey: 'secret',
      dispatcher,
      fetchImpl,
      sleepImpl,
      randomImpl: () => 0.5,
    });
    await expect(rpc('begin_knowledge_corpus_publication', {})).resolves.toBe('publication-id');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.every(([, options]) => options.dispatcher === dispatcher)).toBe(true);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it('retries retryable Supabase HTTP responses', async () => {
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const retryableResponse = new Response('retry later', { status: 503 });
    const cancel = vi.spyOn(retryableResponse.body!, 'cancel');
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(retryableResponse)
      .mockResolvedValueOnce(Response.json(['source-id']));
    const rpc = createSupabaseRpcClient({
      url: 'https://project.supabase.co',
      serviceRoleKey: 'secret',
      fetchImpl,
      sleepImpl,
      randomImpl: () => 0.5,
    });
    await expect(rpc('list_staged_knowledge_corpus_source_ids', {
      p_publication_id: 'publication-id',
    })).resolves.toEqual(['source-id']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('does not retry activation when the server outcome is ambiguous', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(
      Object.assign(new Error('response lost'), { code: 'UND_ERR_CONNECT_TIMEOUT' }),
    );
    const rpc = createSupabaseRpcClient({
      url: 'https://project.supabase.co',
      serviceRoleKey: 'secret',
      fetchImpl,
      sleepImpl: vi.fn(),
    });
    await expect(rpc('activate_knowledge_corpus_publication', {
      p_publication_id: 'publication-id',
    })).rejects.toThrow('failed after retries');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('persists a durable checkpoint as valid JSON', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vilu-stage-only-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'checkpoint.json');
    const store = createCheckpointStore(path);
    await store.save(checkpoint('verified', [sourceId]));
    await expect(store.load()).resolves.toMatchObject({
      mode: 'stage-only',
      status: 'verified',
      completedSourceIds: [sourceId],
    });
    await expect(readFile(path, 'utf8')).resolves.toContain('"manifestSha256"');
  });

  it('rejects duplicate source and chunk identities before any remote write', () => {
    expect(validatePublicationGraph(loaded)).toEqual({ sourceCount: 1, chunkCount: 1 });
    expect(() => validatePublicationGraph({
      ...loaded,
      approval: { ...approval, expectedSourceCount: 2, expectedChunkCount: 2 },
      mappedDocuments: [loaded.mappedDocuments[0], loaded.mappedDocuments[0]],
    })).toThrow('duplicate source identity');
    expect(() => validatePublicationGraph({
      ...loaded,
      approval: { ...approval, expectedChunkCount: 2 },
      mappedDocuments: [{
        ...loaded.mappedDocuments[0],
        chunks: [loaded.mappedDocuments[0].chunks[0], loaded.mappedDocuments[0].chunks[0]],
      }],
    })).toThrow('duplicate chunk identity');
  });

  it('stages and verifies without ever activating', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce('source-id')
      .mockResolvedValueOnce(verifiedStaging())
      .mockResolvedValueOnce([{ source_id: sourceId, similarity: 1 }]);
    const embedBatch = vi.fn().mockResolvedValue([vector]);
    const checkpointStore = memoryCheckpointStore();
    await expect(stageApprovedArtifact(loaded, {
      embedBatch,
      rpc,
      checkpointStore,
    })).resolves.toMatchObject({ publicationId: 'publication-id' });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'begin_knowledge_corpus_publication',
      'list_staged_knowledge_corpus_source_ids',
      'stage_knowledge_corpus_source',
      'verify_knowledge_corpus_staging',
      'match_staged_knowledge_chunks',
    ]);
    expect(checkpointStore.current()).toMatchObject({
      status: 'verified',
      completedSourceIds: [sourceId],
      smokeSourceId: sourceId,
    });
    expect(publicationMetadata(approval)).toHaveProperty(
      'protectedArtifactSha256',
      approval.protectedArtifactSha256,
    );
  });

  it('preserves partial staging and checkpoint when embedding fails', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce([]);
    const checkpointStore = memoryCheckpointStore();
    await expect(stageApprovedArtifact(loaded, {
      embedBatch: vi.fn().mockRejectedValue(new Error('provider unavailable')),
      rpc,
      checkpointStore,
    })).rejects.toThrow('provider unavailable');
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'begin_knowledge_corpus_publication',
      'list_staged_knowledge_corpus_source_ids',
    ]);
    expect(checkpointStore.current()).toMatchObject({
      status: 'interrupted',
      failureCode: 'stage_interrupted',
    });
  });

  it('resumes from completed source checkpoints without re-embedding them', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce([sourceId])
      .mockResolvedValueOnce(verifiedStaging())
      .mockResolvedValueOnce([{ source_id: sourceId, similarity: 1 }]);
    const embedBatch = vi.fn().mockResolvedValue([vector]);
    const checkpointStore = memoryCheckpointStore(checkpoint('interrupted', [sourceId]));
    await expect(stageApprovedArtifact(loaded, {
      embedBatch,
      rpc,
      checkpointStore,
    })).resolves.toMatchObject({ publicationId: 'publication-id' });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'begin_knowledge_corpus_publication',
      'list_staged_knowledge_corpus_source_ids',
      'verify_knowledge_corpus_staging',
      'match_staged_knowledge_chunks',
    ]);
    expect(embedBatch).toHaveBeenCalledTimes(1);
  });

  it('rejects a checkpoint for a different approved publication before remote writes', async () => {
    const rpc = vi.fn();
    const checkpointStore = memoryCheckpointStore({
      ...checkpoint('interrupted', [sourceId]),
      manifestSha256: 'f'.repeat(64),
    });
    await expect(stageApprovedArtifact(loaded, {
      embedBatch: vi.fn(),
      rpc,
      checkpointStore,
    })).rejects.toThrow('checkpoint does not match the approved publication');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when counts, dimensions, duplicates, or smoke retrieval differ', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce('source-id')
      .mockResolvedValueOnce({ ...verifiedStaging(), invalid_embedding_count: 1, complete: false });
    await expect(stageApprovedArtifact(loaded, {
      embedBatch: vi.fn().mockResolvedValue([vector]),
      rpc,
      checkpointStore: memoryCheckpointStore(),
    })).rejects.toThrow('staging verification failed closed');
  });

  it('fails closed when server staging contains an unapproved source id', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce(['00000000-0000-4000-8000-000000000099']);
    await expect(stageApprovedArtifact(loaded, {
      embedBatch: vi.fn(),
      rpc,
      checkpointStore: memoryCheckpointStore(checkpoint('interrupted', [sourceId])),
    })).rejects.toThrow('outside the approved artifact');
  });

  it('fails closed when staged retrieval cannot find the smoke source', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce('publication-id')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce('source-id')
      .mockResolvedValueOnce(verifiedStaging())
      .mockResolvedValueOnce([]);
    const checkpointStore = memoryCheckpointStore();
    await expect(stageApprovedArtifact(loaded, {
      embedBatch: vi.fn().mockResolvedValue([vector]),
      rpc,
      checkpointStore,
    })).rejects.toThrow('staged retrieval smoke-test failed');
    expect(checkpointStore.current()).toMatchObject({
      status: 'interrupted',
      failureCode: 'stage_interrupted',
    });
  });

  it('keeps activation as a separate explicit command', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce(verifiedStaging())
      .mockResolvedValueOnce('publication-id');
    const checkpointStore = memoryCheckpointStore(checkpoint('verified', [sourceId]));
    await expect(activateStagedPublication(loaded, { rpc, checkpointStore }))
      .resolves.toBe('publication-id');
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'verify_knowledge_corpus_staging',
      'activate_knowledge_corpus_publication',
    ]);
    expect(checkpointStore.current()).toMatchObject({ status: 'activated' });
  });

  it('refuses activation until the staging checkpoint is verified', async () => {
    const rpc = vi.fn();
    await expect(activateStagedPublication(loaded, {
      rpc,
      checkpointStore: memoryCheckpointStore(checkpoint('interrupted', [sourceId])),
    })).rejects.toThrow('only verified staging can be activated');
    expect(rpc).not.toHaveBeenCalled();
  });
});
