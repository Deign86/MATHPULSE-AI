/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_QUIZ?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_LESSON?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS?: string;
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
