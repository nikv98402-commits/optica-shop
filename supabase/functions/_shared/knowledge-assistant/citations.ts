import type { AssistantResponse, Locale, ModelAnswer, RetrievedChunk } from './contracts.ts';

export class CitationValidationError extends Error {}

const MAX_CLAIMS = 8;
const MAX_CLAIM_CHARACTERS = 1200;
const MAX_ANSWER_CHARACTERS = 5000;
const MAX_EVIDENCE_PER_CLAIM = 4;
const MIN_QUOTE_CHARACTERS = 8;
const MAX_QUOTE_CHARACTERS = 600;

function normalizeEvidence(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

export function buildSupportedResponse(
  modelAnswer: ModelAnswer,
  chunks: RetrievedChunk[],
  locale: Locale,
): AssistantResponse {
  if (!Array.isArray(modelAnswer.claims)
    || modelAnswer.claims.length === 0
    || modelAnswer.claims.length > MAX_CLAIMS) {
    throw new CitationValidationError('claims_missing');
  }
  const chunksById = new Map(chunks.map((chunk) => [chunk.chunkId, chunk]));
  const sourcesById = new Map(chunks.map((chunk) => [chunk.sourceId, chunk]));
  const citationOrder: string[] = [];
  for (const claim of modelAnswer.claims) {
    if (typeof claim?.text !== 'string'
      || !claim.text.trim()
      || claim.text.length > MAX_CLAIM_CHARACTERS
      || !Array.isArray(claim.evidence)
      || claim.evidence.length === 0
      || claim.evidence.length > MAX_EVIDENCE_PER_CLAIM) {
      throw new CitationValidationError('uncited_claim');
    }
    for (const evidence of claim.evidence) {
      if (!evidence
        || typeof evidence.chunkId !== 'string'
        || typeof evidence.quote !== 'string'
        || evidence.quote.trim().length < MIN_QUOTE_CHARACTERS
        || evidence.quote.length > MAX_QUOTE_CHARACTERS) {
        throw new CitationValidationError('invalid_evidence');
      }
      const chunk = chunksById.get(evidence.chunkId);
      if (!chunk) throw new CitationValidationError('unknown_citation');
      if (!normalizeEvidence(chunk.content).includes(normalizeEvidence(evidence.quote))) {
        throw new CitationValidationError('unsupported_evidence');
      }
      if (!citationOrder.includes(chunk.sourceId)) citationOrder.push(chunk.sourceId);
    }
  }
  const citationNumbers = new Map(citationOrder.map((sourceId, index) => [sourceId, index + 1]));
  const answer = modelAnswer.claims
    .map((claim) => {
      const sourceIds = Array.from(new Set(claim.evidence.map((evidence) => chunksById.get(evidence.chunkId)!.sourceId)));
      return `${claim.text.trim()} ${sourceIds.map((id) => `[${citationNumbers.get(id)}]`).join('')}`;
    })
    .join('\n\n');
  if (answer.length > MAX_ANSWER_CHARACTERS) {
    throw new CitationValidationError('answer_too_long');
  }
  const citations = citationOrder.map((sourceId) => {
    const source = sourcesById.get(sourceId)!;
    return {
      id: source.sourceId,
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      license: source.licenseCode,
      publishedAt: source.publishedAt,
    };
  });
  const relatedPaths = Array.from(new Set(chunks.map((chunk) => {
    try {
      const path = new URL(chunk.url).pathname;
      return path === '/' ? '/vision-care' : path;
    } catch {
      return '/vision-care';
    }
  }))).slice(0, 3);
  return {
    answerId: crypto.randomUUID(),
    answer,
    citations,
    confidence: 'supported',
    safety: 'informational',
    relatedPaths: relatedPaths.length ? relatedPaths : [locale === 'ru' ? '/vision-care' : '/vision-care'],
  };
}

export function abstentionResponse(locale: Locale): AssistantResponse {
  return {
    answerId: crypto.randomUUID(),
    answer: locale === 'ru'
      ? 'В проверенных материалах ViLu пока нет надежного ответа. Посмотрите связанные материалы или уточните вопрос без персональных медицинских данных.'
      : 'The reviewed ViLu materials do not contain a reliable answer yet. See the related material or rephrase without personal medical information.',
    citations: [],
    confidence: 'insufficient_sources',
    safety: 'informational',
    relatedPaths: ['/vision-care'],
  };
}
