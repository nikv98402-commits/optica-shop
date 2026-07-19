import { describe, expect, it } from 'vitest';
import { isEyeMapFeatureEnabled } from '../features';

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
