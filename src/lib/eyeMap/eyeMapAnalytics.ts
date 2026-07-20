import { AnalyticsEvent, trackEvent } from '../analyticsEvents';

type Common = {
  language: 'ru' | 'en';
  deviceClass: 'mobile' | 'tablet' | 'desktop';
};

export type EyeMapAnalyticsPayloads = {
  eye_map_opened: Common & { entryPoint: 'direct' | 'navigation' };
  eye_map_camera_started: Common;
  eye_map_photo_selected: Common & { source: 'camera' | 'upload' };
  eye_map_analysis_completed: Common & { status: 'good' | 'retake' };
  eye_map_analysis_blocked: Common & {
    reason:
      | 'no_face'
      | 'multiple_faces'
      | 'pose'
      | 'distance'
      | 'engine_unavailable'
      | 'unsupported_file';
  };
  eye_map_baseline_saved: Common & {
    historyCountBucket: '1' | '2-5' | '6-12';
  };
  eye_map_history_opened: Common & {
    historyState: 'empty' | 'available';
  };
  eye_map_demo_benchmark_viewed: Common;
  eye_map_history_cleared: Common;
};

const eventMap = {
  eye_map_opened: AnalyticsEvent.EyeMapOpened,
  eye_map_camera_started: AnalyticsEvent.EyeMapCameraStarted,
  eye_map_photo_selected: AnalyticsEvent.EyeMapPhotoSelected,
  eye_map_analysis_completed: AnalyticsEvent.EyeMapAnalysisCompleted,
  eye_map_analysis_blocked: AnalyticsEvent.EyeMapAnalysisBlocked,
  eye_map_baseline_saved: AnalyticsEvent.EyeMapBaselineSaved,
  eye_map_history_opened: AnalyticsEvent.EyeMapHistoryOpened,
  eye_map_demo_benchmark_viewed: AnalyticsEvent.EyeMapDemoBenchmarkViewed,
  eye_map_history_cleared: AnalyticsEvent.EyeMapHistoryCleared,
} as const;

const allowedKeys = new Set([
  'language',
  'deviceClass',
  'entryPoint',
  'source',
  'status',
  'reason',
  'historyCountBucket',
  'historyState',
]);

export function getEyeMapAnalyticsCommon(
  language: 'ru' | 'en',
): Common {
  const width = window.innerWidth;
  return {
    language,
    deviceClass: width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
  };
}

export function trackEyeMapEvent<K extends keyof EyeMapAnalyticsPayloads>(
  event: K,
  payload: EyeMapAnalyticsPayloads[K],
) {
  const sanitized = Object.fromEntries(
    Object.entries(payload).filter(([key]) => allowedKeys.has(key)),
  );
  trackEvent(eventMap[event], sanitized);
}
