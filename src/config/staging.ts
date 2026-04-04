const parseEnvBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value == null || value.trim() === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const parseEnvNumber = (value: string | undefined, defaultValue: number): number => {
  if (value == null || value.trim() === '') return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const normalizeBaseUrl = (value: string | undefined): string => {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
};

export const STAGING_MODEL_TEST_ROUTE = '/staging/model-test';

export const stagingConfig = {
  appEnv: (import.meta.env.VITE_APP_ENV || '').trim().toLowerCase(),
  enableModelTest: parseEnvBoolean(import.meta.env.VITE_ENABLE_STAGING_MODEL_TEST, false),
  routePath: STAGING_MODEL_TEST_ROUTE,
  hfBaseUrl: normalizeBaseUrl(import.meta.env.VITE_HF_BASE_URL || 'https://router.huggingface.co/v1'),
  hfBaseModel: (import.meta.env.VITE_HF_BASE_MODEL || '').trim(),
  hfApiKey: (import.meta.env.VITE_HF_API_KEY || '').trim(),
  vllmBaseUrl: normalizeBaseUrl(import.meta.env.VITE_VLLM_BASE_URL),
  vllmModel: (import.meta.env.VITE_VLLM_MODEL || '').trim(),
  vllmApiKey: (import.meta.env.VITE_VLLM_API_KEY || '').trim(),
  baselineBaseUrl: normalizeBaseUrl(import.meta.env.VITE_VLLM_BASE_URL_BASELINE),
  candidateBaseUrl: normalizeBaseUrl(import.meta.env.VITE_VLLM_BASE_URL_CANDIDATE),
  quickCheckLatencyThresholdMs: parseEnvNumber(import.meta.env.VITE_STAGING_QUICKCHECK_MAX_LATENCY_MS, 12000),
};

export const isStagingModelTestEnabled = (): boolean => {
  return stagingConfig.appEnv === 'staging' && stagingConfig.enableModelTest;
};

export const normalizePathname = (pathname: string): string => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

export const isStagingModelTestRoute = (pathname: string): boolean => {
  return normalizePathname(pathname) === STAGING_MODEL_TEST_ROUTE;
};
