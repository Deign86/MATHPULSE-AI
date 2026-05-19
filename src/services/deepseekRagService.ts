const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

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

export async function fetchModulePreview(
  moduleId: string,
  moduleTitle: string,
  subject: string,
  quarter: number,
): Promise<ModulePreviewResult> {
  const res = await fetch(`${API_URL}/api/deepseek/module-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module_id: moduleId, module_title: moduleTitle, subject, quarter }),
  });
  if (!res.ok) return { ai_overview: '', rag_confidence: 'low', generated: false };
  return res.json();
}

export async function fetchStudyTips(
  studentId: string,
  topicId: string,
  topicName: string,
  subject: string,
  confidenceScore: number,
): Promise<StudyTipsResult> {
  const res = await fetch(`${API_URL}/api/deepseek/study-tips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      topic_id: topicId,
      topic_name: topicName,
      subject,
      confidence_score: confidenceScore,
    }),
  });
  if (!res.ok) return { tips: '', generated: false, confidence_score: 0 };
  return res.json();
}
