import type {
  BackendConnectionConfig,
  ComparisonProvider,
  ComparisonRequestOptions,
  EndpointHealthStatus,
  NormalizedModelResponse,
} from './comparisonTypes';

const DEFAULT_TIMEOUT_MS = 45000;
const HEALTH_TIMEOUT_MS = 8000;

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const nowIso = (): string => new Date().toISOString();

const withV1Path = (baseUrl: string, path: string): string => {
  const normalized = normalizeBaseUrl(baseUrl);
  const hasV1 = /\/v1$/i.test(normalized);
  const safePath = path.replace(/^\/+/, '');
  return hasV1 ? `${normalized}/${safePath}` : `${normalized}/v1/${safePath}`;
};

const withHealthPath = (baseUrl: string): string => `${normalizeBaseUrl(baseUrl)}/health`;

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
    if (error instanceof DOMException && error.name === 'AbortError') {
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

const headersWithAuth = (apiKey?: string): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
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

  const failures: string[] = [];
  let reachable = false;

  try {
    const healthResponse = await fetchWithTimeout(
      withHealthPath(baseUrl),
      { method: 'GET', headers: headersWithAuth(connection.apiKey) },
      HEALTH_TIMEOUT_MS,
    );
    reachable = true;
    const raw = await parseBody(healthResponse);

    if (healthResponse.ok) {
      return {
        status: 'online',
        checkedAt: nowIso(),
        detail: 'Endpoint healthy via /health.',
        source: 'health',
        raw,
      };
    }

    failures.push(`/health returned HTTP ${healthResponse.status}`);
  } catch (error) {
    failures.push(`/health failed: ${toErrorMessage(error)}`);
  }

  try {
    const modelsResponse = await fetchWithTimeout(
      withV1Path(baseUrl, 'models'),
      { method: 'GET', headers: headersWithAuth(connection.apiKey) },
      HEALTH_TIMEOUT_MS,
    );
    reachable = true;
    const raw = await parseBody(modelsResponse);

    if (modelsResponse.ok) {
      return {
        status: 'online',
        checkedAt: nowIso(),
        detail: 'Endpoint healthy via /v1/models.',
        source: 'models',
        raw,
      };
    }

    failures.push(`/v1/models returned HTTP ${modelsResponse.status}`);
  } catch (error) {
    failures.push(`/v1/models failed: ${toErrorMessage(error)}`);
  }

  return {
    status: reachable ? 'degraded' : 'offline',
    checkedAt: nowIso(),
    detail: failures.join(' | '),
    source: 'none',
  };
};

export const requestOpenAiCompatibleComparison = async (
  provider: ComparisonProvider,
  backendType: string,
  connection: BackendConnectionConfig,
  request: ComparisonRequestOptions,
): Promise<NormalizedModelResponse> => {
  const baseUrl = normalizeBaseUrl(connection.baseUrl);
  const endpoint = withV1Path(baseUrl, 'chat/completions');
  const startedAt = performance.now();

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

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: headersWithAuth(connection.apiKey),
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
      request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    const raw = await parseBody(response);

    if (!response.ok) {
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
        error: `HTTP ${response.status} from ${endpoint}`,
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
      error: toErrorMessage(error),
      endpoint,
    };
  }
};
