import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from '../../analyticsEvents';
import { trackEyeMapEvent } from '../eyeMapAnalytics';

vi.mock('../../analyticsEvents', () => ({
  AnalyticsEvent: {
    EyeMapOpened: 'eye_map_opened',
    EyeMapCameraStarted: 'eye_map_camera_started',
    EyeMapPhotoSelected: 'eye_map_photo_selected',
    EyeMapAnalysisCompleted: 'eye_map_analysis_completed',
    EyeMapAnalysisBlocked: 'eye_map_analysis_blocked',
    EyeMapBaselineSaved: 'eye_map_baseline_saved',
    EyeMapHistoryOpened: 'eye_map_history_opened',
    EyeMapDemoBenchmarkViewed: 'eye_map_demo_benchmark_viewed',
    EyeMapHistoryCleared: 'eye_map_history_cleared',
  },
  trackEvent: vi.fn(),
}));

describe('trackEyeMapEvent', () => {
  beforeEach(() => vi.mocked(trackEvent).mockClear());

  it('drops unexpected runtime keys before analytics', () => {
    trackEyeMapEvent(
      'eye_map_photo_selected',
      {
        language: 'ru',
        deviceClass: 'desktop',
        source: 'upload',
        photo: 'data:image/jpeg;base64,secret',
        age: 42,
      } as never,
    );

    expect(trackEvent).toHaveBeenCalledWith('eye_map_photo_selected', {
      language: 'ru',
      deviceClass: 'desktop',
      source: 'upload',
    });
  });
});
