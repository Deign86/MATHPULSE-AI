/** Client-side class-records preview rows (TCH-043/045/074).

Display-only: the server remains the source of truth at upload time.
Flags mirror the backend identity rules so teachers see problems BEFORE
committing: 12-digit LRN, LRN-or-email presence, suspicious names.
No fabrication: cells render exactly as parsed.
*/

export interface ClassRecordsPreviewRow {
  sourceRow: number;
  name: string;
  lrn: string;
  email: string;
  flags: string[];
}

export const PREVIEW_ROW_CAP = 50;

export interface WorkbookPreview {
  rows: ClassRecordsPreviewRow[];
  total: number;
}

export interface CsvPreview {
  rows: ClassRecordsPreviewRow[];
  total: number;
  note: string | null;
}

const LRN_PATTERN = /^\d{12}$/;

export function flagIdentity(name: string, lrn: string, email: string): string[] {
  const flags: string[] = [];
  const cleanName = name.trim();
  const cleanLrn = lrn.trim();
  const cleanEmail = email.trim();
  if (cleanLrn && !LRN_PATTERN.test(cleanLrn)) {
    flags.push('LRN must contain exactly 12 digits.');
  }
  if (!cleanLrn && !cleanEmail) {
    flags.push('LRN or email is required.');
  }
  if (cleanName && cleanName.replace(/\s+/g, ' ').trim().length <= 2) {
    flags.push('Verify name column mapping (name looks like an initial).');
  }
  return flags;
}

interface WorkbookStudentEntity {
  fullName?: string | null;
  lrn?: string | null;
  email?: string | null;
  sourceRow?: number | null;
}

/** Map parsed workbook student entities to preview rows (display only). */
export function buildWorkbookPreviewRows(
  entities: WorkbookStudentEntity[],
  cap: number = PREVIEW_ROW_CAP,
): WorkbookPreview {
  const rows = entities.slice(0, cap).map((student, index) => {
    const name = String(student.fullName ?? '');
    const lrn = String(student.lrn ?? '');
    const email = String(student.email ?? '');
    return {
      sourceRow: student.sourceRow ?? index + 2,
      name,
      lrn,
      email,
      flags: flagIdentity(name, lrn, email),
    };
  });
  return { rows, total: entities.length };
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function pickColumn(headers: string[], tokens: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const token of tokens) {
    const found = normalized.findIndex((header) => header.includes(token));
    if (found >= 0) return found;
  }
  return -1;
}

/** Minimal CSV preview parser (display only, first `cap` data rows). */
export function parseCsvPreviewRows(
  text: string,
  cap: number = PREVIEW_ROW_CAP,
): CsvPreview {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], total: 0, note: 'Empty file.' };
  }
  const headers = splitCsvLine(lines[0]);
  const nameCol = pickColumn(headers, ['fullname', 'studentname', 'name']);
  const lrnCol = pickColumn(headers, ['lrn', 'learnerreferencenumber', 'studentid']);
  const emailCol = pickColumn(headers, ['email', 'emailaddress']);
  if (nameCol < 0) {
    return { rows: [], total: 0, note: 'No name column detected.' };
  }
  const dataLines = lines.slice(1);
  const rows = dataLines.slice(0, cap).map((line, index) => {
    const cells = splitCsvLine(line);
    const name = cells[nameCol] ?? '';
    const lrn = lrnCol >= 0 ? (cells[lrnCol] ?? '') : '';
    const email = emailCol >= 0 ? (cells[emailCol] ?? '') : '';
    return {
      sourceRow: index + 2,
      name,
      lrn,
      email,
      flags: flagIdentity(name, lrn, email),
    };
  });
  return { rows, total: dataLines.length, note: null };
}

export function isBlockedRow(row: ClassRecordsPreviewRow): boolean {
  return row.flags.some(
    (flag) => flag.startsWith('LRN must contain') || flag.startsWith('LRN or email'),
  );
}
