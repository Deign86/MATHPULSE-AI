import {
  db,
  doc,
  getDoc,
  getDocs,
  collection,
  firestoreQuery,
  orderBy,
} from '../lib/firebase';
import { API_URL, getAuthHeaders } from '../lib/api';

export interface QuarterlyGrade {
  id: string;
  subject: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  final: number;
  remarks: string;
}

function getDefaultSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Philippine school year typically starts in June/July
  if (month >= 5) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function normalizeGradeDoc(
  id: string,
  data: Record<string, unknown>
): QuarterlyGrade {
  const num = (v: unknown) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseFloat(v) || 0;
    return 0;
  };

  return {
    id,
    subject: String(data.subject || data.name || 'Unknown Subject'),
    q1: num(data.q1),
    q2: num(data.q2),
    q3: num(data.q3),
    q4: num(data.q4),
    final: num(data.final),
    remarks: String(data.remarks ?? ''),
  };
}

export async function getStudentGrades(
  uid: string,
  schoolYear?: string
): Promise<QuarterlyGrade[]> {
  const year = schoolYear || getDefaultSchoolYear();

  // Try Firestore first
  try {
    const colRef = collection(db, 'users', uid, 'grades', year, 'subjects');
    const snapshot = await getDocs(firestoreQuery(colRef, orderBy('subject', 'asc')));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => normalizeGradeDoc(d.id, d.data() as Record<string, unknown>));
    }
  } catch (err) {
    console.warn('[gradesService] Firestore read failed, falling back to API:', err);
  }

  // Fallback to API
  try {
    const res = await fetch(
      `${API_URL}/api/grades/${uid}?schoolYear=${encodeURIComponent(year)}`,
      { headers: await getAuthHeaders() }
    );
    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }
    const body = (await res.json()) as { grades?: QuarterlyGrade[] };
    return body.grades ?? [];
  } catch (err) {
    console.error('[gradesService] API fallback failed:', err);
    return [];
  }
}

export async function getAvailableSchoolYears(uid: string): Promise<string[]> {
  // Try Firestore first
  try {
    const colRef = collection(db, 'users', uid, 'grades');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const years = snapshot.docs.map((d) => d.id);
      years.sort().reverse();
      return years;
    }
  } catch (err) {
    console.warn('[gradesService] Firestore years read failed, falling back to API:', err);
  }

  // Fallback to API
  try {
    const res = await fetch(`${API_URL}/api/grades/${uid}/years`, {
      headers: await getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }
    const body = (await res.json()) as { years?: string[] };
    const years = body.years ?? [];
    years.sort().reverse();
    return years;
  } catch (err) {
    console.error('[gradesService] API years fallback failed:', err);
    return [getDefaultSchoolYear()];
  }
}
