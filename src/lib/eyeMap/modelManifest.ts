export interface EyeMapModelManifest {
  engineVersion: string;
  modelVersion: string;
  artifactUrl: string;
  artifactSha256: string;
  compatibilityGroup: string;
}

export const EYE_MAP_MODEL_MANIFEST: EyeMapModelManifest = Object.freeze({
  engineVersion: '@mediapipe/tasks-vision@0.10.35',
  modelVersion: 'face_landmarker.float16.1',
  artifactUrl:
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  artifactSha256:
    '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff',
  compatibilityGroup: 'vilu-face-landmarker-v1',
});

export const EYE_MAP_ADAPTER_VERSION = 'eye-map-local-adapter@1';
