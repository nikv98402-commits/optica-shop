import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
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

export function createEmbeddingClient({ baseUrl, apiKey, model = EMBEDDING_MODEL, fetchImpl = fetch }) {
  if (!baseUrl || !apiKey || model !== EMBEDDING_MODEL) throw new Error('approved embedding provider is not configured');
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  return async function embedBatch(texts) {
    if (!Array.isArray(texts) || texts.length < 1 || texts.length > 32) throw new Error('invalid embedding batch');
    const compatible = await fetchImpl(`${normalizedBaseUrl}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: texts }),
    });
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
    const direct = await fetchImpl(`${directBase}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts }),
    });
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

export async function publishApprovedArtifact(loaded, { embedBatch, rpc, batchSize = 16 }) {
  let publicationId;
  try {
    publicationId = await rpc('begin_knowledge_corpus_publication', {
      p_publication: publicationMetadata(loaded.approval),
      p_expected_source_count: loaded.approval.expectedSourceCount,
      p_expected_chunk_count: loaded.approval.expectedChunkCount,
    });
    for (const document of loaded.mappedDocuments) {
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
    }
    await rpc('activate_knowledge_corpus_publication', { p_publication_id: publicationId });
    return publicationId;
  } catch (error) {
    if (publicationId) {
      try {
        await rpc('abort_knowledge_corpus_publication', {
          p_publication_id: publicationId,
          p_failure_code: 'publication_failed',
        });
      } catch {
        // Preserve the original stable failure; an operator can inspect staging metadata.
      }
    }
    throw error;
  }
}
