/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProfileData } from './SettingsPage';
import StudentIDCard from './StudentIDCard';

const studentProfile = {
  uid: 'uid-fixture-169',
  name: 'Fixture Learner',
  lrn: '1234567890',
  grade: '11',
  section: 'STEM A',
  school: 'MathPulse Senior High',
} satisfies ProfileData;

function renderStudentCard(profileData: ProfileData = studentProfile) {
  return render(<StudentIDCard profileData={profileData} />);
}

describe('StudentIDCard official pass footer', () => {
  afterEach(() => cleanup());

  it('renders the official student pass footer and academic school year', () => {
    renderStudentCard();

    expect(screen.getAllByText(/Official Student Pass/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/S\.Y\. 2025–2026/i)).toBeInTheDocument();
  });

  it('does not render dead QR codes or verification links', () => {
    renderStudentCard();

    expect(screen.queryByLabelText(/Open student ID verification/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Scan to verify/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Verification unavailable/i)).not.toBeInTheDocument();
  });

  it('renders student identity details accurately', () => {
    renderStudentCard();

    expect(screen.getAllByText('Fixture Learner').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1234567890/).length).toBeGreaterThan(0);
    expect(screen.getByText('MathPulse Senior High')).toBeInTheDocument();
  });
});
