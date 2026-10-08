import type { AuditLogEntry } from '../services/adminService';

const quoteCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;

export const buildAuditLogCsv = (entries: AuditLogEntry[], totalCount: number): string => {
  const rows: string[][] = [
    ['MathPulse AI - Security & Activity Audit Log Export'],
    [`Exported At: ${new Date().toLocaleString()}`],
    [`Filtered Events: ${entries.length} of ${totalCount}`],
    [],
    ['Event ID', 'Severity', 'Timestamp', 'Actor Name', 'Actor Role', 'Category', 'Action', 'Details'],
    ...entries.map((entry) => [
      entry.id,
      entry.severity,
      entry.timestamp,
      entry.user?.name || 'System',
      entry.user?.role || 'Service',
      entry.category,
      entry.action,
      entry.details,
    ]),
  ];

  const columnCount = Math.max(...rows.map((row) => row.length));
  return rows
    .map((row) => Array.from({ length: columnCount }, (_, index) => quoteCell(row[index] ?? '')).join(','))
    .join('\n');
};

export const auditLogCsvFilename = () => `MathPulse_AuditLogs_${new Date().toISOString().slice(0, 10)}.csv`;

/** Builds the audit CSV and triggers a browser download of it. */
export const downloadAuditLogCsv = (entries: AuditLogEntry[], totalCount: number): void => {
  const blob = new Blob(['\uFEFF', buildAuditLogCsv(entries, totalCount)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', auditLogCsvFilename());
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
