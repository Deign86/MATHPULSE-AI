/**
 * Contract C1 end-to-end on the client side: the SSE body recorded from the real backend route
 * (src/services/__tests__/fixtures/ragLessonStream.sse, also asserted by
 * backend/tests/test_regression_rag_lesson.py) must parse through fetchRagLessonStream even when the
 * network splits frames at arbitrary byte offsets. Seam: global fetch only.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, readFastApiErrorDetail } from '../../services/apiUtils';
import { fetchRagLessonStream, type RagLessonStage } from '../../services/lessonService';

const fixtureText = readFileSync(resolve(process.cwd(), 'src/services/__tests__/fixtures/ragLessonStream.sse'), 'utf8');
const lessonRequest = { topic: 'Rational Functions', subject: 'General Mathematics', quarter: 1, lessonId: 'gm-q1-rational' };
const ODD_CHUNK_SIZES = [1, 7, 3, 64, 2, 13, 5, 251];

function fixtureLessonFrame(): string {
  const frame = fixtureText.split(/\n\n/).find((block) => block.startsWith('event: lesson'));
  if (!frame) throw new Error('fixture has no lesson frame');
  return frame.slice(frame.indexOf('data:') + 'data:'.length).trim();
}

/** Body stream that hands out the bytes in odd-sized slices so frames and lines split mid-way. */
function chunkedSseResponse(sseText: string, sizes: number[] = ODD_CHUNK_SIZES): Response {
  const bytes = new TextEncoder().encode(sseText);
  const slices: Uint8Array[] = [];
  for (let offset = 0, turn = 0; offset < bytes.length; turn += 1) {
    const size = sizes[turn % sizes.length];
    slices.push(bytes.slice(offset, offset + size));
    offset += size;
  }
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = slices.shift();
      if (next) controller.enqueue(next);
      else controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}

async function streamLesson(sseText: string, sizes?: number[]) {
  vi.stubGlobal('fetch', vi.fn(async () => chunkedSseResponse(sseText, sizes)));
  const stages: RagLessonStage[] = [];
  const lesson = await fetchRagLessonStream(lessonRequest, { onStage: (stage) => stages.push(stage) });
  return { lesson, stages };
}

async function rejectionOf(work: Promise<unknown>): Promise<ApiError> {
  try {
    await work;
  } catch (err) {
    if (err instanceof ApiError) return err;
    throw err;
  }
  throw new Error('expected the lesson stream to reject');
}

describe('contract C1 lesson stream (recorded fixture)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['odd-sized chunks', ODD_CHUNK_SIZES],
    ['one byte at a time', [1]],
    ['a single chunk', [1_000_000]],
  ])('reports stages in order and returns the lesson frame: %s', async (_label, sizes) => {
    const { lesson, stages } = await streamLesson(fixtureText, sizes);

    expect(stages).toEqual(['retrieving', 'generating', 'thinking', 'generating', 'verifying', 'finalizing']);
    expect(lesson).toEqual(JSON.parse(fixtureLessonFrame()));
    expect(lesson.sections.map((section) => section.type)).toEqual([
      'introduction', 'key_concepts', 'video', 'worked_examples', 'important_notes', 'try_it_yourself', 'summary',
    ]);
    expect(Object.keys(lesson).sort()).toEqual(expect.arrayContaining([
      'activeModel', 'needsReview', 'retrievalBand', 'retrievalConfidence', 'sections', 'sources',
    ]));
  });

  it('parses the same fixture with CRLF line endings and interleaved pings', async () => {
    const withPings = fixtureText.replace(/event: stage\ndata: \{"stage": "verifying"\}\n\n/, ': ping\n\n$&: ping\n\n');
    const { lesson, stages } = await streamLesson(withPings.replace(/\n/g, '\r\n'));

    expect(stages).toEqual(['retrieving', 'generating', 'thinking', 'generating', 'verifying', 'finalizing']);
    expect(lesson).toEqual(JSON.parse(fixtureLessonFrame()));
  });

  it('maps `event: error` to the same ApiError detail as the plain HTTP error path', async () => {
    const detail = {
      error: 'no_curriculum_context',
      message: 'No curriculum content found for this lesson. Please ensure the PDF has been ingested.',
    };
    const errorStream = `event: stage\ndata: {"stage": "retrieving"}\n\n: ping\n\nevent: error\ndata: ${JSON.stringify({ status: 404, detail })}\n\n`;
    vi.stubGlobal('fetch', vi.fn(async () => chunkedSseResponse(errorStream)));
    const streamError = await rejectionOf(fetchRagLessonStream(lessonRequest));

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail }), { status: 404, statusText: 'Not Found' })));
    const httpError = await rejectionOf(fetchRagLessonStream(lessonRequest));

    expect(streamError.status).toBe(404);
    expect(streamError.status).toBe(httpError.status);
    expect(readFastApiErrorDetail(streamError)).toEqual(detail);
    expect(readFastApiErrorDetail(streamError)).toEqual(readFastApiErrorDetail(httpError));
    expect(streamError.retryable).toBe(false);
  });

  it('treats a stream that ends with only pings as a retryable 502', async () => {
    const pingsOnly = 'event: stage\ndata: {"stage": "retrieving"}\n\n: ping\n\n: ping\n\n';
    const stages: RagLessonStage[] = [];
    vi.stubGlobal('fetch', vi.fn(async () => chunkedSseResponse(pingsOnly)));

    const streamError = await rejectionOf(fetchRagLessonStream(lessonRequest, { onStage: (stage) => stages.push(stage) }));

    expect(stages).toEqual(['retrieving']);
    expect(streamError.status).toBe(502);
    expect(streamError.retryable).toBe(true);
  });
});
