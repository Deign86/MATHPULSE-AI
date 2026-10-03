// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { toast } from 'sonner';
import AdminClassManagement from './AdminClassManagement';

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
