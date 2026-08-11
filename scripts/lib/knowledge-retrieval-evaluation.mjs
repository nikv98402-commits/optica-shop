import { readFile } from 'node:fs/promises';

export const APPROVED_MANIFEST_SHA256 = '8cdee30ea536d4f53524fcd5b50893191ee8763423fc27cc8d7449d17d49fd9f';
export const EMBEDDING_MODEL = '@cf/qwen/qwen3-embedding-0.6b';
export const EMBEDDING_DIMENSIONS = 1024;
export const TOP_K = 8;
export const MIN_RECALL_AT_8 = 0.85;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

export async function loadGoldenSet(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  return validateGoldenSet(parsed);
}

export function validateGoldenSet(goldenSet) {
  if (goldenSet?.version !== 1) throw new Error('golden set version must be 1');
  const release = goldenSet.release || {};
  if (release.manifestSha256 !== APPROVED_MANIFEST_SHA256 || !SHA256_PATTERN.test(release.manifestSha256)) {
    throw new Error('golden set must target the approved manifest');
  }
  if (release.embeddingModel !== EMBEDDING_MODEL || release.embeddingDimensions !== EMBEDDING_DIMENSIONS) {
    throw new Error('golden set embedding contract mismatch');
  }
  if (release.topK !== TOP_K || release.minimumRecallAt8 !== MIN_RECALL_AT_8) {
    throw new Error('golden set release thresholds mismatch');
  }
  const families = Array.isArray(goldenSet.families) ? goldenSet.families : [];
  const expandedFamilies = families.flatMap((family) => (
    Array.isArray(family.questions) ? family.questions.map((question, index) => ({
      id: `${family.id}-${String(index + 1).padStart(2, '0')}`,
      question,
      locale: family.locale,
      safetyClass: family.safetyClass,
      abstentionAllowed: family.abstentionAllowed,
      expectedSourceIds: family.expectedSourceIds,
    })) : []
  ));
  const cases = Array.isArray(goldenSet.cases) ? goldenSet.cases : expandedFamilies;
  if (cases.length < 100) throw new Error('golden set must contain at least 100 cases');
  const ids = new Set();
  let ru = 0;
  let en = 0;
  let unanswerable = 0;
  for (const entry of cases) {
    const id = requireString(entry.id, 'case id');
    if (ids.has(id)) throw new Error(`duplicate golden case: ${id}`);
    ids.add(id);
    requireString(entry.question, `question for ${id}`);
    if (!['ru', 'en'].includes(entry.locale)) throw new Error(`invalid locale for ${id}`);
    if (entry.locale === 'ru') ru += 1;
    if (entry.locale === 'en') en += 1;
    if (!['informational', 'unanswerable'].includes(entry.safetyClass)) {
      throw new Error(`invalid safety class for ${id}`);
    }
    const expected = Array.isArray(entry.expectedSourceIds) ? entry.expectedSourceIds : [];
    if (entry.safetyClass === 'unanswerable') {
      unanswerable += 1;
      if (!entry.abstentionAllowed || expected.length) throw new Error(`unanswerable case ${id} must abstain`);
    } else if (!expected.length || expected.some((sourceId) => !/^[a-f0-9-]{36}$/.test(sourceId))) {
      throw new Error(`answerable case ${id} must declare expected source ids`);
    }
  }
  if (ru < 40 || en < 40 || unanswerable < 10) {
    throw new Error('golden set must cover RU, EN, and at least ten unanswerable cases');
  }
  return { ...goldenSet, cases };
}

export function validateExactEvidence(modelAnswer, chunks) {
  const byId = new Map(chunks.map((chunk) => [chunk.chunkId, chunk]));
  if (!Array.isArray(modelAnswer?.claims) || modelAnswer.claims.length === 0) return false;
  return modelAnswer.claims.every((claim) => Array.isArray(claim.evidence)
    && claim.evidence.length > 0
    && claim.evidence.every((evidence) => {
      const chunk = byId.get(evidence?.chunkId);
      if (!chunk || typeof evidence?.quote !== 'string' || evidence.quote.trim().length < 8) return false;
      const normalize = (value) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
      return normalize(chunk.content).includes(normalize(evidence.quote));
    }));
}

