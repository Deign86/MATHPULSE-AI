/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import ModuleFolderCard from './ModuleFolderCard';
import * as subjectAvailabilityNs from '../hooks/useSubjectAvailability';

vi.spyOn(subjectAvailabilityNs, 'useSubjectAvailability').mockReturnValue({
  availability: {},
  config: null,
  loading: false,
  error: null,
  isSubjectAvailable: () => true,
  getSubjectEntry: () => undefined,
});

const baseModule = {
  id: 'mod-functions',
  title: 'Functions as Mathematical Models',
  subject: 'General Mathematics',
  active_grade_level: 'Grade 11',
  quarter: 'Q1',
  progress: 0,
  isAvailable: true,
};

describe('ModuleFolderCard weakest-topic Review badge (STU-007)', () => {
  afterEach(cleanup);

  it('shows a Review badge for the weakest assessed topic', () => {
    render(
      <ModuleFolderCard
        module={baseModule}
        index={0}
        onClick={vi.fn()}
        precomputedAvailable
        isWeakestTopic
      />,
    );
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('shows Recommended (not Review) for non-weakest recommended topics', () => {
    render(
      <ModuleFolderCard
        module={baseModule}
        index={0}
        onClick={vi.fn()}
        precomputedAvailable
        isRecommended
      />,
    );
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.queryByText('Review')).not.toBeInTheDocument();
  });

  it('shows neither badge for ordinary topics', () => {
    render(
      <ModuleFolderCard
        module={baseModule}
        index={0}
        onClick={vi.fn()}
        precomputedAvailable
      />,
    );
    expect(screen.queryByText('Review')).not.toBeInTheDocument();
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
  });
});
