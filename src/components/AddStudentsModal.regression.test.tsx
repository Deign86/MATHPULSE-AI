// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach } from 'vitest';
import { AddStudentsModal } from './AddStudentsModal';
import * as firestore from 'firebase/firestore';

afterEach(cleanup);

describe('add students modal roster regressions', () => {
  it('filters existing roster members and supports search selection', async () => {
    // SAFETY: these mocked handles are opaque to the Firestore query calls under test.
    vi.spyOn(firestore, 'collection').mockReturnValue({} as ReturnType<typeof firestore.collection>);
    // SAFETY: query handles are passed through to the getDocs test seam only.
    vi.spyOn(firestore, 'query').mockReturnValue({} as ReturnType<typeof firestore.query>);
    // SAFETY: the role filter is intentionally opaque in this isolated UI test.
    vi.spyOn(firestore, 'where').mockReturnValue({} as ReturnType<typeof firestore.where>);
    // SAFETY: the modal reads only docs[].id and docs[].data() from this snapshot stub.
    vi.spyOn(firestore, 'getDocs').mockResolvedValue({
      docs: [
        { id: 'already', data: () => ({ name: 'Already Here' }) },
        { id: 'new', data: () => ({ name: 'New Student', email: 'new@example.test' }) },
      ],
    } as never);
    render(<AddStudentsModal open onClose={vi.fn()} onAdded={vi.fn()} grade="11" section="A" existingStudentUids={['already']} />);
    expect(await screen.findByText('New Student')).toBeTruthy();
    expect(screen.queryByText('Already Here')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Search students...'), { target: { value: 'not found' } });
    await waitFor(() => expect(screen.getByText('No students available')).toBeTruthy());
  });

  it('renders no dialog when closed', () => {
    render(<AddStudentsModal open={false} onClose={vi.fn()} onAdded={vi.fn()} grade="11" section="A" />);
    expect(screen.queryByText(/Add Students to/)).toBeNull();
  });
});
