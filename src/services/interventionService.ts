// src/services/interventionService.ts
// Service layer for Intervention Center backend API

import { auth } from '../lib/firebase';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

// ─── Types ────────────────────────────────────────────────────

export interface LearningStep {
  step_number: number;
  type: 'video_lesson' | 'practice' | 'assessment' | 'chat_session' | 'review';
  title: string;
  description: string;
  duration_minutes: number;
  num_items: number | null;
  topic: string;
  competency_tag: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_completed: boolean;
  completion_score: number | null;
  youtube_query?: string;
}

export interface LearningPath {
  student_id: string;
  generated_at: string;
  methodology_tags: string[];
  steps: LearningStep[];
  estimated_duration_days: number;
  primary_weak_topic: string;
  all_weak_topics: string[];
  ai_rationale: string;
}

export interface InterventionPlan {
  student_id: string;
  student_name: string;
  grade_level: string;
  section: string;
  risk_level: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Critical' | 'Unassessed';
  avg_score: number;
  engagement_level: 'Low' | 'Medium' | 'High';
  last_active: string | null;
  weakest_topic: string;
  weak_topics: string[];
  accuracy_by_topic: Record<string, number>;
  learning_strengths: string;
  next_steps_summary: string;
  learning_path: LearningPath | null;
  generated_at: string;
  teacher_recommendations: string[];
}

// ─── Helpers ──────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken(false);
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    } catch { /* non-critical */ }
  }
  return headers;
}

// ─── API Functions ────────────────────────────────────────────

export async function getInterventionPlan(studentId: string): Promise<InterventionPlan> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/intervention/${encodeURIComponent(studentId)}`, { headers });
  if (!res.ok) throw new Error(`GET intervention failed: ${res.status}`);
  return res.json();
}

export async function generateInterventionPlan(studentId: string): Promise<InterventionPlan> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/intervention/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ student_id: studentId }),
  });
  if (!res.ok) throw new Error(`POST intervention/generate failed: ${res.status}`);
  return res.json();
}

export async function completeStep(
  studentId: string,
  stepNumber: number,
  score: number,
  timeSpentMinutes: number
): Promise<{ status: string; step_number: number; score: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/intervention/${encodeURIComponent(studentId)}/step/${stepNumber}/complete`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ score, time_spent_minutes: timeSpentMinutes }),
    }
  );
  if (!res.ok) throw new Error(`POST step complete failed: ${res.status}`);
  return res.json();
}

export async function getExportPDFData(studentId: string): Promise<InterventionPlan> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/intervention/${encodeURIComponent(studentId)}/export-pdf`,
    { headers }
  );
  if (!res.ok) throw new Error(`GET export-pdf failed: ${res.status}`);
  return res.json();
}

export async function assignLearningPathAsModule(
  plan: InterventionPlan,
  teacherId: string,
): Promise<string> {
  const steps = plan.learning_path?.steps || [];
  const sections = steps.map((s) => ({
    title: `Step ${s.step_number}: ${s.title}`,
    content: `${s.description || s.topic} (${s.type.replace('_', ' ')} · ${s.duration_minutes} mins${s.num_items ? ` · ${s.num_items} items` : ''})`,
  }));

  const docRef = await addDoc(collection(db, 'modules'), {
    title: `Intervention: ${plan.weakest_topic} — ${plan.student_name}`,
    gradeLevel: plan.grade_level || 'Grade 11',
    subject: 'General Mathematics',
    quarter: 'Q1',
    strandOrTrack: null,
    competencyTags: plan.weak_topics.slice(0, 3),
    moduleType: 'teacher_uploaded',
    sourceLabel: 'Teacher Upload',
    summary: plan.next_steps_summary || `Personalized intervention for ${plan.weakest_topic}`,
    learningObjectives: [
      plan.learning_strengths,
      plan.next_steps_summary,
    ].filter(Boolean),
    sections,
    practice: [],
    teacherId,
    assignedTo: plan.student_id,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
