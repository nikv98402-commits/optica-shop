export interface PublicFeatureEnvironment {
  VITE_FEATURE_EYE_MAP?: string;
  VITE_FEATURE_KNOWLEDGE_ASSISTANT?: string;
}

export function isEyeMapFeatureEnabled(
  environment: PublicFeatureEnvironment = import.meta.env,
) {
  return environment.VITE_FEATURE_EYE_MAP === 'true';
}

export function isKnowledgeAssistantFeatureEnabled(
  environment: PublicFeatureEnvironment = import.meta.env,
) {
  return environment.VITE_FEATURE_KNOWLEDGE_ASSISTANT === 'true';
}

export const publicFeatures = {
  eyeMap: isEyeMapFeatureEnabled(),
  knowledgeAssistant: isKnowledgeAssistantFeatureEnabled(),
} as const;
