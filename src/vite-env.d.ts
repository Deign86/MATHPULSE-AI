/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Backend API base. Leave unset to use the same-origin `/api` path
   * (recommended for Firebase Hosting + backend proxy). For a remote backend,
   * set the origin, e.g. `https://api.example.com`.
   */
  readonly VITE_API_URL?: string;
  /** Optional cache-busting identifier surfaced to the service worker. */
  readonly VITE_APP_VERSION?: string;
  /** Register the PWA service worker in dev builds (default: false). */
  readonly VITE_ENABLE_SW_IN_DEV?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_QUIZ?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_LESSON?: string;
  readonly VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS?: string;
  readonly VITE_ENABLE_ASYNC_GENERATION?: string;
  readonly VITE_CHAT_STREAM_IDLE_TIMEOUT_MS?: string;
  readonly VITE_CHAT_STREAM_TOTAL_TIMEOUT_MS?: string;
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
