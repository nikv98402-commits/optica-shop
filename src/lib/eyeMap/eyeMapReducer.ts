import type {
  EyeMapCaptureSource,
  EyeMapLocalResultV1,
  EyeMapScreenState,
} from '../../types/eyeMapLocal';

export type EyeMapAction =
  | { type: 'OPEN_CAMERA' }
  | {
      type: 'START_ANALYSIS';
      analysisId: string;
      source: EyeMapCaptureSource;
      previewUrl: string;
    }
  | {
      type: 'ANALYSIS_READY';
      analysisId: string;
      result: EyeMapLocalResultV1;
    }
  | {
      type: 'ANALYSIS_BLOCKED';
      analysisId: string;
      reason: Extract<EyeMapScreenState, { status: 'blocked' }>['reason'];
    }
  | { type: 'MARK_SAVED' }
  | { type: 'RESET' };

export const EYE_MAP_INITIAL_STATE: EyeMapScreenState = { status: 'idle' };

export function eyeMapReducer(
  state: EyeMapScreenState,
  action: EyeMapAction,
): EyeMapScreenState {
  switch (action.type) {
    case 'OPEN_CAMERA':
      return { status: 'camera' };
    case 'START_ANALYSIS':
      return {
        status: 'analyzing',
        analysisId: action.analysisId,
        source: action.source,
        previewUrl: action.previewUrl,
      };
    case 'ANALYSIS_READY':
      // A stale MediaPipe completion must never replace a newer photo.
      if (
        state.status !== 'analyzing' ||
        state.analysisId !== action.analysisId
      ) {
        return state;
      }
      return {
        status: 'result',
        result: action.result,
        previewUrl: state.previewUrl,
        saved: false,
      };
    case 'ANALYSIS_BLOCKED':
      if (
        state.status !== 'analyzing' ||
        state.analysisId !== action.analysisId
      ) {
        return state;
      }
      return {
        status: 'blocked',
        reason: action.reason,
        previewUrl: state.previewUrl,
      };
    case 'MARK_SAVED':
      return state.status === 'result' ? { ...state, saved: true } : state;
    case 'RESET':
      return EYE_MAP_INITIAL_STATE;
  }
}
