import { describe, expect, it } from 'vitest';
import { isEyeMapFeatureEnabled, isKnowledgeAssistantFeatureEnabled } from '../features';

describe('isEyeMapFeatureEnabled', () => {
  it('is disabled when the environment value is missing', () => {
    expect(isEyeMapFeatureEnabled({})).toBe(false);
  });

  it('is enabled only for the explicit true value', () => {
    expect(isEyeMapFeatureEnabled({ VITE_FEATURE_EYE_MAP: 'true' })).toBe(true);
    expect(isEyeMapFeatureEnabled({ VITE_FEATURE_EYE_MAP: 'TRUE' })).toBe(false);
    expect(isEyeMapFeatureEnabled({ VITE_FEATURE_EYE_MAP: '1' })).toBe(false);
  });
});

describe('isKnowledgeAssistantFeatureEnabled', () => {
  it('is disabled when the environment value is missing', () => {
    expect(isKnowledgeAssistantFeatureEnabled({})).toBe(false);
  });

  it('is enabled only for the explicit true value', () => {
    expect(isKnowledgeAssistantFeatureEnabled({ VITE_FEATURE_KNOWLEDGE_ASSISTANT: 'true' })).toBe(true);
    expect(isKnowledgeAssistantFeatureEnabled({ VITE_FEATURE_KNOWLEDGE_ASSISTANT: 'TRUE' })).toBe(false);
    expect(isKnowledgeAssistantFeatureEnabled({ VITE_FEATURE_KNOWLEDGE_ASSISTANT: '1' })).toBe(false);
  });
});
