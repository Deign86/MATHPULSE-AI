export type DiagnosticTopicKey = 'Functions' | 'BusinessMath' | 'Logic';

export const DIAGNOSTIC_TOPIC_LABELS = {
  Functions: 'Functions and Graphs',
  BusinessMath: 'Business and Financial Mathematics',
  Logic: 'Logic and Reasoning',
} satisfies Record<DiagnosticTopicKey, string>;

export const TOPIC_TO_MODULE_ID = {
  Functions: 'gm-q2-functions-graphs',
  BusinessMath: 'gm-q1-business-finance',
  Logic: 'gm-q4-propositions-syllogisms-fallacies',
} satisfies Record<DiagnosticTopicKey, string>;

export const normalizeDiagnosticTopic = (value: string): DiagnosticTopicKey | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'functions' || normalized.includes('function')) return 'Functions';
  if (normalized === 'businessmath' || normalized.includes('business')) return 'BusinessMath';
  if (normalized === 'logic' || normalized.includes('reason')) return 'Logic';
  return null;
};
