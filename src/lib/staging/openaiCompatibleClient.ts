import type {
  BackendConnectionConfig,
  ComparisonProvider,
  ComparisonRequestOptions,
  EndpointHealthStatus,
  NormalizedModelResponse,
} from './comparisonTypes';
import { STAGING_REQUEST_TIMEOUT_MAX_MS, STAGING_REQUEST_TIMEOUT_MIN_MS, stagingConfig } from '../../config/staging';

const DEFAULT_TIMEOUT_MS = stagingConfig.requestTimeoutMs;
const HEALTH_TIMEOUT_MS = stagingConfig.healthTimeoutMs;
const DEFAULT_RETRY_COUNT = stagingConfig.requestRetryCount;
const DEFAULT_RETRY_DELAY_MS = stagingConfig.requestRetryDelayMs;
const HF_ROUTER_HOSTNAME = 'router.huggingface.co';
const DEV_HF_PROXY_BASE = '/__staging_proxy/hf/v1';

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const resolveRuntimeBaseUrl = (baseUrl: string): string => {
  if (!import.meta.env.DEV) return baseUrl;

  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname.toLowerCase() === HF_ROUTER_HOSTNAME) {
      return DEV_HF_PROXY_BASE;
    }
  } catch {
    // Keep the original value for non-URL inputs.
  }

  return baseUrl;
};

const stripKnownApiSuffixes = (value: string): string => {
  let normalized = normalizeBaseUrl(value);
  const suffixes = [
    '/v1/chat/completions',
    '/chat/completions',
    '/v1/models',
    '/models',
    '/v1/health',
    '/health',
  ];

  let changed = true;
  while (changed && normalized) {
    changed = false;
    const lower = normalized.toLowerCase();
    const matchedSuffix = suffixes.find((suffix) => lower.endsWith(suffix));
    if (!matchedSuffix) break;

    normalized = normalizeBaseUrl(normalized.slice(0, normalized.length - matchedSuffix.length));
    changed = true;
  }

  return normalized;
};

interface ResolvedBaseUrls {
  normalizedInput: string;
  rootBase: string;
  v1Base: string;
}

const resolveBaseUrls = (value: string): ResolvedBaseUrls => {
  const normalizedInput = normalizeBaseUrl(value);
  const canonical = stripKnownApiSuffixes(normalizedInput);
  const hasV1 = /\/v1$/i.test(canonical);
  const rootBase = hasV1 ? normalizeBaseUrl(canonical.replace(/\/v1$/i, '')) : canonical;
  const v1Base = hasV1 ? canonical : `${canonical}/v1`;

  return {
    normalizedInput,
    rootBase,
    v1Base,
  };
};

const nowIso = (): string => new Date().toISOString();

const withV1Path = (baseUrl: string, path: string): string => {
  const { v1Base } = resolveBaseUrls(baseUrl);
  const safePath = path.replace(/^\/+/, '');
  return `${v1Base}/${safePath}`;
};

const withHealthPaths = (baseUrl: string): string[] => {
  const { rootBase, v1Base } = resolveBaseUrls(baseUrl);
  const candidates = [`${rootBase}/health`, `${v1Base}/health`].filter(Boolean);
  return [...new Set(candidates.map((value) => normalizeBaseUrl(value)))];
};

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const isNgrokUrl = (url: string): boolean => {
  try {
    return /\.ngrok(-free)?\.dev$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

const isRetriableHttpStatus = (status: number): boolean => {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
};

const isRetriableErrorMessage = (message: string): boolean => {
  return /(timed out|timeout|failed to fetch|networkerror|network request failed|load failed|econnreset|etimedout|enotfound)/i.test(
    message,
  );
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
};

const headersWithAuth = (apiKey?: string, baseUrl?: string): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  if (baseUrl && isNgrokUrl(baseUrl)) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  return headers;
};

const extractContentText = (content: unknown): string => {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    const parts = content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (isObject(part) && typeof part.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean);

    return parts.join('\n').trim();
  }

  return '';
};

const usageNumber = (usage: unknown, key: 'prompt_tokens' | 'completion_tokens' | 'total_tokens'): number | null => {
  if (!isObject(usage)) return null;
  const value = usage[key];
  return typeof value === 'number' ? value : null;
};

interface ProbeResult {
  pathLabel: string;
  url: string;
  ok: boolean;
  status: number | null;
  reachable: boolean;
  error: string | null;
  raw?: unknown;
}

const probeEndpoint = async (
  pathLabel: string,
  url: string,
  apiKey: string | undefined,
  headersBaseUrl?: string,
): Promise<ProbeResult> => {
  try {
    const response = await fetchWithTimeout(
      url,
      { method: 'GET', headers: headersWithAuth(apiKey, headersBaseUrl ?? url) },
      HEALTH_TIMEOUT_MS,
    );
    const raw = await parseBody(response);

    return {
      pathLabel,
      url,
      ok: response.ok,
      status: response.status,
      reachable: true,
      error: null,
      raw,
    };
  } catch (error) {
    return {
      pathLabel,
      url,
      ok: false,
      status: null,
      reachable: false,
      error: toErrorMessage(error),
    };
  }
};

