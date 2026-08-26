/// <reference types="vite/client" />

declare module 'virtual:vilu-route-styles.css';

interface ImportMetaEnv {
  readonly VITE_FEATURE_EYE_MAP?: string;
  readonly VITE_FEATURE_KNOWLEDGE_ASSISTANT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
