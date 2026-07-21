import type { AssistantResponse, Locale, ModelAnswer, RetrievedChunk } from './contracts.ts';

export class CitationValidationError extends Error {}

const MAX_CLAIMS = 8;
const MAX_CLAIM_CHARACTERS = 1200;
const MAX_ANSWER_CHARACTERS = 5000;

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
  const chunksBySource = new Map(chunks.map((chunk) => [chunk.sourceId, chunk]));
  const citationOrder: string[] = [];
  for (const claim of modelAnswer.claims) {
    if (typeof claim?.text !== 'string'
      || !claim.text.trim()
      || claim.text.length > MAX_CLAIM_CHARACTERS
      || !Array.isArray(claim.sourceIds)
      || claim.sourceIds.length === 0
      || claim.sourceIds.some((sourceId) => typeof sourceId !== 'string')) {
      throw new CitationValidationError('uncited_claim');
    }
    for (const sourceId of claim.sourceIds) {
      if (!chunksBySource.has(sourceId)) throw new CitationValidationError('unknown_citation');
      if (!citationOrder.includes(sourceId)) citationOrder.push(sourceId);
    }
  }
  const citationNumbers = new Map(citationOrder.map((sourceId, index) => [sourceId, index + 1]));
  const answer = modelAnswer.claims
    .map((claim) => `${claim.text.trim()} ${claim.sourceIds.map((id) => `[${citationNumbers.get(id)}]`).join('')}`)
    .join('\n\n');
  if (answer.length > MAX_ANSWER_CHARACTERS) {
    throw new CitationValidationError('answer_too_long');
  }
  const citations = citationOrder.map((sourceId) => {
    const source = chunksBySource.get(sourceId)!;
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
