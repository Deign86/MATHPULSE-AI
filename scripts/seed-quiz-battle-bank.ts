/**
 * One-off seed for the Firestore collection `quizBattleQuestionBank`: AI-generated, AI-verified Grade 11
 * multiple-choice questions for every Quiz Battle module, so bot matches stop padding with off-topic static questions.
 * Run with `node scripts/seed-quiz-battle-bank.ts [--dry-run | --write] [--module gm-1]` (Node 22.18+).
 *   --dry-run (default) generates + verifies with Claude Haiku and writes scripts/output/quiz-battle-bank-seed.json; never touches Firestore.
 *   --write reads that JSON (no regeneration) and upserts the documents in batches; doc ids are deterministic, so re-runs update in place.
 * Credentials: ANTHROPIC_API_KEY (+ ANTHROPIC_WORKSPACE_ID) from the environment or .env.local; Firebase from
 * FIREBASE_SERVICE_ACCOUNT_FILE or .secrets/firebase-service-account.json.
 */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url));

const MODEL = 'claude-haiku-5-5';
const SOURCE_REFERENCE = 'seed-quiz-battle-bank 2026-10-12';
const OUTPUT_PATH = fileURLToPath(new URL('./output/quiz-battle-bank-seed.json', import.meta.url));
const STATIC_BANK_PATH = fileURLToPath(new URL('../functions/src/triggers/quizBattleApi.ts', import.meta.url));
const SUBJECTS_PATH = fileURLToPath(new URL('../src/data/subjects.ts', import.meta.url));
const COLLECTION = 'quizBattleQuestionBank';
const MAX_STEM_LENGTH = 220;
const VERIFY_BATCH_SIZE = 5;
const WRITE_BATCH_SIZE = 400;
// Haiku 5.5 list price in USD per million tokens; the cost line is an estimate.
const PRICE_PER_MTOK = { input: 1, output: 5 };

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
// Kept per module: 8 easy / 9 medium / 8 hard. Generation asks for ~40% more so verification drops don't leave holes.
const KEEP_QUOTA: Record<Difficulty, number> = { easy: 8, medium: 9, hard: 8 };
const GENERATE_QUOTA: Record<Difficulty, number> = { easy: 14, medium: 15, hard: 16 };

export interface ModuleSpec {
  moduleId: string;
  subjectId: 'gen-math' | 'stats-prob';
  title: string;
  lessons: string[];
}

export interface SeedQuestion {
  moduleId: string;
  lessonIndex: number;
  lessonTitle: string;
  difficulty: Difficulty;
  stem: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
}

const MODULE_TITLES = {
  'gm-1': { subjectId: 'gen-math', title: 'Functions and Their Graphs' },
  'gm-2': { subjectId: 'gen-math', title: 'Business Mathematics' },
  'gm-3': { subjectId: 'gen-math', title: 'Logic' },
  'sp-1': { subjectId: 'stats-prob', title: 'Random Variables and Probability Distributions' },
  'sp-2': { subjectId: 'stats-prob', title: 'Normal Distribution' },
  'sp-3': { subjectId: 'stats-prob', title: 'Sampling and Estimation' },
  'sp-4': { subjectId: 'stats-prob', title: 'Hypothesis Testing' },
} as const satisfies Record<string, { subjectId: ModuleSpec['subjectId']; title: string }>;

