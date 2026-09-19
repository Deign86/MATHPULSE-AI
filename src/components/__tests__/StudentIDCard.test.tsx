/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentIDCard } from '../StudentIDCard';

describe('StudentIDCard', () => {
  const mockProfile = {
    uid: 'test-student-123',
    name: 'Maria Santos',
    email: 'maria@deped.gov.ph',
    lrn: '123456789012',
    grade: '11',
    section: 'STEM-A',
    school: 'Science High School',
  };

  it('renders student front face details correctly', () => {
    render(<StudentIDCard profileData={mockProfile} userLevel={5} userXP={2500} />);
    expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/123456789012/).length).toBeGreaterThan(0);
    expect(screen.getByText('Science High School')).toBeInTheDocument();
  });

  it('flips to the back side when clicking the card', () => {
    const { container } = render(<StudentIDCard profileData={mockProfile} />);
    // SAFETY: Container element query for student pass outer card element in test
    const card = container.querySelector('[aria-label*="Cute MathPulse Student Pass"]') as HTMLElement;
    expect(card).toBeInTheDocument();

    fireEvent.click(card);
    expect(screen.getAllByText(/Keep pulsing/i).length).toBeGreaterThan(0);
  });

  it('does not trigger file input click when clicking the card body', () => {
    const { container } = render(<StudentIDCard profileData={mockProfile} />);
    // SAFETY: Input query on document for file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const fileInputSpy = vi.spyOn(fileInput, 'click');

    // SAFETY: Container element query for student pass outer card element in test
    const card = container.querySelector('[aria-label*="Cute MathPulse Student Pass"]') as HTMLElement;
    fireEvent.click(card);
    expect(fileInputSpy).not.toHaveBeenCalled();
  });
});
