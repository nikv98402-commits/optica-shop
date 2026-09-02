export type ScreeningOutcome = 'routine' | 'review_recommended' | 'urgent';

export interface Screening {
  id: string;
  organization_id: string;
  owner_user_id: string;
  status: 'in_progress' | 'completed';
  version: number;
  protocol_version: string;
  scoring_version: string;
  started_at: string;
  completed_at: string | null;
}

export interface ScreeningResult {
  screening_id: string;
  outcome: ScreeningOutcome;
  total_score: number;
  review_within_days: 0 | 30 | 365;
  protocol_version: string;
  scoring_version: string;
  created_at: string;
}

export interface Referral {
  id: string;
  care_pathway_id: string;
  status: 'created' | 'assigned' | 'booked' | 'urgent' | 'completed';
  version: number;
  provider_organization_id: string | null;
  provider_status: 'unassigned' | 'queued' | 'appointment_booked' | 'urgent_escalated' | 'examination_completed' | 'outcome_confirmed';
  appointment_at: string | null;
  priority: ScreeningOutcome;
  respond_by: string;
  created_at: string;
}

export interface ReferralProviderOption { id: string; name: string }

export interface ScreeningAnswer {
  questionId: 'comfort' | 'distance' | 'one-eye' | 'distortion';
  score: 0 | 1 | 2 | 3;
  urgent?: boolean;
}

export interface ScreeningProgress {
  screening_id: string;
  current_step: number;
  answers: ScreeningAnswer[];
  updated_at: string;
}