export function normalizeStem(stem: string): string {
  return stem.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Lesson titles per module, read from the `{ id: 'gm-1-l3', title: '...' }` entries in src/data/subjects.ts. */
export function parseModuleLessons(subjectsSource: string): ModuleSpec[] {
  const lessonsByModule = new Map<string, string[]>();
  for (const match of subjectsSource.matchAll(/\{ id: '((?:gm|sp)-\d+)-l(\d+)', title: '([^']+)'/g)) {
    const [, moduleId, , title] = match;
    lessonsByModule.set(moduleId, [...(lessonsByModule.get(moduleId) ?? []), title]);
  }
  return Object.entries(MODULE_TITLES).map(([moduleId, meta]) => ({
    moduleId,
    subjectId: meta.subjectId,
    title: meta.title,
    lessons: lessonsByModule.get(moduleId) ?? [],
  }));
}

/** Normalized prompts of the static bank (`prompt: "..."` literals), so seeded questions never repeat them. */
export function parseStaticBankStems(apiSource: string): Set<string> {
  return new Set([...apiSource.matchAll(/^\s+prompt: "((?:[^"\\]|\\.)*)",$/gm)].map((match) => normalizeStem(match[1])));
}

/** Spreads a per-difficulty quota over lessons round-robin, so each lesson gets a call with exact counts. */
export function planLessonRequests(lessonCount: number, quota: Record<Difficulty, number>): Record<Difficulty, number>[] {
  const plan = Array.from({ length: lessonCount }, () => ({ easy: 0, medium: 0, hard: 0 }));
  if (lessonCount === 0) return plan;
  let cursor = 0;
  for (const difficulty of DIFFICULTIES) {
    for (let slot = 0; slot < quota[difficulty]; slot += 1) {
      plan[cursor % lessonCount][difficulty] += 1;
      cursor += 1;
    }
  }
  return plan;
}

/** Reason a generated question must be dropped, or null when it passes the structural checks. */
export function rejectionReason(question: SeedQuestion, seenStems: ReadonlySet<string>, staticStems: ReadonlySet<string>): string | null {
  if (question.stem.trim().length < 8) return 'stem_too_short';
  if (question.stem.length > MAX_STEM_LENGTH) return 'stem_too_long';
  const trimmedChoices = question.choices.map((choice) => choice.trim());
  if (trimmedChoices.length !== 4 || trimmedChoices.some((choice) => choice.length === 0)) return 'bad_choices';
  if (new Set(trimmedChoices.map((choice) => choice.toLowerCase())).size !== 4) return 'duplicate_choices';
  if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) return 'bad_correct_index';
  const stem = normalizeStem(question.stem);
  if (seenStems.has(stem)) return 'duplicate_stem';
  if (staticStems.has(stem)) return 'duplicate_of_static_bank';
  return null;
}

/** Applies the structural checks in order and returns survivors plus drop counts by reason. */
export function filterStructurally(questions: SeedQuestion[], staticStems: ReadonlySet<string>) {
  const seenStems = new Set<string>();
  const kept: SeedQuestion[] = [];
  const dropped = new Map<string, number>();
  for (const question of questions) {
    const reason = rejectionReason(question, seenStems, staticStems);
    if (reason) {
      dropped.set(reason, (dropped.get(reason) ?? 0) + 1);
      continue;
    }
    seenStems.add(normalizeStem(question.stem));
    kept.push(question);
  }
  return { kept, dropped };
}

/** Takes up to the per-difficulty quota, interleaving lessons so the kept set stays spread across them. */
export function selectByQuota(verified: SeedQuestion[], quota: Record<Difficulty, number>): SeedQuestion[] {
  const selected: SeedQuestion[] = [];
  for (const difficulty of DIFFICULTIES) {
    const pool = verified.filter((question) => question.difficulty === difficulty);
    const byLesson = new Map<number, SeedQuestion[]>();
    for (const question of pool) byLesson.set(question.lessonIndex, [...(byLesson.get(question.lessonIndex) ?? []), question]);
    const queues = [...byLesson.entries()].sort(([a], [b]) => a - b).map(([, list]) => list);
    const picked: SeedQuestion[] = [];
    while (picked.length < quota[difficulty] && queues.some((queue) => queue.length > 0)) {
      for (const queue of queues) {
        const next = queue.shift();
        if (next && picked.length < quota[difficulty]) picked.push(next);
      }
    }
    selected.push(...picked);
  }
  return selected;
}

/** Haiku almost never puts the answer last; swap it into a rotating slot so the correct index is balanced across the set. */
export function balanceCorrectIndex(questions: SeedQuestion[]): SeedQuestion[] {
  return questions.map((question, position) => {
    const target = position % 4;
    const choices = [...question.choices];
    [choices[question.correctIndex], choices[target]] = [choices[target], choices[question.correctIndex]];
    return { ...question, choices, correctIndex: target };
  });
}

export function docIdFor(moduleId: string, stem: string): string {
  return `ai-${moduleId}-${createHash('sha1').update(stem).digest('hex').slice(0, 12)}`;
}

export interface BankDoc<Stamp> {
  subject: string;
  gradeLevel: number;
  curriculumVersion: string;
  curriculumVersionSetId: string;
  curriculumTrack: string;
  topic: string;
  subtopic: string;
  competencyCode: string;
  competencyText: string;
  difficulty: Difficulty;
  questionType: string;
  stem: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
  tags: string[];
  language: string;
  isActive: boolean;
  sourceType: string;
  sourceReference: string;
  reviewedBy: string;
  createdBy: string;
  reviewedAt: Stamp;
  createdAt: Stamp;
  updatedAt: Stamp;
}

