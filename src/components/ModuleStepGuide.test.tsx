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
});
