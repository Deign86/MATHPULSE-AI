import { doc, getDoc, db } from '../lib/firebase';
import type { StudentProfile } from '../types/models';

export interface StudentScore {
  subject: string;
  score: number;
  status: string;
}

export async function getStudentById(uid: string): Promise<StudentProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;
    return userSnap.data() as StudentProfile;
  } catch (error) {
    console.error('[studentDataService.getStudentById] Error:', error);
    return null;
  }
}

export async function getStudentScores(uid: string): Promise<StudentScore[]> {
  try {
    const profile = await getStudentById(uid);
    if (!profile) return [];

    const scores: StudentScore[] = [];
    const seen = new Set<string>();

    if (profile.riskClassifications) {
      for (const [subject, rc] of Object.entries(profile.riskClassifications)) {
        scores.push({
          subject,
          score: rc.score ?? 0,
          status: rc.status ?? 'At Risk',
        });
        seen.add(subject);
      }
    }

    if (profile.topicScores) {
      for (const [subject, score] of Object.entries(profile.topicScores)) {
        if (seen.has(subject)) {
          const existing = scores.find((s) => s.subject === subject);
          if (existing) existing.score = score;
        } else {
          scores.push({
            subject,
            score,
            status: score >= 75 ? 'On Track' : 'At Risk',
          });
          seen.add(subject);
        }
      }
    }

    if (profile.subjectBadges) {
      for (const [subject, badge] of Object.entries(profile.subjectBadges)) {
        const existing = scores.find((s) => s.subject === subject);
        if (existing) {
          existing.status = badge;
        } else {
          scores.push({ subject, score: 0, status: badge });
        }
      }
    }

    return scores;
  } catch (error) {
    console.error('[studentDataService.getStudentScores] Error:', error);
    return [];
  }
}

export async function getStudentFlaggedTopics(uid: string): Promise<string[]> {
  try {
    const profile = await getStudentById(uid);
    return profile?.flaggedTopics ?? [];
  } catch (error) {
    console.error('[studentDataService.getStudentFlaggedTopics] Error:', error);
    return [];
  }
}
