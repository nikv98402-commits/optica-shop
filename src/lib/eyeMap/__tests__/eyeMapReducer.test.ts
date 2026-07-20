import { describe, expect, it } from 'vitest';
import { EYE_MAP_INITIAL_STATE, eyeMapReducer } from '../eyeMapReducer';
import { localResult } from './fixtures';

describe('eyeMapReducer', () => {
  it('accepts only the completion for the active analysis', () => {
    const analyzing = eyeMapReducer(EYE_MAP_INITIAL_STATE, {
      type: 'START_ANALYSIS',
      analysisId: 'new',
      source: 'upload',
      previewUrl: 'blob:new',
    });

    expect(
      eyeMapReducer(analyzing, {
        type: 'ANALYSIS_READY',
        analysisId: 'old',
        result: localResult(),
      }),
    ).toEqual(analyzing);

    expect(
      eyeMapReducer(analyzing, {
        type: 'ANALYSIS_READY',
        analysisId: 'new',
        result: localResult(),
      }),
    ).toMatchObject({ status: 'result', previewUrl: 'blob:new' });
  });

  it('moves a matching blocked analysis into a recoverable state', () => {
    const analyzing = eyeMapReducer(EYE_MAP_INITIAL_STATE, {
      type: 'START_ANALYSIS',
      analysisId: 'active',
      source: 'camera',
      previewUrl: '',
    });

    expect(
      eyeMapReducer(analyzing, {
        type: 'ANALYSIS_BLOCKED',
        analysisId: 'active',
        reason: 'unsupported_file',
      }),
    ).toEqual({
      status: 'blocked',
      reason: 'unsupported_file',
      previewUrl: '',
    });
  });
});
