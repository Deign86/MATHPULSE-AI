import type {
  BackendConnectionConfig,
  ComparisonRequestOptions,
  EndpointHealthStatus,
  NormalizedModelResponse,
} from './comparisonTypes';
import { probeOpenAiCompatibleEndpoint, requestOpenAiCompatibleComparison } from './openaiCompatibleClient';

const VLLM_BACKEND_TYPE = 'Fine-Tuned vLLM';

export const probeVllmEndpoint = async (
  connection: BackendConnectionConfig,
): Promise<EndpointHealthStatus> => {
  return probeOpenAiCompatibleEndpoint(connection);
};

export const requestVllmComparison = async (
  connection: BackendConnectionConfig,
  request: ComparisonRequestOptions,
): Promise<NormalizedModelResponse> => {
  return requestOpenAiCompatibleComparison('vllm', VLLM_BACKEND_TYPE, connection, request);
};
