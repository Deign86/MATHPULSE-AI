// src/services/pipelineService.ts
// Fire-and-forget event emitter for the Student Intelligence Pipeline.
// Never blocks UI. Errors are logged, never shown to students.

import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

export interface PipelineEvent {
  student_id: string;
  event_type: 'diagnostic' | 'quiz' | 'battle' | 'lesson' | 'module' | 'session';
  event_data: Record<string, unknown>;
  occurred_at: string;
  class_id: string;
  teacher_id: string;
}

/**
 * Fire-and-forget pipeline event emission.
 * Never awaited by callers — does not block UX.
 */
export function emitPipelineEvent(event: PipelineEvent): void {
  (async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken(false);
      await fetch(`${API_BASE}/api/pipeline/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(event),
      });
    } catch (err) {
      console.warn('[pipeline] event emit failed (non-blocking):', err);
    }
  })();
}

// Cache for student context (class_id, teacher_id)
let _cachedContext: { classId: string; teacherId: string } | null = null;

export function setStudentContext(classId: string, teacherId: string): void {
  _cachedContext = { classId, teacherId };
}

export function getStudentContext(): { classId: string; teacherId: string } | null {
  return _cachedContext;
}
