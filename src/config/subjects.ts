// src/config/subjects.ts
// Single source of truth for subject display names.
// Internal IDs (gen-math, stats-prob, etc.) are used as keys everywhere;
// this module converts them to human-readable labels for the UI.

export interface SubjectMeta {
  id: string;
  name: string;        // Full display name
  shortLabel: string;  // Abbreviated but still readable (for badges/chips)
  color: string;
}

export const SUBJECT_DISPLAY: Record<string, SubjectMeta> = {
  'gen-math':    { id: 'gen-math',    name: 'General Mathematics',       shortLabel: 'Gen Math',     color: '#3B82F6' },
  'stats-prob':  { id: 'stats-prob',  name: 'Statistics and Probability', shortLabel: 'Stats & Prob', color: '#0ea5e9' },
  'business-math': { id: 'business-math', name: 'Business Mathematics', shortLabel: 'Business Math', color: '#166534' },
  'pre-calc':    { id: 'pre-calc',    name: 'Pre-Calculus',              shortLabel: 'Pre-Calculus', color: '#F97316' },
  'basic-calc':  { id: 'basic-calc',  name: 'Basic Calculus',            shortLabel: 'Basic Calculus', color: '#EF4444' },
};

// Common aliases that appear in AI-generated text or legacy data
const ALIASES: Record<string, string> = {
  'gm': 'gen-math',
  'gen_math': 'gen-math',
  'gen math': 'gen-math',
  'genmath': 'gen-math',
  'general mathematics': 'gen-math',
  'sp': 'stats-prob',
  'stat': 'stats-prob',
  'stat&prob': 'stats-prob',
  'statistics': 'stats-prob',
  'statistics and probability': 'stats-prob',
  'bm': 'business-math',
  'business math': 'business-math',
  'business mathematics': 'business-math',
  'pc': 'pre-calc',
  'pre-calculus': 'pre-calc',
  'pre_calc': 'pre-calc',
  'precalc': 'pre-calc',
  'bc': 'basic-calc',
  'basic_calc': 'basic-calc',
  'basic calculus': 'basic-calc',
  'basiccalc': 'basic-calc',
};

/** Resolve an alias or ID to the canonical subject ID */
function resolveSubjectId(input: string): string | null {
  const lower = input.toLowerCase().trim();
  if (SUBJECT_DISPLAY[lower]) return lower;
  return ALIASES[lower] || null;
}

/**
 * Convert any subject code/alias to a full display name.
 * Falls back to the input string (title-cased) if unrecognized.
 */
export function getSubjectDisplayName(code: string): string {
  const id = resolveSubjectId(code);
  if (id) return SUBJECT_DISPLAY[id].name;
  return code; // pass through if unknown
}

/**
 * Convert any subject code/alias to a short but readable label (for badges).
 */
export function getSubjectShortLabel(code: string): string {
  const id = resolveSubjectId(code);
  if (id) return SUBJECT_DISPLAY[id].shortLabel;
  return code;
}

/**
 * Normalize a topic string that may contain codes like "Gm Q1 - Fundamentals"
 * into a human-readable form like "General Mathematics – Q1 – Fundamentals".
 * Handles patterns: "Gm Q1", "Gm Q1 - Title", "Gen Math Q2 - Title"
 */
export function normalizeTopicDisplay(topic: string): string {
  if (!topic) return topic;

  // Pattern: "{SubjectCode} Q{N}" optionally followed by " - {rest}" or " – {rest}"
  const match = topic.match(/^(Gm|Gen\s*Math|Stat|Stats?(?:\s*&\s*Prob)?|Pre[- ]?Cal(?:c)?|Basic[- ]?Cal(?:c)?|Bm|Business\s*Math)\s*(Q\d)?\s*[-–]?\s*(.*)$/i);
  if (!match) return topic;

  const [, subjectPart, quarter, rest] = match;
  const subjectName = getSubjectDisplayName(subjectPart);
  const parts = [subjectName];
  if (quarter) parts.push(quarter.toUpperCase());
  if (rest?.trim()) parts.push(rest.trim());
  return parts.join(' – ');
}
