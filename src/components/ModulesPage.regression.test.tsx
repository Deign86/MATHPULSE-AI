// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModulesPage from './ModulesPage';

describe('ModulesPage navigation regression', () => {
  it('switches to the practice tab without entering quiz mode', () => {
    const setQuizMode = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ModulesPage setIsInQuizMode={setQuizMode} /></QueryClientProvider>);
    const practiceTab = screen.getByRole('button', { name: /practice/i });
    fireEvent.click(practiceTab);
    expect(setQuizMode).toHaveBeenCalledWith(false);
  });
});
