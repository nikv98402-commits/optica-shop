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
  VisionTrackerOpened: 'vision_tracker_opened',
  VisionTrackerOnboardingStarted: 'vision_tracker_onboarding_started',
  VisionTrackerOnboardingCompleted: 'vision_tracker_onboarding_completed',
  VisionTrackerFlowRecommended: 'vision_tracker_flow_recommended',
  VisionTrackerSavedLocal: 'vision_tracker_saved_local',
  VisionAccessOpened: 'vision_access_opened',
  VisionAccessWhoSourceClicked: 'vision_access_who_source_clicked',
  VisionAccessPartnerCtaClicked: 'vision_access_partner_cta_clicked',
  VisionAccessTrackerCtaClicked: 'vision_access_tracker_cta_clicked',
  VisionAccessTryOnCtaClicked: 'vision_access_tryon_cta_clicked',
  VisionAccessCounterViewed: 'vision_access_counter_viewed',
  PaymentDoorViewed: 'payment_door_viewed',
  PaymentIntentClicked: 'payment_intent_clicked',
  PaymentDoorDismissed: 'payment_door_dismissed',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type SafeEventParams = Record<string, string | number | boolean | undefined>;

const blockedParamPatterns = [
  /^contact$/i,
  /name/i,
  /phone/i,
  /email/i,
  /password/i,
  /donation/i,
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
