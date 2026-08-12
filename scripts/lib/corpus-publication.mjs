import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';

export const EMBEDDING_PROVIDER = 'cloudflare-workers-ai';
export const EMBEDDING_MODEL = '@cf/qwen/qwen3-embedding-0.6b';
export const EMBEDDING_DIMENSIONS = 1024;
export const INDEXABLE_LICENSES = new Set([
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'PDM-1.0',
  'Public Domain',
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RETRYABLE_EMBEDDING_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const CHECKPOINT_VERSION = 1;

export async function fileSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export function validateApproval(value) {
  const errors = [];
  for (const field of [
    'corpusVersion', 'datasetRevision', 'manifestSha256', 'configSha256',
    'taxonomyVersion', 'taxonomySha256', 'licensePolicyVersion',
    'chunkPolicyVersion', 'approvedAt', 'protectedArtifactSha256',
  ]) {
    if (!value?.[field]) errors.push(`approval is missing ${field}`);
  }
  for (const field of ['manifestSha256', 'configSha256', 'taxonomySha256', 'protectedArtifactSha256']) {
    if (!SHA256_PATTERN.test(value?.[field] ?? '')) errors.push(`approval has invalid ${field}`);
  }
  if (value?.embeddingProvider !== EMBEDDING_PROVIDER) errors.push('embedding provider is not approved');
  if (value?.embeddingModel !== EMBEDDING_MODEL) errors.push('embedding model is not approved');
  if (value?.embeddingDimensions !== EMBEDDING_DIMENSIONS) errors.push('embedding dimensions must equal 1024');
  if (value?.approvedByRole !== 'owner-editor') errors.push('owner-editor approval is required');
  if (!Number.isInteger(value?.expectedSourceCount) || value.expectedSourceCount < 1) {
    errors.push('expectedSourceCount must be a positive integer');
  }
  if (!Number.isInteger(value?.expectedChunkCount) || value.expectedChunkCount < 1) {
    errors.push('expectedChunkCount must be a positive integer');
  }
  if (!Number.isFinite(Date.parse(value?.approvedAt ?? ''))) errors.push('approvedAt must be an ISO timestamp');
  if (errors.length) throw new Error(errors.join('\n'));
  return value;
}

export function validateProtectedArtifactDigest(observedSha256, approval) {
  if (!SHA256_PATTERN.test(observedSha256 ?? '')) {
    throw new Error('observed protected artifact SHA-256 is required');
  }
  if (observedSha256 !== approval.protectedArtifactSha256) {
    throw new Error('protected artifact SHA-256 differs from owner-editor approval');
  }
  return observedSha256;
}

export function validateEmbedding(vector) {
  if (!Array.isArray(vector)
    || vector.length !== EMBEDDING_DIMENSIONS
    || vector.some((item) => typeof item !== 'number' || !Number.isFinite(item))) {
    throw new Error('embedding must contain exactly 1024 finite dimensions');
  }
  return vector;
}

export function chunkText(text, { maxCharacters = 2400, overlapCharacters = 240 } = {}) {
  if (maxCharacters < 1 || overlapCharacters < 0 || overlapCharacters >= maxCharacters) {
    throw new Error('invalid chunk policy');
  }
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const units = splitLong(paragraph, maxCharacters);
    for (const unit of units) {
      const candidate = current ? `${current}\n\n${unit}` : unit;
      if (candidate.length <= maxCharacters) {
        current = candidate;
        continue;
      }
      if (current) {
        chunks.push(current);
        const prefix = overlapCharacters ? current.slice(-overlapCharacters).trimStart() : '';
        const overlapped = prefix ? `${prefix}\n\n${unit}` : unit;
        current = overlapped.length <= maxCharacters ? overlapped : unit;
      } else {
        current = unit;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitLong(text, maxCharacters) {
  if (text.length <= maxCharacters) return [text];
  const result = [];
  let current = [];
  let length = 0;
  for (const word of text.split(/\s+/)) {
    if (word.length > maxCharacters) {
      if (current.length) result.push(current.join(' '));
      current = [];
      length = 0;
      for (let index = 0; index < word.length; index += maxCharacters) {
        result.push(word.slice(index, index + maxCharacters));
      }
      continue;
    }
    const nextLength = length + word.length + (current.length ? 1 : 0);
    if (current.length && nextLength > maxCharacters) {
      result.push(current.join(' '));
      current = [];
      length = 0;
    }
    current.push(word);
    length += word.length + (current.length > 1 ? 1 : 0);
  }
  if (current.length) result.push(current.join(' '));
  return result;
}

export function deterministicUuid(namespace) {
  const bytes = Buffer.from(createHash('sha256').update(namespace).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sourceUrl(identifier) {
  if (!/^PMC\d+$/.test(identifier)) throw new Error('accepted corpus source lacks an approved PMC identifier');
  return `https://pmc.ncbi.nlm.nih.gov/articles/${identifier}/`;
}

export function mapDocument(document, approval) {
  if (!document?.document_id || !document?.source_identifier || !document?.content_sha256) {
    throw new Error('accepted document metadata is incomplete');
  }
  if (!INDEXABLE_LICENSES.has(document.license)) throw new Error('unapproved license in accepted corpus');
  if (!['en', 'ru'].includes(document.language)) throw new Error('unapproved language in accepted corpus');
  if (!SHA256_PATTERN.test(document.content_sha256)) throw new Error('invalid accepted content hash');
  if (typeof document.clean_text !== 'string' || !document.clean_text.trim()) {
    throw new Error('accepted document has no clean text');
  }
  const title = String(document.title || '').trim()
    || `PubMed Central ${document.source_identifier}`;
  const slug = `corpus-${approval.corpusVersion}-${document.document_id.slice(0, 24)}`;
  const chunks = chunkText(document.clean_text).map((content, ordinal) => ({
    locale: document.language,
    heading: title,
    content,
    token_count: Math.max(1, Math.ceil(content.length / 4)),
    ordinal,
  }));
  return {
    source: {
      id: deterministicUuid(`${approval.corpusVersion}:${document.document_id}`),
      slug,
      title,
      url: sourceUrl(document.source_identifier),
      publisher: 'PubMed Central',
      author: String(document.creator || '').trim() || null,
      published_at: `${Number(document.year)}-01-01`,
      language: document.language,
      license_code: document.license,
      adaptation_allowed: true,
      commercial_use_allowed: true,
      review_status: 'approved',
      indexable: true,
      reviewed_at: approval.approvedAt,
      reviewed_by_role: approval.approvedByRole,
      content_sha256: document.content_sha256,
    },
    chunks,
  };
}

export async function loadApprovedArtifact(
  artifactDirectory,
  registryPath,
  { observedArtifactSha256 } = {},
) {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  if (registry.version !== 1 || !Array.isArray(registry.publications)) {
    throw new Error('approved corpus registry has an invalid schema');
  }
  const manifestPath = resolve(artifactDirectory, 'manifest.json');
  const manifestSha256 = await fileSha256(manifestPath);
  const approval = registry.publications.find((candidate) => candidate.manifestSha256 === manifestSha256);
  if (!approval) throw new Error('manifest is not explicitly approved');
  validateApproval(approval);
  validateProtectedArtifactDigest(observedArtifactSha256, approval);

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.source?.revision !== approval.datasetRevision
    || manifest.config_sha256 !== approval.configSha256
    || manifest.taxonomy_sha256 !== approval.taxonomySha256) {
    throw new Error('manifest provenance differs from owner-editor approval');
  }
  for (const [name, expectedHash] of Object.entries(manifest.files ?? {})) {
    if (basename(name) !== name || !SHA256_PATTERN.test(expectedHash)) throw new Error('manifest file entry is invalid');
    const observedHash = await fileSha256(resolve(artifactDirectory, name));
    if (observedHash !== expectedHash) throw new Error(`artifact hash mismatch: ${name}`);
  }

  const stats = JSON.parse(await readFile(resolve(artifactDirectory, 'stats.json'), 'utf8'));
  if (stats.accepted_count !== approval.expectedSourceCount
    || stats.chunk_count !== approval.expectedChunkCount
    || stats.duplicate_count !== 0) {
    throw new Error('artifact counts differ from owner-editor approval');
  }
  const licenses = (await readFile(resolve(artifactDirectory, 'licenses.csv'), 'utf8')).trim().split(/\r?\n/).slice(1);
  for (const row of licenses) {
    const [license, count] = row.split(',');
    if (!INDEXABLE_LICENSES.has(license) || Number(count) < 1) {
      throw new Error('artifact contains an unapproved accepted license');
    }
  }

  const mappedDocuments = [];
  const lines = createInterface({
    input: createReadStream(resolve(artifactDirectory, 'documents.jsonl'), { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (line.trim()) mappedDocuments.push(mapDocument(JSON.parse(line), approval));
  }
  const chunkCount = mappedDocuments.reduce((total, document) => total + document.chunks.length, 0);
  if (mappedDocuments.length !== approval.expectedSourceCount || chunkCount !== approval.expectedChunkCount) {
    throw new Error('reconstructed publication differs from approved corpus counts');
  }
  return { approval, manifest, stats, mappedDocuments, artifactDirectory: dirname(manifestPath) };
}

export function publicationMetadata(approval) {
  return {
    corpusVersion: approval.corpusVersion,
    datasetRevision: approval.datasetRevision,
    manifestSha256: approval.manifestSha256,
    protectedArtifactSha256: approval.protectedArtifactSha256,
    configSha256: approval.configSha256,
    taxonomyVersion: approval.taxonomyVersion,
    taxonomySha256: approval.taxonomySha256,
    licensePolicyVersion: approval.licensePolicyVersion,
    chunkPolicyVersion: approval.chunkPolicyVersion,
    embeddingProvider: approval.embeddingProvider,
    embeddingModel: approval.embeddingModel,
    embeddingDimensions: approval.embeddingDimensions,
    approvedAt: approval.approvedAt,
    approvedByRole: approval.approvedByRole,
  };
}

function retryDelay(response, attempt, { baseDelayMs, maxDelayMs, randomImpl }) {
  const retryAfter = response?.headers?.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(maxDelayMs, seconds * 1000);
    const timestamp = Date.parse(retryAfter);
    if (Number.isFinite(timestamp)) return Math.min(maxDelayMs, Math.max(0, timestamp - Date.now()));
  }
  const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
  return Math.round(exponential * (0.75 + (randomImpl() * 0.5)));
}

async function requestEmbedding(request, retryOptions) {
  let lastError;
  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt += 1) {
    try {
      const response = await request(AbortSignal.timeout(retryOptions.requestTimeoutMs));
      if (!RETRYABLE_EMBEDDING_STATUSES.has(response.status) || attempt === retryOptions.maxRetries) {
        return response;
      }
      await retryOptions.sleepImpl(retryDelay(response, attempt, retryOptions));
    } catch (error) {
      lastError = error;
      if (attempt === retryOptions.maxRetries) break;
      await retryOptions.sleepImpl(retryDelay(null, attempt, retryOptions));
    }
  }
  throw new Error('embedding provider request failed after retries', { cause: lastError });
}

export function createEmbeddingClient({
  baseUrl,
  apiKey,
  model = EMBEDDING_MODEL,
  fetchImpl = fetch,
  maxRetries = 4,
  baseDelayMs = 250,
  maxDelayMs = 8000,
  requestTimeoutMs = 30000,
  sleepImpl = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)),
  randomImpl = Math.random,
}) {
  if (!baseUrl || !apiKey || model !== EMBEDDING_MODEL) throw new Error('approved embedding provider is not configured');
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 8
    || !Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 120000
    || baseDelayMs < 1 || maxDelayMs < baseDelayMs) {
    throw new Error('invalid embedding retry policy');
  }
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const retryOptions = {
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    requestTimeoutMs,
    sleepImpl,
    randomImpl,
  };

  return async function embedBatch(texts) {
    if (!Array.isArray(texts) || texts.length < 1 || texts.length > 32) throw new Error('invalid embedding batch');
    const compatible = await requestEmbedding((signal) => fetchImpl(`${normalizedBaseUrl}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: texts }),
      signal,
    }), retryOptions);
    if (compatible.ok) {
      const body = await compatible.json();
      const vectors = body.data?.map((item) => item.embedding);
      if (!Array.isArray(vectors) || vectors.length !== texts.length) throw new Error('embedding batch response is incomplete');
      return vectors.map(validateEmbedding);
    }

    const directBase = normalizedBaseUrl.endsWith('/ai/v1')
      ? normalizedBaseUrl.slice(0, -'/ai/v1'.length)
      : null;
    if (compatible.status !== 404 || !directBase || !directBase.startsWith('https://api.cloudflare.com/client/v4/accounts/')) {
      throw new Error(`embedding provider failed with status ${compatible.status}`);
    }
    const direct = await requestEmbedding((signal) => fetchImpl(`${directBase}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts }),
      signal,
    }), retryOptions);
    if (!direct.ok) throw new Error(`embedding provider failed with status ${direct.status}`);
    const body = await direct.json();
    const vectors = Array.isArray(body.result) ? body.result : body.result?.data;
    if (!Array.isArray(vectors) || vectors.length !== texts.length) throw new Error('embedding batch response is incomplete');
    return vectors.map(validateEmbedding);
  };
}

export function createSupabaseRpcClient({ url, serviceRoleKey, fetchImpl = fetch }) {
  if (!url || !serviceRoleKey) throw new Error('Supabase server secrets are not configured');
  const baseUrl = url.replace(/\/$/, '');
  return async function rpc(functionName, body) {
    const response = await fetchImpl(`${baseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Supabase RPC failed: ${functionName} (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };
}

export function validatePublicationGraph(loaded) {
  const sourceIds = new Set();
  const sourceSlugs = new Set();
  let chunkCount = 0;
  for (const document of loaded.mappedDocuments) {
    if (sourceIds.has(document.source.id) || sourceSlugs.has(document.source.slug)) {
      throw new Error('publication contains duplicate source identity');
    }
    sourceIds.add(document.source.id);
    sourceSlugs.add(document.source.slug);
    const chunkKeys = new Set();
    for (const chunk of document.chunks) {
      const key = `${chunk.locale}:${chunk.ordinal}`;
      if (chunkKeys.has(key)) throw new Error('publication contains duplicate chunk identity');
      chunkKeys.add(key);
      chunkCount += 1;
    }
  }
  if (sourceIds.size !== loaded.approval.expectedSourceCount
    || chunkCount !== loaded.approval.expectedChunkCount) {
    throw new Error('publication graph differs from approved counts');
  }
  return { sourceCount: sourceIds.size, chunkCount };
}

function validateCheckpoint(checkpoint, loaded) {
  if (!checkpoint
    || checkpoint.version !== CHECKPOINT_VERSION
    || checkpoint.mode !== 'stage-only'
    || checkpoint.manifestSha256 !== loaded.approval.manifestSha256
    || checkpoint.protectedArtifactSha256 !== loaded.approval.protectedArtifactSha256
    || checkpoint.expectedSourceCount !== loaded.approval.expectedSourceCount
    || checkpoint.expectedChunkCount !== loaded.approval.expectedChunkCount
    || typeof checkpoint.publicationId !== 'string'
    || !Array.isArray(checkpoint.completedSourceIds)) {
    throw new Error('checkpoint does not match the approved publication');
  }
  return checkpoint;
}

export function createCheckpointStore(path) {
  const checkpointPath = resolve(path);
  return {
    path: checkpointPath,
    async load() {
      try {
        return JSON.parse(await readFile(checkpointPath, 'utf8'));
      } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
      }
    },
    async save(checkpoint) {
      await mkdir(dirname(checkpointPath), { recursive: true });
      const temporaryPath = `${checkpointPath}.${process.pid}.${Date.now()}.tmp`;
      const handle = await open(temporaryPath, 'wx');
      try {
        await handle.writeFile(`${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryPath, checkpointPath);
    },
  };
}

function checkpointState(loaded, publicationId, completedSourceIds, status, extra = {}) {
  return {
    version: CHECKPOINT_VERSION,
    mode: 'stage-only',
    manifestSha256: loaded.approval.manifestSha256,
    protectedArtifactSha256: loaded.approval.protectedArtifactSha256,
    expectedSourceCount: loaded.approval.expectedSourceCount,
    expectedChunkCount: loaded.approval.expectedChunkCount,
    publicationId,
    completedSourceIds: [...completedSourceIds].sort(),
    status,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}

function assertVerifiedStaging(verification, loaded, publicationId) {
  if (!verification
    || verification.publication_id !== publicationId
    || verification.status !== 'staging'
    || verification.manifest_sha256 !== loaded.approval.manifestSha256
    || verification.expected_source_count !== loaded.approval.expectedSourceCount
    || verification.actual_source_count !== loaded.approval.expectedSourceCount
    || verification.expected_chunk_count !== loaded.approval.expectedChunkCount
    || verification.actual_chunk_count !== loaded.approval.expectedChunkCount
    || verification.invalid_embedding_count !== 0
    || verification.duplicate_source_count !== 0
    || verification.duplicate_chunk_count !== 0
    || verification.complete !== true) {
    throw new Error('staging verification failed closed');
  }
  return verification;
}

export async function stageApprovedArtifact(loaded, {
  embedBatch,
  rpc,
  checkpointStore,
  batchSize = 16,
}) {
  if (!checkpointStore) throw new Error('durable checkpoint store is required');
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 32) throw new Error('invalid embedding batch size');
  validatePublicationGraph(loaded);

  const existingCheckpoint = await checkpointStore.load();
  const validatedCheckpoint = existingCheckpoint ? validateCheckpoint(existingCheckpoint, loaded) : null;
  const publicationId = await rpc('begin_knowledge_corpus_publication', {
    p_publication: publicationMetadata(loaded.approval),
    p_expected_source_count: loaded.approval.expectedSourceCount,
    p_expected_chunk_count: loaded.approval.expectedChunkCount,
  });
  if (validatedCheckpoint && validatedCheckpoint.publicationId !== publicationId) {
    throw new Error('checkpoint publication differs from server staging publication');
  }
  const stagedSourceIds = await rpc('list_staged_knowledge_corpus_source_ids', {
    p_publication_id: publicationId,
  });
  if (!Array.isArray(stagedSourceIds)) throw new Error('server staging progress is unavailable');
  const approvedSourceIds = new Set(loaded.mappedDocuments.map((document) => document.source.id));
  const serverSourceIds = new Set(stagedSourceIds);
  if ([...serverSourceIds].some((sourceId) => !approvedSourceIds.has(sourceId))) {
    throw new Error('server staging contains a source outside the approved artifact');
  }
  const completedSourceIds = new Set(serverSourceIds);
  await checkpointStore.save(checkpointState(
    loaded,
    publicationId,
    completedSourceIds,
    'staging',
  ));

  try {
    for (const document of loaded.mappedDocuments) {
      if (completedSourceIds.has(document.source.id)) continue;
      const chunks = [];
      for (let index = 0; index < document.chunks.length; index += batchSize) {
        const batch = document.chunks.slice(index, index + batchSize);
        const embeddings = await embedBatch(batch.map((chunk) => chunk.content));
        chunks.push(...batch.map((chunk, batchIndex) => ({ ...chunk, embedding: embeddings[batchIndex] })));
      }
      await rpc('stage_knowledge_corpus_source', {
        p_publication_id: publicationId,
        p_source: document.source,
        p_chunks: chunks,
      });
      completedSourceIds.add(document.source.id);
      await checkpointStore.save(checkpointState(
        loaded,
        publicationId,
        completedSourceIds,
        'staging',
      ));
    }

    const verification = assertVerifiedStaging(await rpc('verify_knowledge_corpus_staging', {
      p_publication_id: publicationId,
    }), loaded, publicationId);
    const smokeDocument = loaded.mappedDocuments[0];
    const [queryEmbedding] = await embedBatch([smokeDocument.chunks[0].content]);
    validateEmbedding(queryEmbedding);
    const smokeResults = await rpc('match_staged_knowledge_chunks', {
      p_publication_id: publicationId,
      query_embedding: queryEmbedding,
      match_count: 3,
      similarity_threshold: 0.99,
    });
    if (!Array.isArray(smokeResults)
      || !smokeResults.some((result) => result.source_id === smokeDocument.source.id)) {
      throw new Error('staged retrieval smoke-test failed');
    }
    await checkpointStore.save(checkpointState(
      loaded,
      publicationId,
      completedSourceIds,
      'verified',
      { smokeSourceId: smokeDocument.source.id },
    ));
    return { publicationId, verification, smokeResults };
  } catch (error) {
    await checkpointStore.save(checkpointState(
      loaded,
      publicationId,
      completedSourceIds,
      'interrupted',
      { failureCode: 'stage_interrupted' },
    ));
    throw error;
  }
}

export async function activateStagedPublication(loaded, { rpc, checkpointStore }) {
  if (!checkpointStore) throw new Error('durable checkpoint store is required');
  const checkpoint = validateCheckpoint(await checkpointStore.load(), loaded);
  if (checkpoint.status !== 'verified') throw new Error('only verified staging can be activated');
  assertVerifiedStaging(await rpc('verify_knowledge_corpus_staging', {
    p_publication_id: checkpoint.publicationId,
  }), loaded, checkpoint.publicationId);
  const publicationId = await rpc('activate_knowledge_corpus_publication', {
    p_publication_id: checkpoint.publicationId,
  });
  await checkpointStore.save(checkpointState(
    loaded,
    publicationId,
    new Set(checkpoint.completedSourceIds),
    'activated',
    { activatedAt: new Date().toISOString() },
  ));
  return publicationId;
}
