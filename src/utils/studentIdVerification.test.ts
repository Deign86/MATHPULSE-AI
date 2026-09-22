import { describe, expect, it } from 'vitest';
import {
  STUDENT_ID_QR_OPTIONS,
  buildStudentIdVerificationPayload,
  resolveStudentIdVerificationRoute,
} from './studentIdVerification';

describe('student ID verification contract', () => {
  it('builds the exact QR payload from host and UID only', () => {
    const payload = buildStudentIdVerificationPayload(
      'mathpulse-ai-2026.web.app',
      'uid-fixture-169',
    );

    expect(payload).toEqual({
      kind: 'ready',
      url: 'https://mathpulse-ai-2026.web.app/verify/uid-fixture-169?src=id_card',
    });
    expect(STUDENT_ID_QR_OPTIONS).toEqual({
      level: 'M',
      marginSize: 4,
      size: 192,
      title: 'Verify MathPulse student ID',
    });
  });

  it('returns the invalid UID error contract for an empty UID', () => {
    expect(buildStudentIdVerificationPayload('mathpulse-ai-2026.web.app', ' ')).toEqual({
      kind: 'error',
      code: 'invalid_uid',
    });
  });

  it('maps a valid verification record to a profile summary', () => {
    const summary = {
      uid: 'uid-fixture-169',
      displayName: 'Fixture Learner',
      grade: '11',
      section: 'STEM A',
      school: 'MathPulse Senior High',
    } as const;

    expect(resolveStudentIdVerificationRoute(summary.uid, { kind: 'valid', summary })).toEqual({
      kind: 'summary',
      summary,
    });
  });

  it('maps invalid and revoked records to error outcomes', () => {
    expect(resolveStudentIdVerificationRoute('', null)).toEqual({
      kind: 'error',
      code: 'invalid_uid',
    });
    expect(resolveStudentIdVerificationRoute('uid-fixture-169', { kind: 'revoked' })).toEqual({
      kind: 'error',
      code: 'revoked',
    });
  });
});
