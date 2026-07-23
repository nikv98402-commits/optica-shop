const live = process.argv.includes('--live');

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_FEATURE_KNOWLEDGE_ASSISTANT',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'KNOWLEDGE_CHAT_BASE_URL',
  'KNOWLEDGE_CHAT_API_KEY',
  'KNOWLEDGE_CHAT_MODEL',
  'KNOWLEDGE_EMBEDDING_BASE_URL',
  'KNOWLEDGE_EMBEDDING_API_KEY',
  'KNOWLEDGE_EMBEDDING_MODEL',
  'KNOWLEDGE_ALLOWED_ORIGINS',
  'KNOWLEDGE_PREVIEW_ORIGIN',
  'RATE_LIMIT_SALT',
];

function fail(message) {
  console.error(`Knowledge Assistant preview check failed: ${message}`);
  process.exitCode = 1;
}

function normalizedUrl(name) {
  try {
    return new URL(process.env[name]).origin;
  } catch {
    fail(`${name} must be an absolute URL`);
    return null;
  }
}

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) fail(`missing variables: ${missing.join(', ')}`);

if (process.env.VITE_FEATURE_KNOWLEDGE_ASSISTANT !== 'true') {
  fail('VITE_FEATURE_KNOWLEDGE_ASSISTANT must be exactly true in preview');
}

const supabaseOrigin = normalizedUrl('SUPABASE_URL');
const frontendSupabaseOrigin = normalizedUrl('VITE_SUPABASE_URL');
const previewOrigin = normalizedUrl('KNOWLEDGE_PREVIEW_ORIGIN');
normalizedUrl('KNOWLEDGE_CHAT_BASE_URL');
normalizedUrl('KNOWLEDGE_EMBEDDING_BASE_URL');

if (supabaseOrigin && frontendSupabaseOrigin && supabaseOrigin !== frontendSupabaseOrigin) {
  fail('frontend and server Supabase URLs must point to the same preview project');
}
if (supabaseOrigin === 'https://vilu.store' || previewOrigin === 'https://vilu.store') {
  fail('preview checks must not target vilu.store');
}

const allowedOrigins = new Set((process.env.KNOWLEDGE_ALLOWED_ORIGINS || '')
  .split(',').map((value) => value.trim()).filter(Boolean));
if (previewOrigin && !allowedOrigins.has(previewOrigin)) {
  fail('KNOWLEDGE_ALLOWED_ORIGINS must include KNOWLEDGE_PREVIEW_ORIGIN');
}

if (process.exitCode) process.exit();

console.log(JSON.stringify({
  mode: live ? 'live' : 'configuration',
  featureEnabled: true,
  previewOrigin,
  supabaseOrigin,
  providerContract: 'openai-compatible',
  expectedEmbeddingDimensions: 1024,
  expectedIndexedSources: 6,
}, null, 2));

if (!live) {
  console.log('Configuration shape is valid. Run with --live after migration, deployment, and indexing.');
  process.exit(0);
}

async function checkedJson(url, init, label) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  return response.json();
}

async function runLiveChecks() {
  const embeddingBaseUrl = process.env.KNOWLEDGE_EMBEDDING_BASE_URL.replace(/\/$/, '');
  const embedding = await checkedJson(`${embeddingBaseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KNOWLEDGE_EMBEDDING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.KNOWLEDGE_EMBEDDING_MODEL,
      input: 'ViLu preview readiness check',
    }),
  }, 'embedding provider');
  const vector = embedding.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== 1024 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error('embedding provider must return exactly 1024 numeric dimensions');
  }

  const sourceRows = await checkedJson(
    `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/knowledge_sources?select=slug,publisher,license_code,indexable,review_status&indexable=eq.true&review_status=eq.approved`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
    'knowledge source query',
  );
  if (!Array.isArray(sourceRows) || sourceRows.length !== 6) {
    throw new Error(`expected 6 approved indexed sources, received ${sourceRows?.length ?? 'invalid response'}`);
  }
  if (sourceRows.some((source) => source.publisher !== 'ViLu' || source.license_code !== 'vilu-owned')) {
    throw new Error('all indexed preview sources must be ViLu-owned');
  }

  const functionResponse = await checkedJson(
    `${process.env.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/knowledge-assistant`,
    {
      method: 'POST',
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        Origin: previewOrigin,
        'Content-Type': 'application/json',
        'x-vilu-client': 'preview-readiness-check',
      },
      body: JSON.stringify({
        query: 'Что такое Face-fit score?',
        locale: 'ru',
        recentTurns: [],
        preferences: {
          experience: 'beginner',
          interests: ['frame_fit'],
          answerLength: 'short',
        },
      }),
    },
    'knowledge-assistant Edge Function',
  );
  if (typeof functionResponse.answer !== 'string' || !functionResponse.answer.trim()) {
    throw new Error('Edge Function returned an empty answer');
  }
  if (!Array.isArray(functionResponse.citations) || functionResponse.citations.length < 1) {
    throw new Error('grounded preview answer must include at least one citation');
  }

  console.log(JSON.stringify({
    liveChecks: 'passed',
    embeddingDimensions: vector.length,
    indexedSources: sourceRows.length,
    citations: functionResponse.citations.length,
  }, null, 2));
}

runLiveChecks().catch((error) => {
  fail(error instanceof Error ? error.message : 'unknown live-check failure');
});

