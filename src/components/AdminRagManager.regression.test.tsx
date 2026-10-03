// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
});
