import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReviewedRegistry } from './lib/knowledge-source-registry.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const registryPath = resolve(root, 'content/knowledge-assistant/sources.json');
const dryRun = process.argv.includes('--dry-run');

async function embed(text) {
  const baseUrl = process.env.KNOWLEDGE_EMBEDDING_BASE_URL;
  const apiKey = process.env.KNOWLEDGE_EMBEDDING_API_KEY;
  const model = process.env.KNOWLEDGE_EMBEDDING_MODEL;
  if (!baseUrl || !apiKey || !model) throw new Error('Embedding provider secrets are not configured');
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text }),
  });
  if (!response.ok) throw new Error(`Embedding provider failed: ${response.status}`);
  const body = await response.json();
  const vector = body.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== 1024) throw new Error('Embedding must contain exactly 1024 dimensions');
  return vector;
}

async function supabaseRequest(path, init = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server secrets are not configured');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers },
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  const responseBody = await response.text();
  return responseBody ? JSON.parse(responseBody) : null;
}

const registry = await loadReviewedRegistry(registryPath);
const chunkCount = registry.indexed.reduce((total, source) => total + source.chunks.length, 0);
const licenseCounts = registry.allSources.reduce((counts, source) => ({ ...counts, [source.license]: (counts[source.license] || 0) + 1 }), {});
console.log(JSON.stringify({ dryRun, registrySources: registry.allSources.length, indexedSources: registry.indexed.length, chunkCount, licenses: licenseCounts, hashes: registry.indexed.map(({ slug, contentSha256 }) => ({ slug, contentSha256 })) }, null, 2));

function sourcePayload(source, indexable) {
  return {
    id: source.id,
    slug: source.slug,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    author: source.author || null,
    published_at: source.publishedAt || null,
    language: source.language,
    license_code: source.license,
    adaptation_allowed: Boolean(source.adaptationAllowed),
    commercial_use_allowed: Boolean(source.commercialUseAllowed),
    review_status: source.reviewStatus,
    indexable,
    reviewed_at: source.reviewedAt,
    reviewed_by_role: source.reviewedByRole,
    content_sha256: indexable ? source.contentSha256 : null,
    updated_at: new Date().toISOString(),
  };
}

if (!dryRun) {
  for (const source of registry.allSources.filter((candidate) => candidate.index === false)) {
    await supabaseRequest('knowledge_sources?on_conflict=slug', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(sourcePayload(source, false)),
    });
  }

  for (const source of registry.indexed) {
    const chunks = [];
    for (const [ordinal, chunk] of source.chunks.entries()) {
      chunks.push({
        locale: source.language, heading: chunk.heading || null, content: chunk.content,
        embedding: await embed(chunk.content), token_count: chunk.tokenCount, ordinal,
      });
    }
    await supabaseRequest('rpc/replace_knowledge_source_chunks', {
      method: 'POST',
      body: JSON.stringify({ p_source: sourcePayload(source, true), p_chunks: chunks }),
    });
  }
  console.log(`Indexed ${registry.indexed.length} sources and ${chunkCount} chunks.`);
}
