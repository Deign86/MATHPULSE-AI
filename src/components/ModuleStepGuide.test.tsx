// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModuleStepGuide from './ModuleStepGuide';

describe('ModuleStepGuide intervention practice', () => {
  beforeEach(() => {
    sessionStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
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