export function createFixtureRunner(goldenSet) {
  return async (entry) => {
    if (entry.safetyClass === 'unanswerable') {
      return { chunks: [], response: { confidence: 'insufficient_sources', claims: [] } };
    }
    const sourceId = entry.expectedSourceIds[0];
    const content = `Reviewed evidence for ${entry.id} confirms an informational answer.`;
    const chunk = {
      chunkId: `chunk-${entry.id}`,
      sourceId,
      content,
      manifestSha256: goldenSet.release.manifestSha256,
      publicationStatus: 'active',
    };
    return {
      chunks: [chunk],
      response: {
        confidence: 'supported',
        claims: [{ text: 'Informational answer.', evidence: [{ chunkId: chunk.chunkId, quote: content }] }],
      },
    };
  };
}

export function createLiveCaseRunner({ embed, rpc, goldenSet, similarityThreshold = 0.58 }) {
  if (typeof embed !== 'function') throw new TypeError('embed must be a function');
  if (typeof rpc !== 'function') throw new TypeError('rpc must be a function');
  validateGoldenSet(goldenSet);
  return async (entry) => {
    const [embedding] = await embed([entry.question]);
    const rows = await rpc('evaluate_knowledge_retrieval', {
      query_embedding: embedding,
      required_manifest_sha256: goldenSet.release.manifestSha256,
      match_count: goldenSet.release.topK,
      similarity_threshold: similarityThreshold,
    });
    const chunks = (Array.isArray(rows) ? rows : []).map((row) => ({
      chunkId: row.chunk_id,
      sourceId: row.source_id,
      content: row.content,
      manifestSha256: row.manifest_sha256,
      publicationStatus: row.publication_status,
    }));
    if (!chunks.length) {
      return { chunks, response: { confidence: 'insufficient_sources', claims: [] } };
    }
    const first = chunks[0];
    const quote = first.content.replace(/\s+/g, ' ').trim().slice(0, 180);
    return {
      chunks,
      response: {
        confidence: 'supported',
        claims: [{ text: 'Retrieved reviewed evidence.', evidence: [{ chunkId: first.chunkId, quote }] }],
      },
    };
  };
}

export async function evaluateGoldenSet(goldenSetInput, runCase) {
  const goldenSet = validateGoldenSet(goldenSetInput);
  const failures = [];
  let answerable = 0;
  let retrieved = 0;
  let recallHits = 0;
  let provenanceChunks = 0;
  let validProvenanceChunks = 0;
  let citationCases = 0;
  let citationPasses = 0;
  let unanswerable = 0;
  let abstentions = 0;

  for (const entry of goldenSet.cases) {
    const result = await runCase(entry);
    const chunks = Array.isArray(result?.chunks) ? result.chunks.slice(0, TOP_K) : [];
    provenanceChunks += chunks.length;
    validProvenanceChunks += chunks.filter((chunk) => (
      chunk.manifestSha256 === goldenSet.release.manifestSha256
      && chunk.publicationStatus === 'active'
    )).length;
    if (entry.safetyClass === 'unanswerable') {
      unanswerable += 1;
      if (result?.response?.confidence === 'insufficient_sources') abstentions += 1;
      else failures.push({ id: entry.id, gate: 'abstention' });
      continue;
    }
    answerable += 1;
    if (chunks.length) retrieved += 1;
    const hit = chunks.some((chunk) => entry.expectedSourceIds.includes(chunk.sourceId));
    if (hit) recallHits += 1;
    else failures.push({ id: entry.id, gate: 'recall_at_8' });
    citationCases += 1;
    if (validateExactEvidence(result?.response, chunks)) citationPasses += 1;
    else failures.push({ id: entry.id, gate: 'exact_quote' });
  }

  const metrics = {
    caseCount: goldenSet.cases.length,
    answerableCount: answerable,
    retrievedCount: retrieved,
    recallAt8: answerable ? recallHits / answerable : 0,
    approvedActiveChunkRate: provenanceChunks ? validProvenanceChunks / provenanceChunks : 1,
    exactQuoteRate: citationCases ? citationPasses / citationCases : 0,
    unanswerableCount: unanswerable,
    abstentionRate: unanswerable ? abstentions / unanswerable : 0,
  };
  const gates = {
    recallAt8: metrics.recallAt8 >= goldenSet.release.minimumRecallAt8,
    approvedActiveOnly: metrics.approvedActiveChunkRate === 1,
    exactQuotes: metrics.exactQuoteRate === 1,
    unanswerableAbstention: metrics.abstentionRate === 1,
  };
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    release: goldenSet.release,
    metrics,
    gates,
    passed: Object.values(gates).every(Boolean),
    failures,
  };
}
