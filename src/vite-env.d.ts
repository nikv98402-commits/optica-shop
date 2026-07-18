/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_EYE_MAP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