// Firestore's FieldValue.serverTimestamp() is injected at write time; tests pass a plain stand-in.
export function toBankDoc<Stamp>(question: SeedQuestion, subjectId: string, serverTimestamp: Stamp): BankDoc<Stamp> {
  const choices = question.choices.map((choice) => choice.trim());
  return {
    subject: subjectId,
    gradeLevel: 11,
    // The Grade 11 profile default (functions/src/config/diagnosticPolicies.ts); quiz battle normalizes it to
    // "legacy" and drops bank questions whose version differs from the player's.
    curriculumVersion: 'legacy',
    curriculumVersionSetId: 'g11-core-genmath-legacy-detail-strengthened-structure',
    curriculumTrack: 'core',
    topic: question.moduleId,
    subtopic: question.lessonTitle,
    competencyCode: `${question.moduleId}-L${question.lessonIndex + 1}`,
    competencyText: question.lessonTitle,
    difficulty: question.difficulty,
    questionType: 'multiple_choice',
    stem: question.stem.trim(),
    choices,
    correctAnswer: choices[question.correctIndex],
    explanation: question.explanation,
    hint: question.hint,
    tags: ['ai-seeded', question.moduleId],
    language: 'en',
    isActive: true,
    sourceType: 'reviewed-ai',
    sourceReference: SOURCE_REFERENCE,
    reviewedBy: 'claude-haiku-verifier',
    createdBy: 'seed-script',
    reviewedAt: serverTimestamp,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  };
}

const seedQuestionSchema = z.object({
  moduleId: z.string(),
  lessonIndex: z.number().int().min(0),
  lessonTitle: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  stem: z.string(),
  choices: z.array(z.string()),
  correctIndex: z.number().int(),
  explanation: z.string(),
  hint: z.string(),
});

const seedFileSchema = z.object({
  generatedAt: z.string(),
  modules: z.array(z.object({ moduleId: z.string(), subjectId: z.string(), questions: z.array(seedQuestionSchema) })),
});
export type SeedFile = z.infer<typeof seedFileSchema>;

const generatedSchema = z.object({
  questions: z.array(z.object({
    work: z.string(),
    prompt: z.string(),
    choices: z.array(z.string()),
    correctOptionIndex: z.number().int(),
    difficulty: z.enum(DIFFICULTIES),
    explanation: z.string(),
    hint: z.string(),
  })),
});
const verifiedSchema = z.object({
  answers: z.array(z.object({ number: z.number().int(), work: z.string(), correctIndices: z.array(z.number().int()), issues: z.string() })),
});

const GENERATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          work: { type: 'string' },
          prompt: { type: 'string' },
          choices: { type: 'array', items: { type: 'string' } },
          correctOptionIndex: { type: 'integer' },
          difficulty: { type: 'string', enum: [...DIFFICULTIES] },
          explanation: { type: 'string' },
          hint: { type: 'string' },
        },
        required: ['work', 'prompt', 'choices', 'correctOptionIndex', 'difficulty', 'explanation', 'hint'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

const VERIFY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answers: {
      type: 'array',
      items: {
        type: 'object',
        properties: { number: { type: 'integer' }, work: { type: 'string' }, correctIndices: { type: 'array', items: { type: 'integer' } }, issues: { type: 'string' } },
        required: ['number', 'work', 'correctIndices', 'issues'],
        additionalProperties: false,
      },
    },
  },
  required: ['answers'],
  additionalProperties: false,
};

export interface TokenUsage {
  input: number;
  output: number;
}

type JsonSchema = typeof GENERATION_JSON_SCHEMA | typeof VERIFY_JSON_SCHEMA;

interface AiRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: 'user'; content: string }[];
  thinking: { type: 'disabled' };
  output_config: { format: { type: 'json_schema'; schema: JsonSchema } };
}

interface AiClient {
  messages: {
    create(request: AiRequest): Promise<{ content: { type: string; text?: string }[]; usage: { input_tokens: number; output_tokens: number } }>;
  };
}

async function askJson<T>(client: AiClient, usage: TokenUsage, system: string, prompt: string, schema: JsonSchema, parser: z.ZodType<T>, maxTokens: number): Promise<T> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    thinking: { type: 'disabled' },
    output_config: { format: { type: 'json_schema', schema } },
  });
  usage.input += response.usage.input_tokens;
  usage.output += response.usage.output_tokens;
  const text = response.content.map((block) => (block.type === 'text' ? block.text ?? '' : '')).join('');
  return parser.parse(JSON.parse(text));
}

const GENERATION_SYSTEM = 'You write Grade 11 multiple-choice math battle questions for Filipino Senior High School STEM students (DepEd Strengthened SHS curriculum). Every question must have exactly one unambiguously correct choice.';

