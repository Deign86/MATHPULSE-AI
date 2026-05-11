import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ── Types ──────────────────────────────────────────────────────────────
export interface AssessmentRecord {
  id: string;               // auto-generated Firestore ID
  title: string;            // e.g. "Diagnostic Assessment"
  subject: string;          // e.g. "General Mathematics"
  type: 'diagnostic' | 'quiz' | 'practice';
  score: number;            // overallScorePercent (0-100)
  totalQuestions: number;
  completedAt: Timestamp;
  risk: string;
  intervention: string;
  xpEarned: number;
  badgeUnlocked: string;
  semester: string;        // "2025-2026-1" derived from current date
  createdAt?: Timestamp;
}

export interface GradeSummary {
  overallGpa: number;       // (averageScore / 100) * 4.0
  averageScore: number;     // rolling average
  quizzesCompleted: number; // count
  subjectPerformance: {
    [subject: string]: { totalScore: number; count: number; avgScore: number }
  };
  lastUpdated: Timestamp;
}

export interface SaveAssessmentParams {
  uid: string;
  testId: string;
  title: string;
  subject: string;
  type: 'diagnostic' | 'quiz' | 'practice';
  score: number;
  totalQuestions: number;
  risk: string;
  intervention: string;
  xpEarned: number;
  badgeUnlocked: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

const getCurrentSemester = (): string => {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed (0=Jan, 7=Aug)
  const year = now.getFullYear();

  if (month >= 7) {
    // Aug-Dec
    return `${year}-${year + 1}-1`;
  } else if (month >= 5) {
    // Jun-Jul (Summer/Midyear)
    return `${year - 1}-${year}-summer`;
  } else {
    // Jan-May
    return `${year - 1}-${year}-2`;
  }
};

// ── Functions ─────────────────────────────────────────────────────────

export const saveAssessmentResult = async (params: SaveAssessmentParams): Promise<string> => {
  const { uid, score, subject, title } = params;
  const targetSubject = subject || title || 'General';

  let assessmentId = '';

  await runTransaction(db, async (transaction) => {
    const summaryRef = doc(db, 'users', uid, 'gradeSummary', 'current');
    const summarySnap = await transaction.get(summaryRef);

    let summaryData: GradeSummary;

    if (!summarySnap.exists()) {
      summaryData = {
        overallGpa: (score / 100) * 4.0,
        averageScore: score,
        quizzesCompleted: 1,
        subjectPerformance: {
          [targetSubject]: { totalScore: score, count: 1, avgScore: score }
        },
        lastUpdated: Timestamp.now()
      };
    } else {
      const prev = summarySnap.data() as GradeSummary;
      const newCount = (prev.quizzesCompleted || 0) + 1;
      const newTotal = ((prev.averageScore || 0) * (prev.quizzesCompleted || 0)) + score;
      const newAverage = newTotal / newCount;

      const subjPerf = prev.subjectPerformance || {};
      const prevSubj = subjPerf[targetSubject] || { totalScore: 0, count: 0, avgScore: 0 };
      const newSubjCount = prevSubj.count + 1;
      const newSubjTotal = prevSubj.totalScore + score;
      const newSubjAvg = newSubjTotal / newSubjCount;

      summaryData = {
        overallGpa: (newAverage / 100) * 4.0,
        averageScore: newAverage,
        quizzesCompleted: newCount,
        subjectPerformance: {
          ...subjPerf,
          [targetSubject]: {
            totalScore: newSubjTotal,
            count: newSubjCount,
            avgScore: newSubjAvg
          }
        },
        lastUpdated: Timestamp.now()
      };
    }

    // Write updated summary
    transaction.set(summaryRef, summaryData, { merge: true });

    // Write assessment record
    const assessmentsCol = collection(db, 'users', uid, 'assessments');
    const newDocRef = doc(assessmentsCol);
    assessmentId = newDocRef.id;

    const record: Omit<AssessmentRecord, 'id'> = {
      title: params.title,
      subject: targetSubject,
      type: params.type,
      score: params.score,
      totalQuestions: params.totalQuestions,
      completedAt: Timestamp.now(),
      risk: params.risk,
      intervention: params.intervention,
      xpEarned: params.xpEarned,
      badgeUnlocked: params.badgeUnlocked,
      semester: getCurrentSemester(),
      createdAt: serverTimestamp() as Timestamp
    };

    transaction.set(newDocRef, record);
  });

  return assessmentId;
};

export const subscribeToGradeSummary = (
  uid: string,
  onChange: (summary: GradeSummary | null) => void
): (() => void) => {
  const summaryRef = doc(db, 'users', uid, 'gradeSummary', 'current');
  return onSnapshot(summaryRef, (docSnap) => {
    if (docSnap.exists()) {
      onChange(docSnap.data() as GradeSummary);
    } else {
      onChange(null);
    }
  });
};

export const subscribeToAssessments = (
  uid: string,
  onChange: (assessments: AssessmentRecord[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'users', uid, 'assessments'),
    orderBy('completedAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const results: AssessmentRecord[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as AssessmentRecord);
    });
    onChange(results);
  });
};