const summarizeProbe = (probe: ProbeResult): string => {
  if (probe.ok) {
    return `${probe.pathLabel} returned HTTP ${probe.status}`;
  }
  if (probe.status !== null) {
    return `${probe.pathLabel} returned HTTP ${probe.status}`;
  }
  return `${probe.pathLabel} failed: ${probe.error}`;
};

export const probeOpenAiCompatibleEndpoint = async (
  connection: BackendConnectionConfig,
): Promise<EndpointHealthStatus> => {
  const baseUrl = normalizeBaseUrl(connection.baseUrl);

  if (!baseUrl) {
    return {
      status: 'offline',
      checkedAt: nowIso(),
      detail: 'Missing endpoint base URL.',
      source: 'none',
    };
  }

  const runtimeBaseUrl = resolveRuntimeBaseUrl(baseUrl);
  const requestedResolved = resolveBaseUrls(baseUrl);
  const runtimeResolved = resolveBaseUrls(runtimeBaseUrl);

  const modelProbe = await probeEndpoint(
    'GET /v1/models',
    withV1Path(runtimeResolved.v1Base, 'models'),
    connection.apiKey,
    baseUrl,
  );

  if (modelProbe.ok) {
    return {
      status: 'online',
      checkedAt: nowIso(),
      detail: 'Endpoint healthy via /v1/models.',
      source: 'models',
      raw: {
        resolvedBase: {
          requested: {
            input: requestedResolved.normalizedInput,
            rootBase: requestedResolved.rootBase,
            v1Base: requestedResolved.v1Base,
          },
          runtime: {
            input: runtimeResolved.normalizedInput,
            rootBase: runtimeResolved.rootBase,
            v1Base: runtimeResolved.v1Base,
          },
        },
        probes: [
          {
            path: modelProbe.pathLabel,
            url: modelProbe.url,
            ok: modelProbe.ok,
            status: modelProbe.status,
            error: modelProbe.error,
          },
        ],
      },
    };
  }

  if (modelProbe.reachable && (modelProbe.status === 401 || modelProbe.status === 403)) {
    return {
      status: 'online',
      checkedAt: nowIso(),
      detail: 'Endpoint reachable but requires authentication for /v1/models.',
      source: 'models',
      raw: {
        resolvedBase: {
          requested: {
            input: requestedResolved.normalizedInput,
            rootBase: requestedResolved.rootBase,
            v1Base: requestedResolved.v1Base,
          },
          runtime: {
            input: runtimeResolved.normalizedInput,
            rootBase: runtimeResolved.rootBase,
            v1Base: runtimeResolved.v1Base,
          },
        },
        probes: [
          {
            path: modelProbe.pathLabel,
            url: modelProbe.url,
            ok: modelProbe.ok,
            status: modelProbe.status,
            error: modelProbe.error,
          },
        ],
      },
    };
  }

  const healthProbes: ProbeResult[] = [];
  for (const url of withHealthPaths(runtimeResolved.rootBase)) {
    const pathLabel = /\/v1\/health$/i.test(url) ? 'GET /v1/health' : 'GET /health';
    const probe = await probeEndpoint(pathLabel, url, connection.apiKey, baseUrl);
    healthProbes.push(probe);

    if (probe.ok) {
      break;
    }
  }

  const probes = [modelProbe, ...healthProbes];
  const reachable = probes.some((probe) => probe.reachable);
  const healthProbe = healthProbes.find((probe) => probe.ok);

  const raw = {
    resolvedBase: {
      requested: {
        input: requestedResolved.normalizedInput,
        rootBase: requestedResolved.rootBase,
        v1Base: requestedResolved.v1Base,
      },
      runtime: {
        input: runtimeResolved.normalizedInput,
        rootBase: runtimeResolved.rootBase,
        v1Base: runtimeResolved.v1Base,
      },
    },
    probes: probes.map((probe) => ({
      path: probe.pathLabel,
      url: probe.url,
      ok: probe.ok,
      status: probe.status,
      error: probe.error,
    })),
  };

  if (healthProbe) {
    return {
      status: 'online',
      checkedAt: nowIso(),
      detail: 'Endpoint healthy via health probe.',
      source: 'health',
      raw,
    };
  }

  const failures = probes.map(summarizeProbe);

  return {
    status: reachable ? 'degraded' : 'offline',
    checkedAt: nowIso(),
    detail: reachable
      ? `Endpoint reachable but health probes did not pass: ${failures.join(' | ')}`
      : failures.join(' | '),
    source: 'none',
    raw,
  };
};

