// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as api from '../services/apiService';
import AdminRagManager from './AdminRagManager';

afterEach(cleanup);

describe('admin RAG manager smoke regressions', () => {
  it('renders its document management heading after a successful empty response', async () => {
    // SAFETY: this response supplies the inventory fields rendered by the manager.
    vi.spyOn(api, 'apiFetch').mockResolvedValue({ documents: [], total_chunks: 0 } as never);
    render(<AdminRagManager />);
    expect(await screen.findByText('Indexed Sections')).toBeTruthy();
  });

  it('retains a usable manager view when the health request fails', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(new Error('unavailable'));
    render(<AdminRagManager />);
    expect(await screen.findByText('Indexed Sections')).toBeTruthy();
  });

  it('shows an error state with Retry when the inventory request fails', async () => {
    const fetchSpy = vi.spyOn(api, 'apiFetch').mockRejectedValue(new Error('unavailable'));
    render(<AdminRagManager />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('unavailable')).toBeTruthy();
    expect(screen.queryByText('No AI Knowledge Loaded Yet')).toBeNull();

    const callsBeforeRetry = fetchSpy.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });
});
