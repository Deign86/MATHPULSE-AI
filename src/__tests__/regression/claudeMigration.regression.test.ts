/** @vitest-environment jsdom */

/**
 * Regression guards for the Claude migration, frontend side: the AI routes live under /api/ai, the admin
 * defaults name a Claude model and its host without a sampling knob, and the retired provider's name is
 * gone from every shipped source file. Seams: global fetch (the network contract) and the source tree.
 * No module-level mocking.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchModulePreview, fetchStudyTips } from '../../services/aiInsightsService';
import { apiService } from '../../services/apiService';
import { DEFAULT_ADMIN_SYSTEM_CONFIG } from '../../types/settings';

// The character class keeps the retired provider's name out of this file's own text.
const RETIRED_NAME = /deep[s]eek/i;

function jsonResponse(serializedBody: string, status = 200): Response {
  return new Response(serializedBody, { status, headers: { 'Content-Type': 'application/json' } });
}

// ─── 1. AI calls go to /api/ai/* ─────────────────────────────────────────────────────────────────

describe('AI routes live under /api/ai', () => {
  const fetchStub = vi.fn<typeof fetch>();

  /** "METHOD /path" for each request, whatever origin VITE_API_URL points at. */
  function sentRoutes(): string[] {
    return fetchStub.mock.calls.map(([input, init]) => {
      const { pathname } = new URL(String(input), 'http://localhost');
      return `${init?.method ?? 'GET'} ${pathname}`;
    });
  }

  beforeEach(() => {
    fetchStub.mockReset();
    vi.stubGlobal('fetch', fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchModulePreview posts to /api/ai/module-preview', async () => {
    const reply = { ai_overview: 'Preview from DepEd modules', rag_confidence: 'high', generated: true };
    fetchStub.mockImplementation(async () => jsonResponse(JSON.stringify(reply)));

    const preview = await fetchModulePreview('gm-q1-functions', 'Functions', 'General Mathematics', 1);

    expect(preview).toEqual(reply);
    expect(sentRoutes()).toEqual(['POST /api/ai/module-preview']);
  });

  it('fetchStudyTips posts to /api/ai/study-tips', async () => {
    const reply = { tips: 'Practice one worked example a day.', generated: true, confidence_score: 0.4 };
    fetchStub.mockImplementation(async () => jsonResponse(JSON.stringify(reply)));

    const tips = await fetchStudyTips('student-1', 'functions', 'Functions', 'General Mathematics', 0.4);

    expect(tips).toEqual(reply);
    expect(sentRoutes()).toEqual(['POST /api/ai/study-tips']);
  });

  it('apiService.detectWeakness posts to /api/ai/weakness-detection', async () => {
    const reply = {
      flagged_topics: ['functions'],
      confidence: { functions: 0.8 },
      reasoning_summary: 'Missed both function questions.',
      source: 'ai',
    };
    fetchStub.mockImplementation(async () => jsonResponse(JSON.stringify(reply)));

    const detection = await apiService.detectWeakness({
      student_id: 'student-1',
      questions: [
        { question_id: 'q1', topic_id: 'functions', quarter: 1, competency_code: 'GM-F1', is_correct: false },
        { question_id: 'q2', topic_id: 'functions', quarter: 1, competency_code: 'GM-F2', is_correct: false },
      ],
    });

    expect(detection).toEqual(reply);
    expect(sentRoutes()).toEqual(['POST /api/ai/weakness-detection']);
  });
});

// ─── 2. Admin AI defaults ────────────────────────────────────────────────────────────────────────

describe('admin AI defaults', () => {
  const { aiConfig } = DEFAULT_ADMIN_SYSTEM_CONFIG;

  it('name a Claude model served from api.anthropic.com', () => {
    expect(aiConfig.modelName).toMatch(/^claude-/);
    expect(new URL(aiConfig.endpoint).hostname).toBe('api.anthropic.com');
  });

  it('configure no sampling parameter, which Claude rejects', () => {
    const samplingKeys = ['temperature', 'top_p', 'topP', 'top_k', 'topK', 'repetition_penalty', 'repetitionPenalty'];

    expect(Object.keys(aiConfig).filter((key) => samplingKeys.includes(key))).toEqual([]);
  });
});

// ─── 3. The retired provider's name is gone from shipped source ──────────────────────────────────

const REPO_ROOT = process.cwd();
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.pdf', '.zip', '.gz', '.wasm',
]);

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (!entry.isDirectory()) return [entryPath];
    return entry.name === 'node_modules' ? [] : filesUnder(entryPath);
  });
}

/** One "path:line: text" entry per line that names the retired provider, plus one if the path does. */
function retiredNameHits(filePath: string): string[] {
  const label = relative(REPO_ROOT, filePath).split(sep).join('/');
  const hits = RETIRED_NAME.test(label) ? [`${label}: the file path itself`] : [];
  if (BINARY_EXTENSIONS.has(extname(filePath).toLowerCase())) return hits;

  const content = readFileSync(filePath);
  if (content.subarray(0, 8192).includes(0)) return hits;
  content
    .toString('utf8')
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (RETIRED_NAME.test(line)) hits.push(`${label}:${index + 1}: ${line.trim().slice(0, 100)}`);
    });
  return hits;
}

function expectNoRetiredName(hits: string[], where: string): void {
  const shown = hits.slice(0, 40).join('\n  ');
  const more = hits.length > 40 ? `\n  ... and ${hits.length - 40} more` : '';
  expect(hits, `The retired provider's name still appears in ${where}:\n  ${shown}${more}`).toEqual([]);
}

describe('retired provider name', () => {
  it('scanner flags text lines and file names but skips binary files', () => {
    const retired = 'deep' + 'seek';
    const sandbox = mkdtempSync(join(tmpdir(), 'name-guard-'));
    try {
      writeFileSync(join(sandbox, 'notes.md'), `intro\nreplaced ${retired} calls\n`);
      writeFileSync(join(sandbox, `${retired}Service.ts`), 'export {};\n');
      writeFileSync(join(sandbox, 'blob.bin'), Buffer.concat([Buffer.from([0]), Buffer.from(retired)]));

      const hits = filesUnder(sandbox).flatMap(retiredNameHits);

      expect(hits).toHaveLength(2);
      expect(hits.some((hit) => /notes\.md:2: /.test(hit))).toBe(true);
      expect(hits.some((hit) => hit.endsWith('the file path itself'))).toBe(true);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it.each(['src', 'functions/src', 'public'])('is absent from %s/', (directory) => {
    expectNoRetiredName(filesUnder(resolve(REPO_ROOT, directory)).flatMap(retiredNameHits), `${directory}/`);
  });

  it('is absent from index.html', () => {
    expectNoRetiredName(retiredNameHits(resolve(REPO_ROOT, 'index.html')), 'index.html');
  });
});
