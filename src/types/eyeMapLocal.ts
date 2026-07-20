export type EyeMapCaptureSource = 'camera' | 'upload';
export type EyeMapCaptureQuality = 'good' | 'acceptable' | 'retake';
export type EyeMapAlignmentQuality = 'aligned' | 'adjust';
export type EyeMapChangeBand = 'minimal' | 'moderate' | 'not_comparable';

export interface EyeMapTechnicalVectorV1 {
  confidence: number;
  eyeDistanceRatio: number;
  eyeLineTiltDeg: number;
  bridgeOffsetPct: number;
}

export interface EyeMapLocalMetricsV1 {
  captureQuality: EyeMapCaptureQuality;
  alignmentQuality: EyeMapAlignmentQuality;
  leftEyeVisible: boolean;
  rightEyeVisible: boolean;
  repeatabilityScore?: number;
  changeFromBaseline?: EyeMapChangeBand;
}

export interface EyeMapLocalResultV1 {
  id: string;
  capturedAt: string;
  engineVersion: string;
  modelVersion: string;
  adapterVersion: string;
  compatibilityGroup: string;
  source: EyeMapCaptureSource;
  qualityStatus: EyeMapCaptureQuality;
  metrics: EyeMapLocalMetricsV1;
  technicalVector: EyeMapTechnicalVectorV1;
  limitations: string[];
}

export interface EyeMapLocalStoreV1 {
  schemaVersion: 1;
  baselineId?: string;
  results: EyeMapLocalResultV1[];
}

export type EyeMapScreenState =
  | { status: 'idle' }
  | { status: 'camera' }
  | {
      status: 'analyzing';
      analysisId: string;
      source: EyeMapCaptureSource;
      previewUrl: string;
    }
  | {
      status: 'blocked';
      reason:
        | 'no_face'
        | 'multiple_faces'
        | 'pose'
        | 'distance'
        | 'engine_unavailable'
        | 'unsupported_file';
      previewUrl?: string;
    }
  | {
      status: 'result';
      result: EyeMapLocalResultV1;
      previewUrl: string;
      saved: boolean;
    }
  | { status: 'error'; messageKey: 'engine' | 'storage' };
