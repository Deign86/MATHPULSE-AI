import { apiFetch } from './apiService';

export interface ModulePreviewResult {
  ai_overview: string;
  rag_confidence: 'high' | 'medium' | 'low';
  generated: boolean;
}

export interface StudyTipsResult {
  tips: string;
  generated: boolean;
  confidence_score: number;
}

// Both `/api/deepseek/*` calls route through the authed `apiFetch` client so
// the Firebase bearer token is attached (with 401-refresh retry). Failure
// fallbacks are preserved: callers render the no-AI state when generation
// is unavailable or the session is unauthenticated (server responds 401).
export async function fetchModulePreview(
  moduleId: string,
  moduleTitle: string,
  subject: string,
  quarter: number,
): Promise<ModulePreviewResult> {
  try {
    return await apiFetch<ModulePreviewResult>('/api/deepseek/module-preview', {
      method: 'POST',
      body: JSON.stringify({ module_id: moduleId, module_title: moduleTitle, subject, quarter }),
    });
  } catch {
    return { ai_overview: '', rag_confidence: 'low', generated: false };
  }
}

export async function fetchStudyTips(
  studentId: string,
  topicId: string,
  topicName: string,
  subject: string,
  confidenceScore: number,
): Promise<StudyTipsResult> {
  try {
    return await apiFetch<StudyTipsResult>('/api/deepseek/study-tips', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        topic_id: topicId,
        topic_name: topicName,
        subject,
        confidence_score: confidenceScore,
      }),
    });
  } catch {
    return { tips: '', generated: false, confidence_score: 0 };
  }
}
