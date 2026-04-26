export type DiagnosticTopicKey = 'Functions' | 'BusinessMath' | 'Logic';

export const DIAGNOSTIC_TOPIC_LABELS: Record<DiagnosticTopicKey, string> = {
  Functions: 'Functions and Graphs',
  BusinessMath: 'Business and Financial Mathematics',
  Logic: 'Logic and Reasoning',
};

export const TOPIC_TO_MODULE_ID: Record<DiagnosticTopicKey, string> = {
  Functions: 'gm-q2-functions-graphs',
  BusinessMath: 'gm-q1-business-finance',
  Logic: 'gm-q4-propositions-syllogisms-fallacies',
};

export const normalizeDiagnosticTopic = (value: string): DiagnosticTopicKey | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'functions' || normalized.includes('function')) return 'Functions';
  if (normalized === 'businessmath' || normalized.includes('business')) return 'BusinessMath';
  if (normalized === 'logic' || normalized.includes('reason')) return 'Logic';
  return null;
};
