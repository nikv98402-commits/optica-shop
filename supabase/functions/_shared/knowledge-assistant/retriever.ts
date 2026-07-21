import type { RetrievedChunk, Retriever } from './contracts.ts';

interface SupabaseRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{
    data: Array<Record<string, unknown>> | null;
    error: { message?: string } | null;
  }>;
}

export class RetrievalError extends Error {}

export class SupabaseKnowledgeRetriever implements Retriever {
  constructor(
    private readonly client: SupabaseRpcClient,
    private readonly matchCount = 8,
    private readonly similarityThreshold = 0.58,
  ) {}

  async retrieve(embedding: number[]): Promise<RetrievedChunk[]> {
    const { data, error } = await this.client.rpc('match_knowledge_chunks', {
      query_embedding: embedding,
      match_count: this.matchCount,
      similarity_threshold: this.similarityThreshold,
    });
    if (error) throw new RetrievalError(error.message || 'retrieval_failed');
    return (data || []).map((row) => ({
      chunkId: String(row.chunk_id),
      sourceId: String(row.source_id),
      sourceSlug: String(row.source_slug),
      title: String(row.title),
      url: String(row.url),
      publisher: String(row.publisher),
      publishedAt: row.published_at ? String(row.published_at) : undefined,
      licenseCode: String(row.license_code),
      locale: row.locale === 'en' ? 'en' : 'ru',
      heading: row.heading ? String(row.heading) : undefined,
      content: String(row.content),
      similarity: Number(row.similarity),
    }));
  }
}
