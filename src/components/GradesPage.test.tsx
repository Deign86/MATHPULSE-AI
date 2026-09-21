// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import AuthContext, { type AuthContextType } from '../contexts/AuthContext';
import * as curriculumModule from '../hooks/useCurriculum';
import GradesPage from './GradesPage';
import * as gradesService from '../services/gradesService';
import type { AssessmentRecord } from '../services/gradesService';
import * as pdfExport from '../utils/pdfExport';
import * as progressService from '../services/progressService';
import type { User } from '../types/models';

const exportDate = '2026-09-21';
const quizDate = '2026-09-20';
const studentName = 'Ada Lovelace';

const firebaseUser: FirebaseUser = {
  displayName: studentName,
  email: 'ada@example.com',
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: '2026-09-01T00:00:00.000Z',
    lastSignInTime: '2026-09-21T00:00:00.000Z',
  },
  phoneNumber: null,
  photoURL: null,
  providerData: [],
  providerId: 'password',
  refreshToken: 'test-refresh-token',
  tenantId: null,
  uid: 'student-1',
  delete: async () => undefined,
  getIdToken: async () => 'test-id-token',
  getIdTokenResult: async () => ({
    authTime: '2026-09-21T00:00:00.000Z',
    claims: {},
    expirationTime: '2026-09-21T01:00:00.000Z',
    issuedAtTime: '2026-09-21T00:00:00.000Z',
    signInProvider: 'password',
    signInSecondFactor: null,
    token: 'test-id-token',
  }),
  reload: async () => undefined,
  toJSON: () => ({}),
};

const userProfile: User = {
  uid: firebaseUser.uid,
  email: firebaseUser.email ?? '',
  name: studentName,
  role: 'student',
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-21T00:00:00.000Z'),
};

const authContext: AuthContextType = {
  currentUser: firebaseUser,
  userProfile,
  loading: false,
  isLoggedIn: true,
  userRole: 'student',
  refreshProfile: async () => undefined,
};

const quizRecord: AssessmentRecord = {
  id: 'quiz-1',
  title: 'Functions Quiz',
  subject: 'General Mathematics',
  type: 'quiz',
  score: 88,
  totalQuestions: 10,
  completedAt: Timestamp.fromDate(new Date(`${quizDate}T09:00:00.000Z`)),
  risk: 'Low',
  intervention: '',
  xpEarned: 10,
  badgeUnlocked: '',
  semester: '2026-2027-1',
};

const expectedCsv = [
  'Grade Report',
  `Student,${studentName}`,
  `Export Date,${exportDate}`,
  'Subject Filter,all',
  'Type Filter,all',
  '',
  'Subject Performance',
  'Subject,Average Score',
  'General Mathematics,0',
  'Finite Mathematics,0',
  '',
  'Recent Quizzes',
  'Title,Subject,Score,Date,Type,Status',
  'Functions Quiz,General Mathematics,88,2026-09-20,quiz,Excellent',
].join('\n');

let capturedBlobs: Blob[] = [];
let clickedDownload: HTMLAnchorElement | null = null;
const gradeSummarySubscription = vi.spyOn(gradesService, 'subscribeToGradeSummary');
const assessmentSubscription = vi.spyOn(gradesService, 'subscribeToAssessments');
const progressSubscription = vi.spyOn(progressService, 'subscribeToUserProgress');
const curriculumSpy = vi.spyOn(curriculumModule, 'useCurriculum');
const pdfSpy = vi.spyOn(pdfExport, 'createGradesPdf');
const toastErrorSpy = vi.spyOn(toast, 'error');

function renderGradesPage(): void {
  render(
    <AuthContext.Provider value={authContext}>
      <GradesPage />
    </AuthContext.Provider>,
  );
}

function setDownloadMocks(): void {
  Object.defineProperty(window.URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      capturedBlobs.push(blob);
      return 'blob:grade-report';
    }),
  });
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
    const downloadLink = document.body.lastElementChild;
    if (downloadLink instanceof HTMLAnchorElement) {
      clickedDownload = downloadLink;
    }
  });
}

