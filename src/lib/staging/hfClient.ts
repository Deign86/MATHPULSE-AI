import type {
  BackendConnectionConfig,
  ComparisonRequestOptions,
  EndpointHealthStatus,
  NormalizedModelResponse,
} from './comparisonTypes';
import { probeOpenAiCompatibleEndpoint, requestOpenAiCompatibleComparison } from './openaiCompatibleClient';

const HF_BACKEND_TYPE = 'Hugging Face Inference';

export const probeHuggingFaceEndpoint = async (
  connection: BackendConnectionConfig,
): Promise<EndpointHealthStatus> => {
  return probeOpenAiCompatibleEndpoint(connection);
};

export const requestHuggingFaceComparison = async (
  connection: BackendConnectionConfig,
  request: ComparisonRequestOptions,
): Promise<NormalizedModelResponse> => {
  return requestOpenAiCompatibleComparison('huggingface', HF_BACKEND_TYPE, connection, request);
};