function generationPrompt(module: ModuleSpec, lessonTitle: string, counts: Record<Difficulty, number>): string {
  return [
    `Subject: ${module.subjectId === 'gen-math' ? 'General Mathematics' : 'Statistics and Probability'}. Module: ${module.title}. Lesson: ${lessonTitle}.`,
    `Write exactly ${counts.easy} easy, ${counts.medium} medium and ${counts.hard} hard questions about this lesson only (set the difficulty field accordingly).`,
    'Rules: the stem is short and answerable in 30 seconds without a calculator; plain text math only, no LaTeX (write x^2, sqrt(x), f(x), a/b); peso amounts as PHP; use Filipino contexts (jeepney fares, sari-sari store, peso) sparingly where natural.',
    'First compute the answer in the "work" field, then write the choices from it. Exactly 4 distinct choices and EXACTLY ONE correct: the computed value must appear among the choices, and correctOptionIndex must point at it.',
    'Distractors come from realistic mistakes but must be numerically and algebraically NOT equivalent to the answer or to each other: never include an unsimplified or rearranged form of the correct answer. Never use "all of the above" or "none of the above".',
    'Hard means multi-step but still solvable in 30 seconds. Give a 1-2 sentence explanation of the right answer and a short hint that does not reveal it.',
  ].join('\n');
}

async function generateForModule(client: AiClient, usage: TokenUsage, module: ModuleSpec): Promise<SeedQuestion[]> {
  const plan = planLessonRequests(module.lessons.length, GENERATE_QUOTA);
  const perLesson = await Promise.all(plan.map(async (counts, lessonIndex) => {
    const total = counts.easy + counts.medium + counts.hard;
    if (total === 0) return [];
    const lessonTitle = module.lessons[lessonIndex];
    const generated = await askJson(client, usage, GENERATION_SYSTEM, generationPrompt(module, lessonTitle, counts), GENERATION_JSON_SCHEMA, generatedSchema, Math.max(2000, total * 600));
    return generated.questions.map((entry): SeedQuestion => ({
      moduleId: module.moduleId,
      lessonIndex,
      lessonTitle,
      difficulty: entry.difficulty,
      stem: entry.prompt.trim(),
      choices: entry.choices.map((choice) => choice.trim()),
      correctIndex: entry.correctOptionIndex,
      explanation: entry.explanation.trim(),
      hint: entry.hint.trim(),
    }));
  }));
  return perLesson.flat();
}

/** A question survives a verifier pass only when the checker found exactly the generated key correct (none or 2+ correct rejects). */
export function isSoleCorrect(correctIndices: number[], expectedIndex: number): boolean {
  return correctIndices.length === 1 && correctIndices[0] === expectedIndex;
}

async function verifyBatch(client: AiClient, usage: TokenUsage, module: ModuleSpec, batch: SeedQuestion[]): Promise<SeedQuestion[]> {
  const listing = batch
    .map((question, index) => `${index + 1}. ${question.stem}\n${question.choices.map((choice, choiceIndex) => `   ${choiceIndex}) ${choice}`).join('\n')}`)
    .join('\n');
  const { answers } = await askJson(
    client,
    usage,
    'You are a strict, independent math checker. You never trust a key; you work every question out yourself.',
    [
      `Module: ${module.title}. For each numbered question: first write your full step-by-step solution in "work", then evaluate EVERY choice against your result, including algebraically equivalent forms (a choice that simplifies to the same value or expression as another is also correct).`,
      'Return in "correctIndices" the zero-based indices (0-3) of ALL choices that are correct (empty if none), and in "issues" any ambiguity, error or equivalent-choice problem (empty string if none).',
      '',
      listing,
    ].join('\n'),
    VERIFY_JSON_SCHEMA,
    verifiedSchema,
    Math.max(1200, batch.length * 900),
  );
  const answerByNumber = new Map(answers.map((answer) => [answer.number, answer.correctIndices]));
  return batch.filter((question, index) => isSoleCorrect(answerByNumber.get(index + 1) ?? [], question.correctIndex));
}

/** Two independent passes (different batch composition and order); a question is kept only if both agree with the key. */
async function verifyAll(client: AiClient, usage: TokenUsage, module: ModuleSpec, questions: SeedQuestion[]): Promise<SeedQuestion[]> {
  const runPass = async (ordered: SeedQuestion[]): Promise<Set<SeedQuestion>> => {
    const batches: SeedQuestion[][] = [];
    for (let start = 0; start < ordered.length; start += VERIFY_BATCH_SIZE) batches.push(ordered.slice(start, start + VERIFY_BATCH_SIZE));
    return new Set((await Promise.all(batches.map((batch) => verifyBatch(client, usage, module, batch)))).flat());
  };
  const [forward, backward] = await Promise.all([runPass(questions), runPass([...questions].reverse())]);
  return questions.filter((question) => forward.has(question) && backward.has(question));
}

