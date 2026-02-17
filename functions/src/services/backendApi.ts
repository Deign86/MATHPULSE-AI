/**
 * MathPulse AI Cloud Functions - FastAPI Backend Service
 *
 * Wraps HTTP calls to the HuggingFace-hosted FastAPI backend.
 * Used by automation processors that need ML/AI capabilities
 * (risk prediction, learning-path generation, etc.).
 */

import axios, { AxiosError } from "axios";
import * as functions from "firebase-functions";
import {
  BACKEND_API_URL,
  BACKEND_TIMEOUT_MS,
  MAX_RETRIES,
} from "../config/constants";

// ─── Types ────────────────────────────────────────────────────

export interface RiskPredictionRequest {
  engagementScore: number;
  avgQuizScore: number;
  attendance: number;
  assignmentCompletion: number;
}

export interface RiskPredictionResponse {
  riskLevel: string;
  confidence: number;
  analysis: Record<string, any>;
}

export interface LearningPathRequest {
  weaknesses: string[];
  gradeLevel: string;
  learningStyle?: string;
}

export interface LearningPathResponse {
  learningPath: string;
}

export interface InterventionRequest {
  riskClassifications: Record<string, any>;
  weakTopics: any[];
  studentId: string;
}

// ─── Generic caller with retry ────────────────────────────────

async function callWithRetry<T>(
  endpoint: string,
  data: any,
  retries = MAX_RETRIES,
): Promise<T> {
  const url = `${BACKEND_API_URL}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.post<T>(url, data, {
        timeout: BACKEND_TIMEOUT_MS,
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;

      // Don't retry 4xx (client errors)
      if (status && status >= 400 && status < 500) {
        functions.logger.error(
          `Backend ${endpoint} returned ${status}`,
          { data: axiosErr.response?.data },
        );
        throw err;
      }

      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        functions.logger.warn(
          `Backend ${endpoint} attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          { error: axiosErr.message },
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        functions.logger.error(
          `Backend ${endpoint} failed after ${retries + 1} attempts`,
          { error: axiosErr.message },
        );
        throw err;
      }
    }
  }

  // Should never reach here
  throw new Error(`callWithRetry exhausted all retries for ${endpoint}`);
}

// ─── Public API Functions ─────────────────────────────────────

/**
 * Call /api/predict-risk on the FastAPI backend.
 * Returns ML-based risk level and confidence.
 */
export async function predictRisk(
  data: RiskPredictionRequest,
): Promise<RiskPredictionResponse> {
  return callWithRetry<RiskPredictionResponse>("/api/predict-risk", data);
}

/**
 * Call /api/learning-path on the FastAPI backend.
 * Returns an AI-generated personalised learning path string.
 */
export async function generateLearningPath(
  data: LearningPathRequest,
): Promise<LearningPathResponse> {
  return callWithRetry<LearningPathResponse>("/api/learning-path", data);
}

/**
 * Generic POST to any backend endpoint.
 * Useful for one-off or future endpoints.
 */
export async function callBackendApi<T = any>(
  endpoint: string,
  data: any,
): Promise<T> {
  return callWithRetry<T>(endpoint, data);
}
