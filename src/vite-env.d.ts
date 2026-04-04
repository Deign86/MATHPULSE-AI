/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_ENABLE_STAGING_MODEL_TEST?: string;
  readonly VITE_HF_BASE_URL?: string;
  readonly VITE_HF_BASE_MODEL?: string;
  readonly VITE_HF_API_KEY?: string;
  readonly VITE_VLLM_BASE_URL?: string;
  readonly VITE_VLLM_MODEL?: string;
  readonly VITE_VLLM_API_KEY?: string;
  readonly VITE_VLLM_BASE_URL_BASELINE?: string;
  readonly VITE_VLLM_BASE_URL_CANDIDATE?: string;
  readonly VITE_STAGING_QUICKCHECK_MAX_LATENCY_MS?: string;
  readonly VITE_ENABLE_ASYNC_GENERATION?: string;
  readonly VITE_IAR_WORKFLOW_MODE?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_QUIZ?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_LESSON?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}
