// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { toast } from 'sonner';
import AdminClassManagement, { matchesClassQuery } from './AdminClassManagement';

afterEach(cleanup);

describe('admin class management regressions', () => {
  it('shows the empty state when class and teacher queries return no records', async () => {
    // SAFETY: mocked references are opaque; the empty snapshot uses only docs.
    vi.spyOn(firestore, 'collection').mockReturnValue({} as ReturnType<typeof firestore.collection>);
    // SAFETY: the UI consumes the snapshot's docs array only.
    vi.spyOn(firestore, 'getDocs').mockResolvedValue({ docs: [] } as never);
    // SAFETY: query handles are passed through to getDocs only.
    vi.spyOn(firestore, 'query').mockReturnValue({} as ReturnType<typeof firestore.query>);
    // SAFETY: role query clauses are opaque to this test.
    vi.spyOn(firestore, 'where').mockReturnValue({} as ReturnType<typeof firestore.where>);
    render(<AdminClassManagement />);
    expect(await screen.findByText('Total Sections')).toBeTruthy();
  });

  it('does not leave the loading indicator after a failed read', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(vi.fn());
    // SAFETY: Firestore collection references are opaque to the UI query boundary.
    vi.spyOn(firestore, 'collection').mockReturnValue({} as ReturnType<typeof firestore.collection>);
    vi.spyOn(firestore, 'getDocs').mockRejectedValue(new Error('offline'));
    render(<AdminClassManagement />);
    expect(await screen.findByText('Total Sections')).toBeTruthy();
    expect(toastError).toHaveBeenCalledWith('Failed to load class data');
  });
});

describe('matchesClassQuery (ADM-089)', () => {
  const record = {
    id: 'g11-stem-a',
    name: 'STEM A',
    gradeLevel: 'Grade 11',
    section: 'STEM-A',
    managerName: 'Reyes',
  };

  it('matches name, grade, section, and manager fields', () => {
    expect(matchesClassQuery(record, 'stem a')).toBe(true);
    expect(matchesClassQuery(record, 'grade 11')).toBe(true);
    expect(matchesClassQuery(record, 'stem-a')).toBe(true);
    expect(matchesClassQuery(record, 'reyes')).toBe(true);
  });

  it('matches id slugs and combined grade-section labels', () => {
    expect(matchesClassQuery(record, 'g11-stem')).toBe(true);
    expect(matchesClassQuery(record, 'grade 11 stem')).toBe(true);
  });

  it('rejects non-matches and treats empty queries as match-all', () => {
    expect(matchesClassQuery(record, 'grade 12')).toBe(false);
    expect(matchesClassQuery(record, '')).toBe(true);
  });
});
