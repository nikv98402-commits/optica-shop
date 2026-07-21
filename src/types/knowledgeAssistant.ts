export type AssistantLocale = 'ru' | 'en';
export type AssistantExperience = 'beginner' | 'familiar';
export type AssistantInterest = 'frame_fit' | 'pd_sizing' | 'eye_comfort' | 'visit_preparation';
export type AssistantAnswerLength = 'short' | 'detailed';

export interface AssistantPreferences {
  experience: AssistantExperience;
  interests: AssistantInterest[];
  answerLength: AssistantAnswerLength;
}

export interface AssistantRecentTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequest {
  query: string;
  locale: AssistantLocale;
  recentTurns: AssistantRecentTurn[];
  preferences: AssistantPreferences;
}

export interface AssistantCitation {
  id: string;
  title: string;
  url: string;
  publisher: string;
  license: string;
  publishedAt?: string;
}

export interface AssistantResponse {
  answerId: string;
  answer: string;
  citations: AssistantCitation[];
  confidence: 'supported' | 'insufficient_sources';
  safety: 'informational' | 'urgent';
  relatedPaths: string[];
  externalSources?: Array<{
    id: string;
    title: string;
    url: string;
    publisher: string;
  }>;
}

export interface AssistantStoredTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  response?: AssistantResponse;
}
