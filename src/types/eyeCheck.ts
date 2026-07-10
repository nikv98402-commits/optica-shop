export type EyeCheckFlowId =
  | 'adult-comfort'
  | 'child-risk'
  | 'one-eye-comparison'
  | 'amsler-grid';

export type EyeCheckRiskLevel =
  | 'info'
  | 'check-soon'
  | 'do-not-delay'
  | 'urgent';

export type VisionTrackerProfileType = 'self' | 'child' | 'family' | 'explore';
export type VisionTrackerReason =
  | 'screen-fatigue'
  | 'time-to-check'
  | 'child-concern'
  | 'one-eye-worse'
  | 'choose-glasses';
export type VisionTrackerLastExam =
  | 'less-six-months'
  | 'six-twelve-months'
  | 'more-one-year'
  | 'more-two-years'
  | 'unknown'
  | 'never';

export interface VisionTrackerOnboardingAnswers {
  profileType?: VisionTrackerProfileType;
  reason?: VisionTrackerReason;
  lastExam?: VisionTrackerLastExam;
}

export interface VisionTrackerOnboardingOption {
  value: VisionTrackerProfileType | VisionTrackerReason | VisionTrackerLastExam;
  label: {
    ru: string;
    en: string;
  };
}

export interface VisionTrackerOnboardingStep {
  id: keyof VisionTrackerOnboardingAnswers;
  title: {
    ru: string;
    en: string;
  };
  subtitle: {
    ru: string;
    en: string;
  };
  options: VisionTrackerOnboardingOption[];
}

export interface EyeCheckQuestion {
  id: string;
  text: string;
  helpText?: string;
  type: 'single' | 'boolean' | 'scale';
  options?: Array<{
    value: string;
    label: string;
    score: number;
    redFlag?: boolean;
  }>;
}

export interface EyeCheckFlow {
  id: EyeCheckFlowId;
  title: string;
  subtitle: string;
  audience: 'adult' | 'child' | 'all';
  estimatedMinutes: number;
  questions: EyeCheckQuestion[];
  disclaimer: string;
}

export interface EyeCheckAnswer {
  questionId: string;
  value: string;
  score: number;
  redFlag?: boolean;
}

export interface EyeCheckResult {
  flowId: EyeCheckFlowId;
  totalScore: number;
  attentionIndex: number;
  riskLevel: EyeCheckRiskLevel;
  title: string;
  summary: string;
  reasons: string[];
  recommendedActions: string[];
  ctaPrimary: 'tryon' | 'nearby-optics' | 'none';
}

export interface StoredEyeCheckResult {
  flowId: EyeCheckFlowId;
  riskLevel: EyeCheckRiskLevel;
  createdAt: string;
  totalScore: number;
  recommendedActions: string[];
}
