import { abstentionResponse, buildSupportedResponse, CitationValidationError } from './citations.ts';
import type { AssistantRequest, ChatProvider, EmbeddingProvider, Retriever } from './contracts.ts';
import { PipelineDeadline } from './deadline.ts';
import { buildCitationCorrectionPrompt, buildGroundedPrompt } from './prompt.ts';
import { isDisallowedQuery, isUrgentQuery, refusalResponse, urgentResponse } from './safety.ts';

const MINIMUM_FOLLOW_UP_BUDGET_MS = 1_000;

export async function answerKnowledgeQuestion(
  request: AssistantRequest,
  dependencies: {
    embeddingProvider: EmbeddingProvider;
    chatProvider: ChatProvider;
    retriever: Retriever;
    deadline?: PipelineDeadline;
  },
) {
  if (isUrgentQuery(request.query)) return urgentResponse(request.locale);
  if (isDisallowedQuery(request.query)) return refusalResponse(request.locale);
  const deadline = dependencies.deadline || new PipelineDeadline(30_000);
  const embedding = await deadline.run(
    'embedding',
    15_000,
    (budget) => dependencies.embeddingProvider.embed(request.query, budget),
  );
  const chunks = await deadline.run(
    'retrieval',
    5_000,
    (budget) => dependencies.retriever.retrieve(embedding, budget),
  );
  if (chunks.length === 0) return abstentionResponse(request.locale);
  const prompt = buildGroundedPrompt(request, chunks);
  let modelAnswer = await deadline.run(
    'chat',
    15_000,
    (budget) => dependencies.chatProvider.complete(prompt.system, prompt.user, budget),
  );
  try {
    return buildSupportedResponse(modelAnswer, chunks, request.locale);
  } catch (error) {
    if (!(error instanceof CitationValidationError)) throw error;
    if (!deadline.hasBudget(MINIMUM_FOLLOW_UP_BUDGET_MS)) {
      deadline.skip('citation_correction');
      return abstentionResponse(request.locale);
    }
    modelAnswer = await deadline.run(
      'citation_correction',
      15_000,
      (budget) => dependencies.chatProvider.complete(
        `${prompt.system}\n${buildCitationCorrectionPrompt(chunks.map((chunk) => chunk.chunkId))}`,
        prompt.user,
        budget,
      ),
    );
    try {
      return buildSupportedResponse(modelAnswer, chunks, request.locale);
    } catch {
      return abstentionResponse(request.locale);
    }
  }
}
