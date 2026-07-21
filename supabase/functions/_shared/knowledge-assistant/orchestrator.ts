import { abstentionResponse, buildSupportedResponse, CitationValidationError } from './citations.ts';
import type { AssistantRequest, ChatProvider, EmbeddingProvider, Retriever } from './contracts.ts';
import { buildCitationCorrectionPrompt, buildGroundedPrompt } from './prompt.ts';
import { isDisallowedQuery, isUrgentQuery, refusalResponse, urgentResponse } from './safety.ts';

export async function answerKnowledgeQuestion(
  request: AssistantRequest,
  dependencies: { embeddingProvider: EmbeddingProvider; chatProvider: ChatProvider; retriever: Retriever },
) {
  if (isUrgentQuery(request.query)) return urgentResponse(request.locale);
  if (isDisallowedQuery(request.query)) return refusalResponse(request.locale);
  const embedding = await dependencies.embeddingProvider.embed(request.query);
  const chunks = await dependencies.retriever.retrieve(embedding);
  if (chunks.length === 0) return abstentionResponse(request.locale);
  const prompt = buildGroundedPrompt(request, chunks);
  let modelAnswer = await dependencies.chatProvider.complete(prompt.system, prompt.user);
  try {
    return buildSupportedResponse(modelAnswer, chunks, request.locale);
  } catch (error) {
    if (!(error instanceof CitationValidationError)) throw error;
    modelAnswer = await dependencies.chatProvider.complete(
      `${prompt.system}\n${buildCitationCorrectionPrompt(chunks.map((chunk) => chunk.sourceId))}`,
      prompt.user,
    );
    try {
      return buildSupportedResponse(modelAnswer, chunks, request.locale);
    } catch {
      return abstentionResponse(request.locale);
    }
  }
}