export function estimateCostUsd(usage: TokenUsage): number {
  return (usage.input * PRICE_PER_MTOK.input + usage.output * PRICE_PER_MTOK.output) / 1_000_000;
}

function loadEnvFile(): void {
  const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

async function createClient(): Promise<AiClient> {
  loadEnvFile();
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set (environment or .env.local).');
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  const { default: Anthropic }: typeof import('../functions/node_modules/@anthropic-ai/sdk/index.js') = requireFunctions('@anthropic-ai/sdk');
  return new Anthropic({
    apiKey,
    maxRetries: 2,
    defaultHeaders: workspaceId ? { 'anthropic-workspace-id': workspaceId } : undefined,
  });
}

function argValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function dryRun(selectedModule: string | undefined): Promise<void> {
  const modules = parseModuleLessons(readFileSync(SUBJECTS_PATH, 'utf8')).filter((module) => !selectedModule || module.moduleId === selectedModule);
  if (modules.length === 0) throw new Error(`No module matches --module ${selectedModule}`);
  const staticStems = parseStaticBankStems(readFileSync(STATIC_BANK_PATH, 'utf8'));
  const client = await createClient();
  const usage: TokenUsage = { input: 0, output: 0 };
  const output: SeedFile = { generatedAt: new Date().toISOString(), modules: [] };

  for (const module of modules) {
    const generated = await generateForModule(client, usage, module);
    const structural = filterStructurally(generated, staticStems);
    const verified = await verifyAll(client, usage, module, structural.kept);
    const finalQuestions = balanceCorrectIndex(selectByQuota(verified, KEEP_QUOTA));
    output.modules.push({ moduleId: module.moduleId, subjectId: module.subjectId, questions: finalQuestions });
    const byDifficulty = DIFFICULTIES.map((difficulty) => `${difficulty}=${finalQuestions.filter((question) => question.difficulty === difficulty).length}`).join(' ');
    const dropRate = structural.kept.length ? Math.round((1 - verified.length / structural.kept.length) * 100) : 0;
    console.log(
      `${module.moduleId} generated=${generated.length} structural_ok=${structural.kept.length} verified=${verified.length} (verify_drop=${dropRate}%)`
      + ` kept=${finalQuestions.length} (${byDifficulty}) structural_drops=${JSON.stringify(Object.fromEntries(structural.dropped))}`,
    );
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`tokens input=${usage.input} output=${usage.output} est_cost_usd=${estimateCostUsd(usage).toFixed(3)} -> ${OUTPUT_PATH}`);
}

async function write(selectedModule: string | undefined): Promise<void> {
  if (!existsSync(OUTPUT_PATH)) throw new Error(`${OUTPUT_PATH} not found; run a dry run first.`);
  const seed = seedFileSchema.parse(JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')));
  const { initializeApp, cert }: typeof import('../functions/node_modules/firebase-admin/lib/app/index.js') = requireFunctions('firebase-admin/app');
  const { getFirestore, FieldValue }: typeof import('../functions/node_modules/firebase-admin/lib/firestore/index.js') = requireFunctions('firebase-admin/firestore');
  initializeApp({
    credential: cert(process.env.FIREBASE_SERVICE_ACCOUNT_FILE
      ?? fileURLToPath(new URL('../.secrets/firebase-service-account.json', import.meta.url))),
  });
  const db = getFirestore();
  const serverTimestamp = FieldValue.serverTimestamp();

  const entries = seed.modules
    .filter((module) => !selectedModule || module.moduleId === selectedModule)
    .flatMap((module) => module.questions.map((question) => ({ id: docIdFor(module.moduleId, question.stem), doc: toBankDoc(question, module.subjectId, serverTimestamp) })));
  for (let start = 0; start < entries.length; start += WRITE_BATCH_SIZE) {
    const batch = db.batch();
    for (const entry of entries.slice(start, start + WRITE_BATCH_SIZE)) batch.set(db.collection(COLLECTION).doc(entry.id), entry.doc, { merge: true });
    await batch.commit();
  }
  console.log(`upserted ${entries.length} documents into ${COLLECTION}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/seed-quiz-battle-bank.ts [--dry-run | --write] [--module gm-1]\nDefault: dry run (Claude generation + verification, JSON output only).');
    return;
  }
  const selectedModule = argValue(args, '--module');
  if (args.includes('--write')) await write(selectedModule);
  else await dryRun(selectedModule);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: Error) => {
    console.error('[seed-quiz-battle-bank] failed:', error.message);
    process.exit(1);
  });
}
