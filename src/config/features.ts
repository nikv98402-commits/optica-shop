export interface PublicFeatureEnvironment {
  VITE_FEATURE_EYE_MAP?: string;
}

export function isEyeMapFeatureEnabled(
  environment: PublicFeatureEnvironment = import.meta.env,
) {
  return environment.VITE_FEATURE_EYE_MAP === 'true';
}

export const publicFeatures = {
  eyeMap: isEyeMapFeatureEnabled(),
} as const;
