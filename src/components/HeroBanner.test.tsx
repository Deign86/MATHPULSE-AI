// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HeroBanner from './HeroBanner';

describe('HeroBanner', () => {
  beforeEach(() => {
    // Clear localStorage between tests
    window.localStorage.clear();
  });

  it('personalizes the banner and continues learning on request', () => {
    const continueLearning = vi.fn();
    render(<HeroBanner userName="Mina" userLevel={4} onContinueLearning={continueLearning} />);
    expect(screen.getByRole('heading', { name: /Mina!/ })).toBeInTheDocument();
    expect(screen.getByText('Level 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /continue learning/i }));
    expect(continueLearning).toHaveBeenCalledOnce();
  });

  it('hides the assessment-complete alert after dismiss via click', () => {
    render(
      <HeroBanner
        userName="Student"
        studentId="s1"
        assessmentCompleted
      />,
    );
    // Alert is shown
    expect(screen.getByText('Assessment Complete!')).toBeInTheDocument();
    // Dismiss by clicking close
    fireEvent.click(screen.getByLabelText(/Dismiss assessment complete/i));
    // Alert should be gone
    expect(screen.queryByText('Assessment Complete!')).not.toBeInTheDocument();
  });

  it('reappears when assessmentCompleted toggles back true', () => {
    const { rerender } = render(
      <HeroBanner
        userName="Student"
        studentId="s1"
        assessmentCompleted={false}
      />,
    );
    // Not shown yet
    expect(screen.queryByText('Assessment Complete!')).not.toBeInTheDocument();

    // Toggle completion to true — alert appears fresh
    rerender(
      <HeroBanner
        userName="Student"
        studentId="s1"
        assessmentCompleted={true}
      />,
    );
    // Alert reappears
    expect(screen.getByText('Assessment Complete!')).toBeInTheDocument();
  });

  it('keeps a dismissed completion alert hidden after the dashboard remounts', () => {
    const firstRender = render(
      <HeroBanner userName="Student" studentId="s1" assessmentCompleted />,
    );

    fireEvent.click(within(firstRender.container).getByLabelText(/Dismiss assessment complete/i));
    expect(window.localStorage.getItem('mathpulse:dismissed_assessment_complete_tooltip_s1')).toBe('true');
    firstRender.unmount();

    const remount = render(<HeroBanner userName="Student" studentId="s1" assessmentCompleted />);

    expect(within(remount.container).queryByText('Assessment Complete!')).not.toBeInTheDocument();
  });

  it('keeps a dismissed alert hidden when the diagnostic check resolves from unknown to completed', () => {
    window.localStorage.setItem('mathpulse:dismissed_assessment_complete_tooltip_s1', 'true');
    const { container, rerender } = render(<HeroBanner userName="Student" studentId="s1" assessmentCompleted={null} />);

    rerender(<HeroBanner userName="Student" studentId="s1" assessmentCompleted={true} />);

    expect(window.localStorage.getItem('mathpulse:dismissed_assessment_complete_tooltip_s1')).toBe('true');
    expect(within(container).queryByText('Assessment Complete!')).not.toBeInTheDocument();
  });
});
