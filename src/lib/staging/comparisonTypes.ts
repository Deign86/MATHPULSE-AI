export type ComparisonProvider = 'huggingface' | 'vllm';

export interface BackendConnectionConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface ComparisonRequestOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  timeoutMs?: number;
}

export interface EndpointHealthStatus {
  status: 'online' | 'degraded' | 'offline';
  checkedAt: string;
  detail: string;
  source: 'health' | 'models' | 'none';
  raw?: unknown;
}

export interface NormalizedModelResponse {
  provider: ComparisonProvider;
  backendType: string;
  model: string;
  text: string;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  finishReason: string | null;
  raw: unknown;
  error: string | null;
  endpoint: string;
}
