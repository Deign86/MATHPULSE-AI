import { describe, expect, it } from 'vitest';
import { auditLogCsvFilename, buildAuditLogCsv } from './auditLogCsv';
import type { AuditLogEntry } from '../services/adminService';

const entry: AuditLogEntry = {
  id: 'evt-1',
  severity: 'Critical',
  timestamp: '2026-10-08T01:02:03.000Z',
  user: { name: 'Ada "Admin" Lovelace', role: 'admin', avatar: null },
  action: 'Created user',
  category: 'User',
  details: 'Added student, section A',
};

describe('buildAuditLogCsv', () => {
  it('writes a header row and one quoted row per entry, escaping embedded quotes', () => {
    const lines = buildAuditLogCsv([entry], 3).split('\n');
    expect(lines[2]).toBe('"Filtered Events: 1 of 3","","","","","","",""');
    expect(lines[4]).toBe('"Event ID","Severity","Timestamp","Actor Name","Actor Role","Category","Action","Details"');
    expect(lines[5]).toBe('"evt-1","Critical","2026-10-08T01:02:03.000Z","Ada ""Admin"" Lovelace","admin","User","Created user","Added student, section A"');
  });
});

describe('auditLogCsvFilename', () => {
  it('names the file by export date with a .csv extension', () => {
    expect(auditLogCsvFilename()).toMatch(/^MathPulse_AuditLogs_\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
