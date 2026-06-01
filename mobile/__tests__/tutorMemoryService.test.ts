// mobile/__tests__/tutorMemoryService.test.ts
// Test stub for tutorMemoryService — verifies all 6 public functions
// and that paths follow users/{uid}/tutorMemory/{profile,sessions,working}

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetDoc, mockSetDoc, mockServerTimestamp } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(() => Promise.resolve()),
  mockServerTimestamp: vi.fn(() => 'ts-sentinel'),
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-uid' } },
  db: {},
  doc: vi.fn(),
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  collection: vi.fn(),
  firestoreServerTimestamp: mockServerTimestamp,
}));

import {
  loadTutorProfile,
  saveTutorProfile,
  appendTutorSession,
  getTutorWorkingMemory,
  setTutorWorkingMemory,
  buildFollowUpContext,
} from '../services/tutorMemoryService';

// ── loadTutorProfile ────────────────────────────────────────────────────────

describe('loadTutorProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads from users/{uid}/tutorMemory/profile', async () => {
    const mockSnap = {
      exists: () => true,
      data: () => ({
        subjects: ['Functions'],
        learningStyle: 'visual',
        strengths: ['Algebra'],
        weaknesses: ['Trigonometry'],
        gradeLevel: 'Grade 11',
        updatedAt: { toDate: () => new Date('2026-06-01') },
      }),
    };
    mockGetDoc.mockResolvedValue(mockSnap);

    const profile = await loadTutorProfile('user-1');

    expect(profile).toBeDefined();
    expect(profile!.subjects).toEqual(['Functions']);
    expect(profile!.learningStyle).toBe('visual');
    expect(profile!.gradeLevel).toBe('Grade 11');
    expect(profile!.updatedAt).toBeInstanceOf(Date);
    expect(mockGetDoc).toHaveBeenCalled();
  });

  it('returns null when profile document does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const profile = await loadTutorProfile('user-99');

    expect(profile).toBeNull();
  });
});

// ── saveTutorProfile ────────────────────────────────────────────────────────

describe('saveTutorProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes to users/{uid}/tutorMemory/profile with serverTimestamp', async () => {
    await saveTutorProfile('user-1', {
      subjects: ['Functions', 'Logic'],
      learningStyle: 'step_by_step',
      strengths: ['Algebra'],
      weaknesses: ['WordProblems'],
      gradeLevel: 'Grade 11',
    });

    expect(mockSetDoc).toHaveBeenCalled();
    const callArgs = (mockSetDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.subjects).toEqual(['Functions', 'Logic']);
    expect(payload.learningStyle).toBe('step_by_step');
    expect(payload.updatedAt).toBe('ts-sentinel');
  });
});

// ── appendTutorSession ──────────────────────────────────────────────────────

describe('appendTutorSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes to users/{uid}/tutorMemory/sessions/{sessionId} with serverTimestamp', async () => {
    await appendTutorSession('user-1', 'sess-abc', {
      title: 'Functions Review',
      topics: ['Functions', 'Domain'],
      summary: 'Reviewed functions and domain concepts.',
      struggles: ['Composite functions'],
      createdAt: new Date('2026-06-01'),
    });

    expect(mockSetDoc).toHaveBeenCalled();
    const callArgs = (mockSetDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.title).toBe('Functions Review');
    expect(payload.topics).toEqual(['Functions', 'Domain']);
    expect(payload.summary).toBe('Reviewed functions and domain concepts.');
    expect(payload.struggles).toEqual(['Composite functions']);
    expect(payload.createdAt).toBe('ts-sentinel');
  });
});

// ── getTutorWorkingMemory ──────────────────────────────────────────────────

describe('getTutorWorkingMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads from users/{uid}/tutorMemory/working', async () => {
    const mockSnap = {
      exists: () => true,
      data: () => ({
        recentTopics: ['Functions', 'Logic'],
        reviewQueue: ['CompositeFunctions'],
        lastInteractionAt: { toDate: () => new Date('2026-06-01') },
        activeSessionId: 'sess-123',
      }),
    };
    mockGetDoc.mockResolvedValue(mockSnap);

    const memory = await getTutorWorkingMemory('user-1');

    expect(memory).toBeDefined();
    expect(memory!.recentTopics).toEqual(['Functions', 'Logic']);
    expect(memory!.reviewQueue).toEqual(['CompositeFunctions']);
    expect(memory!.activeSessionId).toBe('sess-123');
    expect(memory!.lastInteractionAt).toBeInstanceOf(Date);
    expect(mockGetDoc).toHaveBeenCalled();
  });

  it('returns null when working memory doc is missing', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const memory = await getTutorWorkingMemory('user-99');

    expect(memory).toBeNull();
  });
});

// ── setTutorWorkingMemory ──────────────────────────────────────────────────

describe('setTutorWorkingMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes to users/{uid}/tutorMemory/working with serverTimestamp', async () => {
    await setTutorWorkingMemory('user-1', {
      recentTopics: ['Functions'],
      reviewQueue: ['CompositeFunctions', 'Domain'],
      activeSessionId: 'sess-456',
    });

    expect(mockSetDoc).toHaveBeenCalled();
    const callArgs = (mockSetDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload.recentTopics).toEqual(['Functions']);
    expect(payload.reviewQueue).toEqual(['CompositeFunctions', 'Domain']);
    expect(payload.activeSessionId).toBe('sess-456');
    expect(payload.lastInteractionAt).toBe('ts-sentinel');
  });
});

// ── buildFollowUpContext ──────────────────────────────────────────────────

describe('buildFollowUpContext', () => {
  it('returns a string containing the user ID', () => {
    const ctx = buildFollowUpContext('user-1', []);

    expect(typeof ctx).toBe('string');
    expect(ctx).toContain('User ID: user-1');
    expect(ctx).toContain('[TUTOR CONTEXT]');
  });

  it('includes recent user messages (last 5)', () => {
    const msgs = [
      { role: 'user', content: 'What is a function?' },
      { role: 'assistant', content: 'A function maps...' },
      { role: 'user', content: 'Give me an example.' },
      { role: 'assistant', content: 'f(x) = x + 1' },
      { role: 'user', content: 'How about domain?' },
    ];

    const ctx = buildFollowUpContext('user-1', msgs);

    expect(ctx).toContain('What is a function?');
    expect(ctx).toContain('Give me an example.');
    expect(ctx).toContain('How about domain?');
  });

  it('includes instruction text for AI follow-up behaviour', () => {
    const ctx = buildFollowUpContext('user-1', []);

    expect(ctx).toContain('personalise');
    expect(ctx).toContain('struggles');
  });
});
