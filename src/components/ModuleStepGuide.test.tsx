// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModuleStepGuide from './ModuleStepGuide';
import type { GeneratePracticeResponse } from '../services/practiceService';

const practiceSection = {
  title: 'Guided Practice', content: 'Solve examples', stepType: 'practice',
  stepNumber: 2, topic: 'Addition', numItems: 2,
};
const assessmentSection = {
  title: 'Mastery Check', content: 'Check understanding', stepType: 'assessment',
  stepNumber: 4, topic: 'Equations', numItems: 1,
};
const storedQuestions = [
  { question: 'What is 2 + 3?', options: [{ label: 'A', text: '4' }, { label: 'B', text: '5' }], answer: 'B', explanation: 'Add 2 and 3 to get 5.' },
  { question: 'What is 1 + 1?', options: [{ label: 'A', text: '2' }, { label: 'B', text: '3' }], answer: 'A', explanation: 'Two ones make 2.' },
];
const response = (question: string): GeneratePracticeResponse => ({
  session_id: question, generated_at: '2026-10-07T00:00:00Z',
  questions: [{ id: question, question, options: ['4', '5'], correct_index: 1,
    explanation: 'Add the terms.', competency: 'Addition', difficulty: 'Practice', bloomsLevel: 'apply' }],
});
const defaultProps = {
  moduleId: 'module-1', section: practiceSection, sectionIndex: 1, totalSections: 4,
  moduleTitle: 'Intervention', studentName: 'Student', studentUid: 'student-1', onClose: vi.fn(),
};

