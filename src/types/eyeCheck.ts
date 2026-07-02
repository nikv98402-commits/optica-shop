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
