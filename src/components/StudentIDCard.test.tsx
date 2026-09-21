/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QRCodeSVG } from 'qrcode.react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProfileData } from './SettingsPage';
import StudentIDCard from './StudentIDCard';
import { STUDENT_ID_QR_OPTIONS } from '../utils/studentIdVerification';

const studentProfile = {
  uid: 'uid-fixture-169',
  name: 'Fixture Learner',
  lrn: '1234567890',
  grade: '11',
  section: 'STEM A',
  school: 'MathPulse Senior High',
} satisfies ProfileData;

const verificationUrl = `https://${window.location.host}/verify/${studentProfile.uid}?src=id_card`;

function renderStudentCard(profileData: ProfileData = studentProfile) {
  return render(<StudentIDCard profileData={profileData} />);
}

describe('StudentIDCard verification QR', () => {
  afterEach(() => cleanup());

  it('renders a QR matrix for the exact student verification URL and contract options', () => {
    renderStudentCard();

    const qrSvg = screen.getByRole('img', { name: STUDENT_ID_QR_OPTIONS.title });
    const expectedRoot = document.createElement('div');
    render(
      <QRCodeSVG value={verificationUrl} {...STUDENT_ID_QR_OPTIONS} />,
      { container: expectedRoot },
    );

    expect(qrSvg).toHaveAttribute('width', String(STUDENT_ID_QR_OPTIONS.size));
    expect(qrSvg).toHaveAttribute('height', String(STUDENT_ID_QR_OPTIONS.size));
    expect(qrSvg.querySelector('title')).toHaveTextContent(STUDENT_ID_QR_OPTIONS.title);
    expect(qrSvg.querySelector('path')?.getAttribute('d')).toBe(
      expectedRoot.querySelector('path')?.getAttribute('d'),
    );
  });

  it('removes the fake barcode nodes', () => {
    renderStudentCard();

    expect(screen.queryByLabelText('Student ID Barcode')).not.toBeInTheDocument();
    expect(screen.queryByText(/\*uid-fixture-169\*/i)).not.toBeInTheDocument();
  });

  it('opens the exact verification URL in a new tab when clicked', () => {
    renderStudentCard();

    const verificationLink = screen.getByRole('link', {
      name: 'Open student ID verification in a new tab',
    });

    expect(verificationLink).toHaveAttribute('href', verificationUrl);
    expect(verificationLink).toHaveAttribute('target', '_blank');

    fireEvent.click(verificationLink);

    expect(verificationLink).toHaveAttribute('href', verificationUrl);
  });

  it('renders an error placeholder instead of throwing when UID is missing', () => {
    expect(() => renderStudentCard({ name: 'Missing UID Learner' })).not.toThrow();

    expect(screen.getByText('Verification unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: STUDENT_ID_QR_OPTIONS.title })).not.toBeInTheDocument();
  });
});
