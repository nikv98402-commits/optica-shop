import { reachGoal } from './metrika';

export const AnalyticsEvent = {
  TryOnOpened: 'tryon_opened',
  PhotoUploaded: 'photo_uploaded',
  FaceLandmarkerAnalyzed: 'face_landmarker_analyzed',
  FitScoreViewed: 'fit_score_viewed',
  FrameSaved: 'frame_saved',
  NearbyOpticsOpened: 'nearby_optics_opened',
  RouteClicked: 'route_clicked',
  CallClicked: 'call_clicked',
  WhatsappClicked: 'whatsapp_clicked',
  TelegramClicked: 'telegram_clicked',
  SelectionCopied: 'selection_copied',
  VisitLeadOpened: 'visit_lead_opened',
  VisitLeadSubmitted: 'visit_lead_submitted',
  ConsentChecked: 'consent_checked',
  DashboardOpened: 'dashboard_opened',
  ProfileSavedLocal: 'profile_saved_local',
  RecipeCompleted: 'recipe_completed',
  TryOnOpenedFromDashboard: 'tryon_opened_from_dashboard',
  KnowledgePageView: 'knowledge_page_view',
  VisionCarePageOpened: 'vision_care_page_opened',
  VisionCareTryOnClicked: 'vision_care_cta_tryon_clicked',
  VisionCareFaceFitClicked: 'vision_care_cta_face_fit_clicked',
  VisionCareWhoSourceClicked: 'vision_care_who_source_clicked',
  VisitReadinessSectionViewed: 'visit_readiness_section_viewed',
  EyeCheckOpened: 'eye_check_opened',
  EyeCheckFlowSelected: 'eye_check_flow_selected',
  EyeCheckCompleted: 'eye_check_completed',
  EyeCheckResultViewed: 'eye_check_result_viewed',
  EyeCheckSavedLocal: 'eye_check_saved_local',
  EyeCheckCtaTryOn: 'eye_check_cta_tryon',
  EyeCheckCtaNearbyOptics: 'eye_check_cta_nearby_optics',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type SafeEventParams = Record<string, string | number | boolean | undefined>;

const blockedParamPatterns = [
  /^contact$/i,
  /name/i,
  /phone/i,
  /email/i,
  /password/i,
  /sph/i,
  /cyl/i,
  /axis/i,
  /complaint/i,
  /recipe/i,
  /prescription/i,
  /photo/i,
  /answer/i,
  /symptom/i,
  /child/i,
  /age/i,
  /birth/i,
  /diagnos/i,
  /medical/i,
  /health/i,
];

function withoutSensitiveParams(params: SafeEventParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([key]) => !blockedParamPatterns.some((pattern) => pattern.test(key))),
  ) as SafeEventParams;
}

export function trackEvent(eventName: AnalyticsEventName, params?: SafeEventParams) {
  reachGoal(eventName, withoutSensitiveParams(params));
}
