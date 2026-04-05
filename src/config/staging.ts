const parseEnvBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value == null || value.trim() === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const parseEnvNumber = (value: string | undefined, defaultValue: number): number => {
  if (value == null || value.trim() === '') return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const QWEN_DEFAULT_TEMPERATURE = 0.2;
const QWEN_DEFAULT_MAX_TOKENS = 256;
const QWEN_DEFAULT_TOP_P = 0.8;

const normalizeBaseUrl = (value: string | undefined): string => {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
};

export const STAGING_MODEL_TEST_ROUTE = '/staging/model-test';
export const STAGING_LOCKED_HF_BASE_URL = 'https://router.huggingface.co/v1';
export const STAGING_LOCKED_HF_BASE_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
export const STAGING_HF_API_KEY = (import.meta.env.VITE_HF_API_KEY || '').trim();
export const STAGING_REQUEST_TIMEOUT_MIN_MS = 15000;
export const STAGING_REQUEST_TIMEOUT_DEFAULT_MS = 300000;
export const STAGING_REQUEST_TIMEOUT_MAX_MS = 600000;

export const stagingConfig = {
  appEnv: (import.meta.env.VITE_APP_ENV || '').trim().toLowerCase(),
  enableModelTest: parseEnvBoolean(import.meta.env.VITE_ENABLE_STAGING_MODEL_TEST, false),
  routePath: STAGING_MODEL_TEST_ROUTE,
  hfBaseUrl: normalizeBaseUrl(STAGING_LOCKED_HF_BASE_URL),
  hfBaseModel: STAGING_LOCKED_HF_BASE_MODEL,
  hfApiKey: STAGING_HF_API_KEY,
  vllmBaseUrl: normalizeBaseUrl(import.meta.env.VITE_VLLM_BASE_URL),
  vllmModel: (import.meta.env.VITE_VLLM_MODEL || '').trim(),
  vllmApiKey: (import.meta.env.VITE_VLLM_API_KEY || '').trim(),
  baselineBaseUrl: normalizeBaseUrl(import.meta.env.VITE_VLLM_BASE_URL_BASELINE),
  candidateBaseUrl: normalizeBaseUrl(import.meta.env.VITE_VLLM_BASE_URL_CANDIDATE),
  quickCheckLatencyThresholdMs: parseEnvNumber(import.meta.env.VITE_STAGING_QUICKCHECK_MAX_LATENCY_MS, 12000),
  requestTimeoutMs: clampNumber(
    Math.round(parseEnvNumber(import.meta.env.VITE_STAGING_REQUEST_TIMEOUT_MS, STAGING_REQUEST_TIMEOUT_DEFAULT_MS)),
    STAGING_REQUEST_TIMEOUT_MIN_MS,
    STAGING_REQUEST_TIMEOUT_MAX_MS,
  ),
  healthTimeoutMs: clampNumber(Math.round(parseEnvNumber(import.meta.env.VITE_STAGING_HEALTH_TIMEOUT_MS, 10000)), 4000, 120000),
  requestRetryCount: clampNumber(Math.round(parseEnvNumber(import.meta.env.VITE_STAGING_REQUEST_RETRY_COUNT, 0)), 0, 3),
  requestRetryDelayMs: clampNumber(Math.round(parseEnvNumber(import.meta.env.VITE_STAGING_REQUEST_RETRY_DELAY_MS, 1250)), 250, 10000),
  qwenDefaultTemperature: clampNumber(parseEnvNumber(import.meta.env.VITE_STAGING_QWEN_DEFAULT_TEMPERATURE, QWEN_DEFAULT_TEMPERATURE), 0, 2),
  qwenDefaultMaxTokens: clampNumber(Math.round(parseEnvNumber(import.meta.env.VITE_STAGING_QWEN_DEFAULT_MAX_TOKENS, QWEN_DEFAULT_MAX_TOKENS)), 64, 4096),
  qwenDefaultTopP: clampNumber(parseEnvNumber(import.meta.env.VITE_STAGING_QWEN_DEFAULT_TOP_P, QWEN_DEFAULT_TOP_P), 0.1, 1),
};

export const isStagingModelTestEnabled = (): boolean => {
  if (stagingConfig.appEnv === 'staging' && stagingConfig.enableModelTest) {
    return true;
  }

  // Local dev fallback keeps production locked while avoiding env wiring friction.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1';
  }

  return false;
};

export const normalizePathname = (pathname: string): string => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

export const isStagingModelTestRoute = (pathname: string): boolean => {
  return normalizePathname(pathname) === STAGING_MODEL_TEST_ROUTE;
};
