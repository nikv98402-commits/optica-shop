export type EyeMapLifecycleStatus =
  | 'disabled'
  | 'precheck'
  | 'blocked'
  | 'consent_required'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'partial'
  | 'failed'
  | 'timed_out'
  | 'fallback';

export type EyeMapBlockReason =
  | 'no_face'
  | 'multiple_faces'
  | 'unsupported_photo'
  | 'low_quality'
  | 'engine_unavailable';

export type EyeMapInferenceFailureCode =
  | 'missing_required_structure'
  | 'mask_sanity_failed'
  | 'unsupported_image'
  | 'model_unavailable'
  | 'schema_incompatible'
  | 'consent_revoked';

export interface EyeMapPrecheck {
  status: 'disabled' | 'eligible' | 'blocked';
  reason?: EyeMapBlockReason;
  confidence: number;
  canUseExistingTryOn: true;
  checks: string[];
  limitations: string[];
}

export interface EyeMapInferenceError {
  code: EyeMapInferenceFailureCode;
  recoverable: boolean;
  userMessageKey: string;
  correlationId: string;
}

export interface EyeMapResult {
  sessionId: string;
  status: 'succeeded' | 'partial' | 'failed';
  quality: 'good' | 'borderline' | 'unavailable';
  overlayUrl?: string;
  normalizedFeatures?: Record<string, number>;
  limitations: string[];
  modelVersion: string;
  artifactChecksum: string;
  schemaVersion: 1;
}
