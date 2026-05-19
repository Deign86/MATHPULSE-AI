/**
 * Topic Taxonomy — Maps DepEd competency codes to curriculum module IDs.
 *
 * Used by the diagnostic scoring system to flag specific TOPICS (modules)
 * instead of broad subject areas. Each module represents a DepEd K-12
 * topic/competency group for General Mathematics Grade 11.
 */

export interface TopicDefinition {
  topicId: string;          // Same as module ID in CURRICULUM_MODULE_BLUEPRINTS
  label: string;            // Human-readable topic name
  subjectId: string;        // 'gen-math' | 'business-math' | 'stats-prob'
  quarter: 1 | 2 | 3 | 4;
  competencyCodes: string[]; // DepEd competency codes that belong to this topic
}

/**
 * Complete topic taxonomy aligned with CURRICULUM_MODULE_BLUEPRINTS.
 * Each entry's `topicId` matches a module `id` in curriculumModules.ts.
 */
export const TOPIC_TAXONOMY: TopicDefinition[] = [
  // Q1
  {
    topicId: 'gm-q1-business-finance',
    label: 'Business and Finance',
    subjectId: 'gen-math',
    quarter: 1,
    competencyCodes: ['GM11-BF-1', 'GM11-BF-2', 'GM11-BF-3'],
  },
  {
    topicId: 'gm-q1-patterns-sequences-series',
    label: 'Patterns, Sequences, and Series',
    subjectId: 'gen-math',
    quarter: 1,
    competencyCodes: ['GM11-PSS-1', 'GM11-PSS-2', 'GM11-PSS-3'],
  },
  {
    topicId: 'gm-q1-financial-application-sequences-series',
    label: 'Financial Application of Sequences and Series',
    subjectId: 'gen-math',
    quarter: 1,
    competencyCodes: ['GM11-FASS-1', 'GM11-FASS-2'],
  },
  // Q2
  {
    topicId: 'gm-q2-measurement-conversion',
    label: 'Measurement and Conversion',
    subjectId: 'gen-math',
    quarter: 2,
    competencyCodes: ['GM11-MC-1', 'GM11-MC-2'],
  },
  {
    topicId: 'gm-q2-functions-graphs',
    label: 'Functions and Their Graphs',
    subjectId: 'gen-math',
    quarter: 2,
    competencyCodes: ['GM11-FG-1', 'GM11-FG-2', 'GM11-FG-3', 'M11GM-Ia-2', 'M11GM-Ib-5', 'M11GM-Id-2', 'M11GM-Ie-f-1', 'M11GM-Ii-4'],
  },
  {
    topicId: 'gm-q2-piecewise-functions',
    label: 'Piecewise Functions',
    subjectId: 'gen-math',
    quarter: 2,
    competencyCodes: ['GM11-PF-1', 'GM11-PF-2'],
  },
  {
    topicId: 'gm-q2-statistical-variables',
    label: 'Statistical Variables',
    subjectId: 'gen-math',
    quarter: 2,
    competencyCodes: ['GM11-SV-1', 'GM11-SV-2'],
  },
  // Q3
  {
    topicId: 'gm-q3-basic-trigonometry',
    label: 'Basic Trigonometry',
    subjectId: 'gen-math',
    quarter: 3,
    competencyCodes: ['GM11-BT-1', 'GM11-BT-2'],
  },
  {
    topicId: 'gm-q3-practical-applications-measurement',
    label: 'Practical Applications of Measurement',
    subjectId: 'gen-math',
    quarter: 3,
    competencyCodes: ['GM11-PAM-1', 'GM11-PAM-2', 'M11GM-IIa-b-1', 'M11GM-IIa-2', 'M11GM-IIc-d-1', 'M11GM-IIf-3'],
  },
  {
    topicId: 'gm-q3-transformational-geometry-volume-capacity',
    label: 'Transformational Geometry / Volume and Capacity',
    subjectId: 'gen-math',
    quarter: 3,
    competencyCodes: ['GM11-TGVC-1', 'GM11-TGVC-2'],
  },
  {
    topicId: 'gm-q3-random-variables-sampling',
    label: 'Random Variables and Sampling',
    subjectId: 'gen-math',
    quarter: 3,
    competencyCodes: ['GM11-RVS-1', 'GM11-RVS-2', 'GM11-RVS-3'],
  },
  // Q4
  {
    topicId: 'gm-q4-compound-interest-annuities-loans',
    label: 'Compound Interest, Annuities, and Loans',
    subjectId: 'gen-math',
    quarter: 4,
    competencyCodes: ['GM11-CIAL-1', 'GM11-CIAL-2', 'GM11-CIAL-3'],
  },
  {
    topicId: 'gm-q4-hypothesis-testing-regression',
    label: 'Hypothesis Testing and Regression',
    subjectId: 'gen-math',
    quarter: 4,
    competencyCodes: ['GM11-HTR-1', 'GM11-HTR-2'],
  },
  {
    topicId: 'gm-q4-propositions-syllogisms-fallacies',
    label: 'Logical Propositions, Syllogisms, and Fallacies',
    subjectId: 'gen-math',
    quarter: 4,
    competencyCodes: ['GM11-PSF-1', 'GM11-PSF-2', 'GM11-PSF-3', 'M11GM-IIg-1', 'M11GM-IIh-1', 'M11GM-IIi-1', 'M11GM-IIi-2', 'M11GM-IIj-1'],
  },
];

/** Lookup: competencyCode → topicId */
export const COMPETENCY_TO_TOPIC_ID: Record<string, string> = {};
for (const topic of TOPIC_TAXONOMY) {
  for (const code of topic.competencyCodes) {
    COMPETENCY_TO_TOPIC_ID[code] = topic.topicId;
  }
}

/** Lookup: topicId → TopicDefinition */
export const TOPIC_BY_ID: Record<string, TopicDefinition> = {};
for (const topic of TOPIC_TAXONOMY) {
  TOPIC_BY_ID[topic.topicId] = topic;
}

/** Lookup: topicId → human-readable label */
export const TOPIC_LABELS: Record<string, string> = {};
for (const topic of TOPIC_TAXONOMY) {
  TOPIC_LABELS[topic.topicId] = topic.label;
}

/**
 * Resolve a competency code to its parent module/topic ID.
 * Returns undefined if the code isn't mapped.
 */
export function resolveTopicId(competencyCode: string): string | undefined {
  return COMPETENCY_TO_TOPIC_ID[competencyCode];
}
