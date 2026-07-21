export type Locale = 'ru' | 'en';
export type Confidence = 'supported' | 'insufficient_sources';
export type Safety = 'informational' | 'urgent';

export interface Preferences {
  experience: 'beginner' | 'familiar';
  interests: Array<'frame_fit' | 'pd_sizing' | 'eye_comfort' | 'visit_preparation'>;
  answerLength: 'short' | 'detailed';
}

export interface AssistantRequest {
  query: string;
  locale: Locale;
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  preferences: Preferences;
}

export interface RetrievedChunk {
  chunkId: string;
  sourceId: string;
  sourceSlug: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt?: string;
  licenseCode: string;
  locale: Locale;
  heading?: string;
  content: string;
  similarity: number;
}

export interface ModelClaim {
  text: string;
  evidence: Array<{
    chunkId: string;
    quote: string;
  }>;
}

export interface ModelAnswer {
  claims: ModelClaim[];
}

export interface AssistantResponse {
  answerId: string;
  answer: string;
  citations: Array<{
    id: string;
    title: string;
    url: string;
    publisher: string;
    license: string;
    publishedAt?: string;
  }>;
  confidence: Confidence;
  safety: Safety;
  relatedPaths: string[];
  externalSources?: Array<{
    id: string;
    title: string;
    url: string;
    publisher: string;
  }>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export interface ChatProvider {
  complete(system: string, user: string): Promise<ModelAnswer>;
}

export interface Retriever {
  retrieve(embedding: number[]): Promise<RetrievedChunk[]>;
}