describe('GradesPage CSV/PDF export', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    capturedBlobs = [];
    clickedDownload = null;
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${exportDate}T12:00:00.000Z`));
    setDownloadMocks();

    curriculumSpy.mockReturnValue({
      subjects: [],
      isLoading: false,
      error: null,
      getSubject: () => undefined,
      getTopics: () => [],
      refetch: () => undefined,
    });
    gradeSummarySubscription.mockImplementation((_uid, onChange) => {
      onChange(null);
      return () => undefined;
    });
    assessmentSubscription.mockImplementation((_uid, onChange) => {
      onChange([quizRecord]);
      return () => undefined;
    });
    progressSubscription.mockImplementation((_uid, onChange) => {
      onChange(null);
      return () => undefined;
    });
    pdfSpy.mockReset();
    toastErrorSpy.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders CSV and PDF options in the export toggle', async () => {
    renderGradesPage();

    expect(await screen.findByRole('button', { name: 'Export Report' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Export format' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'CSV' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeInTheDocument();
  });

  it('downloads the legacy CSV bytes with the safe student filename', async () => {
    renderGradesPage();
    await screen.findByRole('button', { name: 'Export Report' });

    fireEvent.click(screen.getByRole('radio', { name: 'CSV' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export Report' }));

    await waitFor(() => expect(clickedDownload).not.toBeNull());
    expect(clickedDownload?.getAttribute('download')).toBe(`grade-report-ada-lovelace-${exportDate}.csv`);
    expect(capturedBlobs).toHaveLength(1);
    expect(new TextDecoder().decode(await capturedBlobs[0].arrayBuffer())).toBe(expectedCsv);
  });

  it('passes the shaped rows to PDF export and uses the PDF filename', async () => {
    const pdfBlob = new Blob(['pdf bytes'], { type: 'application/pdf' });
    pdfSpy.mockResolvedValue(pdfBlob);
    renderGradesPage();
    await screen.findByRole('button', { name: 'Export Report' });

    fireEvent.click(screen.getByRole('radio', { name: 'PDF' }));
    expect(screen.getByRole('radio', { name: 'PDF' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Export Report' }));

    await waitFor(() => expect(pdfSpy).toHaveBeenCalledTimes(1));
    expect(pdfSpy).toHaveBeenCalledWith({
      studentName,
      exportDate,
      subjectFilter: 'all',
      typeFilter: 'all',
      subjectRows: [
        { subject: 'General Mathematics', average: 0 },
        { subject: 'Finite Mathematics', average: 0 },
      ],
      quizRows: [
        {
          title: 'Functions Quiz',
          subject: 'General Mathematics',
          score: 88,
          date: quizDate,
          type: 'quiz',
          status: 'Excellent',
        },
      ],
    });
    await waitFor(() => expect(clickedDownload).not.toBeNull());
    expect(clickedDownload?.getAttribute('download')).toBe(`grade-report-ada-lovelace-${exportDate}.pdf`);
    expect(capturedBlobs[0]).toBe(pdfBlob);
  });

  it('keeps the empty-grades message in the CSV export', async () => {
    assessmentSubscription.mockImplementation((_uid, onChange) => {
      onChange([]);
      return () => undefined;
    });
    renderGradesPage();
    await screen.findByRole('button', { name: 'Export Report' });

    fireEvent.click(screen.getByRole('button', { name: 'Export Report' }));

    await waitFor(() => expect(capturedBlobs).toHaveLength(1));
    expect(new TextDecoder().decode(await capturedBlobs[0].arrayBuffer())).toContain(
      'No quiz data available for the selected filters',
    );
  });

  it('shows a failure toast when the browser blocks the download', async () => {
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('blocked download');
      }),
    });
    renderGradesPage();
    await screen.findByRole('button', { name: 'Export Report' });

    fireEvent.click(screen.getByRole('button', { name: 'Export Report' }));

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('Failed to download grade report. Please try again.');
    });
  });
});