export const requestOpenAiCompatibleComparison = async (
  provider: ComparisonProvider,
  backendType: string,
  connection: BackendConnectionConfig,
  request: ComparisonRequestOptions,
): Promise<NormalizedModelResponse> => {
  const baseUrl = normalizeBaseUrl(connection.baseUrl);
  const runtimeBaseUrl = resolveRuntimeBaseUrl(baseUrl);
  const endpoint = withV1Path(baseUrl, 'chat/completions');
  const runtimeEndpoint = withV1Path(runtimeBaseUrl, 'chat/completions');
  const startedAt = performance.now();
  const timeoutMs = clampNumber(
    Math.round(request.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    STAGING_REQUEST_TIMEOUT_MIN_MS,
    STAGING_REQUEST_TIMEOUT_MAX_MS,
  );
  const retryCount = clampNumber(DEFAULT_RETRY_COUNT, 0, 3);
  const retryDelayMs = clampNumber(DEFAULT_RETRY_DELAY_MS, 250, 10000);

  if (!baseUrl) {
    return {
      provider,
      backendType,
      model: connection.model,
      text: '',
      latencyMs: 0,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      finishReason: null,
      raw: null,
      error: 'Missing endpoint base URL.',
      endpoint,
    };
  }

  if (!connection.model.trim()) {
    return {
      provider,
      backendType,
      model: connection.model,
      text: '',
      latencyMs: 0,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      finishReason: null,
      raw: null,
      error: 'Missing model ID.',
      endpoint,
    };
  }

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const attemptNumber = attempt + 1;

    try {
      const response = await fetchWithTimeout(
        runtimeEndpoint,
        {
          method: 'POST',
          headers: headersWithAuth(connection.apiKey, baseUrl),
          body: JSON.stringify({
            model: connection.model,
            messages: [
              ...(request.systemPrompt?.trim()
                ? [{ role: 'system', content: request.systemPrompt.trim() }]
                : []),
              { role: 'user', content: request.userPrompt.trim() },
            ],
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            top_p: request.topP,
          }),
        },
        timeoutMs,
      );

      const raw = await parseBody(response);

      if (!response.ok) {
        if (attempt < retryCount && isRetriableHttpStatus(response.status)) {
          await sleep(retryDelayMs * attemptNumber);
          continue;
        }

        const retrySuffix = attempt > 0 ? ` after ${attemptNumber} attempts` : '';
        return {
          provider,
          backendType,
          model: connection.model,
          text: '',
          latencyMs: Math.round(performance.now() - startedAt),
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          finishReason: null,
          raw,
          error: `HTTP ${response.status} from ${endpoint}${retrySuffix}`,
          endpoint,
        };
      }

      if (!isObject(raw) || !Array.isArray(raw.choices) || raw.choices.length === 0) {
        return {
          provider,
          backendType,
          model: connection.model,
          text: '',
          latencyMs: Math.round(performance.now() - startedAt),
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          finishReason: null,
          raw,
          error: 'Invalid chat response shape (missing choices).',
          endpoint,
        };
      }

      const firstChoice = raw.choices[0];
      const choiceRecord = isObject(firstChoice) ? firstChoice : {};
      const message = isObject(choiceRecord.message) ? choiceRecord.message : {};

      const text = extractContentText(message.content).trim();
      const finishReason = typeof choiceRecord.finish_reason === 'string' ? choiceRecord.finish_reason : null;
      const usage = isObject(raw.usage) ? raw.usage : null;
      const modelName = typeof raw.model === 'string' ? raw.model : connection.model;

      if (!text && attempt < retryCount) {
        await sleep(retryDelayMs * attemptNumber);
        continue;
      }

      return {
        provider,
        backendType,
        model: modelName,
        text,
        latencyMs: Math.round(performance.now() - startedAt),
        promptTokens: usageNumber(usage, 'prompt_tokens'),
        completionTokens: usageNumber(usage, 'completion_tokens'),
        totalTokens: usageNumber(usage, 'total_tokens'),
        finishReason,
        raw,
        error: text ? null : 'Empty response text.',
        endpoint,
      };
    } catch (error) {
      const errorMessage = toErrorMessage(error);

      if (attempt < retryCount && isRetriableErrorMessage(errorMessage)) {
        await sleep(retryDelayMs * attemptNumber);
        continue;
      }

      return {
        provider,
        backendType,
        model: connection.model,
        text: '',
        latencyMs: Math.round(performance.now() - startedAt),
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        finishReason: null,
        raw: null,
        error: attempt > 0 ? `${errorMessage} (after ${attemptNumber} attempts)` : errorMessage,
        endpoint,
      };
    }
  }

  return {
    provider,
    backendType,
    model: connection.model,
    text: '',
    latencyMs: Math.round(performance.now() - startedAt),
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    finishReason: null,
    raw: null,
    error: `Request failed after ${retryCount + 1} attempts.`,
    endpoint,
  };
};
