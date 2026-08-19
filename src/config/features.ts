export interface PublicFeatureEnvironment {
  VITE_FEATURE_EYE_MAP?: string;
  VITE_FEATURE_KNOWLEDGE_ASSISTANT?: string;
  VITE_FEATURE_VILU_FOUNDATION?: string;
  VITE_FEATURE_VILU_AUTH_V2?: string;
  VITE_FEATURE_VILU_EMPLOYEE_FLOW_V2?: string;
  VITE_FEATURE_VILU_PROVIDER_QUEUE_V2?: string;
  VITE_FEATURE_VILU_PASSPORT_PROFILE_V2?: string;
  VITE_FEATURE_VILU_EMPLOYER_OUTCOMES_V2?: string;
}

export const organizationFeatureKeys = [
  'vilu_auth_v2',
  'vilu_employee_flow_v2',
  'vilu_provider_queue_v2',
  'vilu_passport_profile_v2',
  'vilu_employer_outcomes_v2',
] as const;
export type OrganizationFeatureKey = (typeof organizationFeatureKeys)[number];

const featureEnvironmentKeys: Record<OrganizationFeatureKey, keyof PublicFeatureEnvironment> = {
  vilu_auth_v2: 'VITE_FEATURE_VILU_AUTH_V2',
  vilu_employee_flow_v2: 'VITE_FEATURE_VILU_EMPLOYEE_FLOW_V2',
  vilu_provider_queue_v2: 'VITE_FEATURE_VILU_PROVIDER_QUEUE_V2',
  vilu_passport_profile_v2: 'VITE_FEATURE_VILU_PASSPORT_PROFILE_V2',
  vilu_employer_outcomes_v2: 'VITE_FEATURE_VILU_EMPLOYER_OUTCOMES_V2',
};

export function isOrganizationFeatureGloballyEnabled(key: OrganizationFeatureKey, environment: PublicFeatureEnvironment = import.meta.env) {
  return environment[featureEnvironmentKeys[key]] === 'true';
}

export function isViluFoundationFeatureEnabled(
  environment: PublicFeatureEnvironment = import.meta.env,
) {
  return environment.VITE_FEATURE_VILU_FOUNDATION === 'true';
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
  viluFoundation: isViluFoundationFeatureEnabled(),
  organization: Object.fromEntries(
    organizationFeatureKeys.map((key) => [key, isOrganizationFeatureGloballyEnabled(key)]),
  ) as Record<OrganizationFeatureKey, boolean>,
} as const;
