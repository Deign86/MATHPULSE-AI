export const STUDENT_ID_QR_OPTIONS = {
  level: 'M',
  marginSize: 4,
  size: 192,
  title: 'Verify MathPulse student ID',
} as const;

export type StudentIdProfileSummary = {
  readonly uid: string;
  readonly displayName: string;
  readonly grade?: string;
  readonly section?: string;
  readonly school?: string;
};

export type StudentIdVerificationPayload =
  | { readonly kind: 'ready'; readonly url: string }
  | { readonly kind: 'error'; readonly code: 'invalid_host' | 'invalid_uid' };

export type StudentIdVerificationRecord =
  | { readonly kind: 'valid'; readonly summary: StudentIdProfileSummary }
  | { readonly kind: 'revoked' };

export type StudentIdVerificationRoute =
  | { readonly kind: 'summary'; readonly summary: StudentIdProfileSummary }
  | { readonly kind: 'error'; readonly code: 'invalid_uid' | 'not_found' | 'revoked' };

export function buildStudentIdVerificationPayload(
  appHost: string,
  uid: string,
): StudentIdVerificationPayload {
  const normalizedHost = appHost.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const normalizedUid = uid.trim();

  if (!normalizedHost) return { kind: 'error', code: 'invalid_host' };
  if (!normalizedUid) return { kind: 'error', code: 'invalid_uid' };

  return {
    kind: 'ready',
    url: `https://${normalizedHost}/verify/${encodeURIComponent(normalizedUid)}?src=id_card`,
  };
}

export function resolveStudentIdVerificationRoute(
  uid: string | undefined,
  record: StudentIdVerificationRecord | null,
): StudentIdVerificationRoute {
  const normalizedUid = uid?.trim();
  if (!normalizedUid) return { kind: 'error', code: 'invalid_uid' };
  if (!record) return { kind: 'error', code: 'not_found' };

  switch (record.kind) {
    case 'valid':
      return record.summary.uid === normalizedUid
        ? { kind: 'summary', summary: record.summary }
        : { kind: 'error', code: 'not_found' };
    case 'revoked':
      return { kind: 'error', code: 'revoked' };
    default:
      return assertNever(record);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled student ID verification record: ${JSON.stringify(value)}`);
}
