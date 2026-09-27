import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { DocumentData, DocumentReference, DocumentSnapshot } from 'firebase/firestore';

// test-setup.ts already stubs every firebase/firestore entry point this service
// uses, so this suite only reconfigures those spies. The service is imported
// dynamically below, after the stubs are installed.
// SAFETY: production code treats the Firestore document handle as opaque.
vi.spyOn(firestore, 'doc').mockImplementation(
  () => ({ id: 'subjects' }) as DocumentReference<DocumentData>,
);

/** A stored `platformConfig/subjects` document the service can read. */
function snapshotWith(subjects: DocumentData | null) {
  // SAFETY: opaque snapshot handle; the service reads only exists() and data().
  return {
    exists: () => subjects !== null,
    data: () => subjects ?? {},
  } as DocumentSnapshot<DocumentData>;
}

const { toggleSubjectAvailability, updateSubjectPdfPath } = await import('../platformConfigService');

/** Payload of the most recent setDoc call; fails loudly when nothing was written. */
function lastWrittenPayload() {
  const call = vi.mocked(setDoc).mock.calls.at(-1);
  if (!call) throw new Error('setDoc was never called');
  return call[1];
}

describe('platformConfigService subject mutators', () => {
  beforeEach(() => {
    vi.mocked(setDoc).mockReset().mockResolvedValue(undefined);
    vi.mocked(getDoc).mockReset();
  });

  it('preserves the stored pdfPath when toggling availability', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      snapshotWith({ subjects: { 'gen-math': { available: true, pdfPath: 'pdfs/gen.pdf' } } }),
    );

    await toggleSubjectAvailability('gen-math', false, 'admin-1');

    expect(lastWrittenPayload()).toMatchObject({
      subjects: { 'gen-math': { available: false, pdfPath: 'pdfs/gen.pdf' } },
    });
  });

  it('preserves the stored availability when updating the pdf path', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      snapshotWith({ subjects: { 'gen-math': { available: false, pdfPath: null } } }),
    );

    await updateSubjectPdfPath('gen-math', 'pdfs/new.pdf', 'admin-1');

    expect(lastWrittenPayload()).toMatchObject({
      subjects: { 'gen-math': { available: false, pdfPath: 'pdfs/new.pdf' } },
    });
  });

  it('creates a new subject entry when the config document is missing', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshotWith(null));

    await toggleSubjectAvailability('stats-prob', false, 'admin-1');

    expect(lastWrittenPayload()).toMatchObject({
      subjects: { 'stats-prob': { available: false, pdfPath: null } },
    });
  });

  it('creates a new subject entry when the subject is absent from an existing document', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      snapshotWith({ subjects: { 'gen-math': { available: true, pdfPath: null } } }),
    );

    await toggleSubjectAvailability('finite-math', false, 'admin-1');

    expect(lastWrittenPayload()).toMatchObject({
      subjects: {
        'finite-math': { available: false, pdfPath: null },
        'gen-math': { available: true },
      },
    });
  });

  it('defaults availability to true when the stored value is malformed', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      snapshotWith({ subjects: { 'gen-math': { available: 'yes', pdfPath: null } } }),
    );

    await updateSubjectPdfPath('gen-math', 'pdfs/x.pdf', 'admin-1');

    expect(lastWrittenPayload()).toMatchObject({
      subjects: { 'gen-math': { available: true, pdfPath: 'pdfs/x.pdf' } },
    });
  });

  it('defaults pdfPath to null when the stored value is malformed', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      snapshotWith({ subjects: { 'gen-math': { available: false, pdfPath: 42 } } }),
    );

    await toggleSubjectAvailability('gen-math', false, 'admin-1');

    expect(lastWrittenPayload()).toMatchObject({
      subjects: { 'gen-math': { available: false, pdfPath: null } },
    });
  });

  it('clears the pdf path when explicitly set to null', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      snapshotWith({ subjects: { 'gen-math': { available: true, pdfPath: 'pdfs/old.pdf' } } }),
    );

    await updateSubjectPdfPath('gen-math', null, 'admin-1');

    expect(lastWrittenPayload()).toMatchObject({
      subjects: { 'gen-math': { available: true, pdfPath: null } },
    });
  });

  it('records the admin id and a timestamp on every write', async () => {
    vi.mocked(getDoc).mockResolvedValue(snapshotWith(null));

    await toggleSubjectAvailability('gen-math', true, 'admin-42');

    expect(lastWrittenPayload()).toHaveProperty('updatedBy', 'admin-42');
    expect(lastWrittenPayload()).toHaveProperty('updatedAt');
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.anything(), { merge: true });
  });

  it('propagates Firestore failures instead of swallowing them', async () => {
    vi.mocked(getDoc).mockRejectedValue(new Error('permission denied'));

    await expect(toggleSubjectAvailability('gen-math', true, 'admin-1')).rejects.toThrow(
      'permission denied',
    );
  });
});