describe('ModuleStepGuide intervention practice', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it.each(['Next Step', 'Finish Module'])('blocks %s before questions are generated or checked', (action) => {
    const proceed = vi.fn();
    render(<ModuleStepGuide {...defaultProps} onClose={proceed} onNext={action === 'Next Step' ? proceed : undefined} practice={[]} />);
    const navigation = screen.getByRole('button', { name: action });
    expect(navigation).toBeDisabled();
    fireEvent.click(navigation);
    expect(proceed).not.toHaveBeenCalled();
  });

  it('requires every answer to be checked, shows feedback, and allows incorrect attempts to finish', () => {
    const close = vi.fn();
    render(<ModuleStepGuide {...defaultProps} totalSections={1} sectionIndex={0} practice={storedQuestions} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'Practice (2)' }));
    const first = screen.getByRole('group', { name: 'What is 2 + 3?' });
    const second = screen.getByRole('group', { name: 'What is 1 + 1?' });
    expect(within(first).getByRole('button', { name: 'Check Answer' })).toBeDisabled();
    expect(screen.queryByText('Add 2 and 3 to get 5.')).not.toBeInTheDocument();
    fireEvent.click(within(first).getByRole('radio', { name: 'A. 4' }));
    expect(within(first).getByRole('radio', { name: 'A. 4' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Finish Module' })).toBeDisabled();
    fireEvent.click(within(first).getByRole('button', { name: 'Check Answer' }));
    expect(within(first).getByRole('status')).toHaveTextContent(/incorrect/i);
    expect(within(first).getByText('Add 2 and 3 to get 5.')).toBeInTheDocument();
    expect(within(first).getByRole('radio', { name: 'B. 5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Finish Module' })).toBeDisabled();
    fireEvent.click(within(second).getByRole('radio', { name: 'A. 2' }));
    fireEvent.click(within(second).getByRole('button', { name: 'Check Answer' }));
    expect(within(second).getByRole('status')).toHaveTextContent(/correct/i);
    expect(screen.getByRole('button', { name: 'Finish Module' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish Module' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps generated questions and submitted answers scoped to their step when navigating back', async () => {
    const generatePractice = vi.fn().mockResolvedValueOnce(response('Practice question')).mockResolvedValueOnce(response('Assessment question'));
    const view = render(<ModuleStepGuide {...defaultProps} generatePractice={generatePractice} practice={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    await screen.findByText('Practice question');
    fireEvent.click(screen.getByRole('radio', { name: 'A. 4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    view.rerender(<ModuleStepGuide {...defaultProps} section={assessmentSection} sectionIndex={3} generatePractice={generatePractice} practice={[]} />);
    expect(screen.queryByText('Practice question')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish Module' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    await screen.findByText('Assessment question');
    expect(screen.getByRole('button', { name: 'Check Answer' })).toBeDisabled();
    view.rerender(<ModuleStepGuide {...defaultProps} generatePractice={generatePractice} practice={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Practice (1)' }));
    expect(screen.getByText('Practice question')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish Module' })).toBeEnabled();
    expect(generatePractice).toHaveBeenCalledTimes(2);
  });

  it.each(['resolve', 'reject'])('ignores a late %s from the previous step while the current request loads', async (outcome) => {
    let resolveOld = (_response: GeneratePracticeResponse) => {};
    let rejectOld = (_error: Error) => {};
    let resolveCurrent = (_response: GeneratePracticeResponse) => {};
    const oldRequest = new Promise<GeneratePracticeResponse>((resolve, reject) => { resolveOld = resolve; rejectOld = reject; });
    const currentRequest = new Promise<GeneratePracticeResponse>((resolve) => { resolveCurrent = resolve; });
    const generatePractice = vi.fn().mockReturnValueOnce(oldRequest).mockReturnValueOnce(currentRequest);
    const view = render(<ModuleStepGuide {...defaultProps} generatePractice={generatePractice} practice={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    view.rerender(<ModuleStepGuide {...defaultProps} section={assessmentSection} sectionIndex={3} generatePractice={generatePractice} practice={[]} />);
    expect(screen.getByRole('button', { name: 'Start Questions' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    await act(async () => {
      if (outcome === 'resolve') resolveOld(response('Old question'));
      else rejectOld(new Error('Old failure'));
    });
    expect(screen.queryByText('Old question')).not.toBeInTheDocument();
    expect(screen.queryByText(/questions could not be loaded/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();
    await act(async () => resolveCurrent(response('Current question')));
    expect(screen.getByText('Current question')).toBeInTheDocument();
  });

  it('resets the attempt when a different module opens at the same section index', async () => {
    const generatePractice = vi.fn().mockResolvedValue(response('First module question'));
    const view = render(<ModuleStepGuide {...defaultProps} generatePractice={generatePractice} practice={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    await screen.findByText('First module question');
    view.rerender(<ModuleStepGuide {...defaultProps} moduleId="module-2" generatePractice={generatePractice} practice={[]} />);
    expect(screen.queryByText('First module question')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Questions' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Finish Module' })).toBeDisabled();
  });

  it('allows a non-question review step to advance without generating questions', () => {
    const next = vi.fn();
    const generatePractice = vi.fn();
    render(<ModuleStepGuide {...defaultProps} section={{ title: 'Review', content: 'Read the summary', stepType: 'review' }} generatePractice={generatePractice} onNext={next} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next Step' }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(generatePractice).not.toHaveBeenCalled();
  });

  it('shows final-step position without claiming completion before answers are checked', async () => {
    const generatePractice = vi.fn().mockResolvedValue(response('Final question'));
    render(<ModuleStepGuide {...defaultProps} section={assessmentSection} sectionIndex={3} generatePractice={generatePractice} practice={[]} />);
    expect(screen.queryByText(/100% Complete/)).not.toBeInTheDocument();
    expect(screen.getByText('0 of 1 answers checked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    await screen.findByText('Final question');
    fireEvent.click(screen.getByRole('radio', { name: 'A. 4' }));
    expect(screen.getByText('0 of 1 answers checked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    expect(screen.getByText('1 of 1 answers checked')).toBeInTheDocument();
  });

  it('blocks a directly launched final step until every required question step is submitted', async () => {
    const generatePractice = vi.fn().mockResolvedValue(response('Final question'));
    const submitted = vi.fn();
    const finish = vi.fn();
    const close = vi.fn();
    const props = { ...defaultProps, section: assessmentSection, sectionIndex: 3, generatePractice,
      requiredQuestionSteps: [1, 2, 3], submittedQuestionSteps: [1], onStepComplete: submitted, onFinish: finish, onClose: close };
    const view = render(<ModuleStepGuide {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    await screen.findByText('Final question');
    expect(submitted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: 'A. 4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    expect(screen.getByRole('button', { name: 'Finish Module' })).toBeDisabled();
    expect(submitted).toHaveBeenCalledExactlyOnceWith(3);
    fireEvent.click(screen.getByRole('button', { name: 'Finish Module' }));
    expect(finish).not.toHaveBeenCalled();
    expect(screen.getByRole('progressbar', { name: 'Question submission progress' })).toHaveAttribute('aria-valuenow', '67');
    view.rerender(<ModuleStepGuide {...props} submittedQuestionSteps={[1, 2, 3]} />);
    expect(screen.getByRole('button', { name: 'Finish Module' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish Module' }));
    expect(finish).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close study guide' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('uses assigned module position in counters and actual submissions in progress', async () => {
    const generatePractice = vi.fn().mockResolvedValue(response('Assigned question'));
    render(<ModuleStepGuide {...defaultProps} section={assessmentSection} sectionIndex={0} totalSections={1} generatePractice={generatePractice} />);
    expect(screen.getByLabelText('Current step')).toHaveTextContent('Step 1/1');
    expect(screen.getByRole('progressbar', { name: 'Question submission progress' })).toHaveAttribute('aria-valuenow', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    await screen.findByText('Assigned question');
    fireEvent.click(screen.getByRole('radio', { name: 'A. 4' }));
    expect(screen.getByRole('progressbar', { name: 'Question submission progress' })).toHaveAttribute('aria-valuenow', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    expect(screen.getByRole('progressbar', { name: 'Question submission progress' })).toHaveAttribute('aria-valuenow', '100');
  });

  it('generates and renders questions for an intervention practice step with no stored practice', async () => {
    const generatePractice = vi.fn().mockResolvedValue({
      session_id: 'session-1',
      generated_at: new Date().toISOString(),
      questions: [{
        id: 'q-1',
        question: 'What is 2 + 3?',
        options: ['4', '5', '6', '7'],
        correct_index: 1,
        explanation: '2 + 3 = 5.',
        competency: 'Foundational Skills',
        difficulty: 'Practice',
        bloomsLevel: 'apply',
      }],
    });

    render(
      <ModuleStepGuide
        moduleId="module-1"
        section={{
          title: 'Step 2: Guided Practice',
          content: 'Work through examples',
          stepType: 'practice',
          stepNumber: 2,
          topic: 'Foundational Skills',
          numItems: 10,
        }}
        sectionIndex={1}
        totalSections={4}
        moduleTitle="Intervention: Foundational Skills"
        studentName="Student"
        studentUid="student-1"
        practice={[]}
        generatePractice={generatePractice}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));

    await waitFor(() => expect(generatePractice).toHaveBeenCalledWith({
      userId: 'student-1',
      subject: 'General Mathematics',
      competency: 'Foundational Skills',
      difficulty: 'Practice',
      count: 10,
    }));

    expect(await screen.findByText('What is 2 + 3?')).toBeInTheDocument();
    expect(screen.getByText('B. 5')).toBeInTheDocument();
  });

  it('generates a mastery check for an assessment step using the requested item count', async () => {
    const generatePractice = vi.fn().mockResolvedValue({
      session_id: 'session-assessment',
      generated_at: new Date().toISOString(),
      questions: [{
        id: 'q-assessment',
        question: 'Which value satisfies x + 4 = 9?',
        options: ['3', '4', '5', '6'],
        correct_index: 2,
        explanation: 'Subtract 4 from both sides.',
        competency: 'Foundational Skills',
        difficulty: 'Mastery',
        bloomsLevel: 'apply',
      }],
    });

    render(
      <ModuleStepGuide
        moduleId="module-1"
        section={{
          title: 'Step 4: Mastery Check',
          content: 'Demonstrate understanding',
          stepType: 'assessment',
          stepNumber: 4,
          topic: 'Foundational Skills',
          numItems: 5,
        }}
        sectionIndex={3}
        totalSections={4}
        moduleTitle="Intervention: Foundational Skills"
        studentName="Student"
        studentUid="student-1"
        practice={[]}
        generatePractice={generatePractice}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));

    await waitFor(() => expect(generatePractice).toHaveBeenCalledWith({
      userId: 'student-1',
      subject: 'General Mathematics',
      competency: 'Foundational Skills',
      difficulty: 'Mastery',
      count: 5,
    }));
    expect(await screen.findByText('Which value satisfies x + 4 = 9?')).toBeInTheDocument();
  });

  it('shows a retry path when question generation fails and recovers on retry', async () => {
    const generatePractice = vi.fn()
      .mockRejectedValueOnce(new Error('temporary generation failure'))
      .mockResolvedValueOnce({
        session_id: 'session-retry',
        generated_at: new Date().toISOString(),
        questions: [{
          id: 'q-retry',
          question: 'What is 6 × 2?',
          options: ['10', '11', '12', '14'],
          correct_index: 2,
          explanation: '6 × 2 = 12.',
          competency: 'Foundational Skills',
          difficulty: 'Practice',
          bloomsLevel: 'apply',
        }],
      });

    render(
      <ModuleStepGuide
        moduleId="module-1"
        section={{
          title: 'Step 3: Independent Practice',
          content: 'Solve problems independently',
          stepType: 'practice',
          stepNumber: 3,
          topic: 'Foundational Skills',
          numItems: 10,
        }}
        sectionIndex={2}
        totalSections={4}
        moduleTitle="Intervention: Foundational Skills"
        studentName="Student"
        studentUid="student-1"
        practice={[]}
        generatePractice={generatePractice}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Questions' }));
    expect(await screen.findByText('Practice questions could not be loaded. Please try again.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(await screen.findByText('What is 6 × 2?')).toBeInTheDocument();
    expect(generatePractice).toHaveBeenCalledTimes(2);
  });
});
