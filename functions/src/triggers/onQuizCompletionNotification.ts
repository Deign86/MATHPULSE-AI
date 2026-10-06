import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { createNotification } from "../automations/notificationSender";

type QuizSubmission = {
  studentId?: string;
  assignmentId?: string;
  quizId?: string;
  subject?: string;
  score?: number;
};

type QuizAssignment = {
  lrn?: string;
  teacherId?: string | number;
};

type ClassSectionOwnership = {
  studentUids?: string[];
  ownerTeacherId?: string;
  teacherId?: string;
};

type TeacherProfile = {
  role?: "teacher" | "student" | "admin";
};

function parseString<Value>(value: Value): string | undefined {
  return Object.prototype.toString.call(value) === "[object String]" ? String(value) : undefined;
}

function parseNumber<Value>(value: Value): number | undefined {
  const number = Number(value);
  return Object.prototype.toString.call(value) === "[object Number]"
    ? number
    : undefined;
}

function parseStudentUids<Value>(value: Value): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const studentUids = value.map(parseString);
  return studentUids.every((studentUid) => studentUid !== undefined)
    ? studentUids.filter((studentUid): studentUid is string => studentUid !== undefined)
    : undefined;
}

function parseQuizSubmission(data: admin.firestore.DocumentData): QuizSubmission {
  return {
    studentId: parseString(data.studentId),
    assignmentId: parseString(data.assignmentId),
    quizId: parseString(data.quizId),
    subject: parseString(data.subject),
    score: parseNumber(data.score),
  };
}

function parseQuizAssignment(data: admin.firestore.DocumentData | undefined): QuizAssignment | undefined {
  if (!data) return undefined;
  return { lrn: parseString(data.lrn), teacherId: parseString(data.teacherId) };
}

function parseClassSectionOwnership(
  data: admin.firestore.DocumentData | undefined,
): ClassSectionOwnership | undefined {
  if (!data) return undefined;
  return {
    studentUids: parseStudentUids(data.studentUids),
    ownerTeacherId: parseString(data.ownerTeacherId),
  };
}

function parseTeacherProfile(data: admin.firestore.DocumentData | undefined): TeacherProfile | undefined {
  if (!data) return undefined;
  const role = parseString(data.role);
  return { role: role === "teacher" || role === "student" || role === "admin" ? role : undefined };
}

export function assignmentTeacherId(
  assignment: QuizAssignment | undefined,
  studentId: string,
): string | null {
  const teacherId = parseString(assignment?.teacherId);
  return assignment?.lrn === studentId && teacherId !== undefined ? teacherId : null;
}

export function enrollmentTeacherId(
  ownership: ClassSectionOwnership | undefined,
  studentId: string,
): string | null {
  const studentUids = ownership?.studentUids;
  const ownerTeacherId = ownership?.ownerTeacherId;
  if (
    Array.isArray(studentUids) &&
    studentUids.includes(studentId) &&
    ownerTeacherId !== undefined
  ) return ownerTeacherId;
  return null;
}

async function resolveTeacherId(
  db: admin.firestore.Firestore,
  submission: QuizSubmission,
  studentId: string,
): Promise<string | null> {
  let candidateTeacherId: string | null = null;
  if (submission.assignmentId && submission.assignmentId.length > 0) {
    const assignment = await db.collection("quizAssignments").doc(submission.assignmentId).get();
    candidateTeacherId = assignmentTeacherId(
      assignment.exists ? parseQuizAssignment(assignment.data()) : undefined,
      studentId,
    );
  }

  if (!candidateTeacherId) {
    const ownershipDocs = await db.collection("classSectionOwnership")
      .where("studentUids", "array-contains", studentId)
      .limit(1)
      .get();
    const ownership = parseClassSectionOwnership(ownershipDocs.docs[0]?.data());
    candidateTeacherId = enrollmentTeacherId(ownership, studentId);
  }
  if (!candidateTeacherId) return null;

  const teacher = await db.collection("users").doc(candidateTeacherId).get();
  return teacher.exists && parseTeacherProfile(teacher.data())?.role === "teacher" ? candidateTeacherId : null;
}

export const onQuizCompletionNotification = onDocumentCreated(
  "quizSubmissions/{submissionId}",
  async (event) => {
    if (!event.data) return null;
    const submission = parseQuizSubmission(event.data.data());
    if (!submission.studentId) return null;

    const db = admin.firestore();
    const teacherId = await resolveTeacherId(db, submission, submission.studentId);
    if (!teacherId) {
      console.info("[QUIZ_NOTIFY] No trusted teacher enrollment found", {
        submissionId: event.params.submissionId,
        studentId: submission.studentId,
      });
      return null;
    }

    const subject = submission.subject ?? "a lesson";
    const score = submission.score === undefined ? "completed" : `${submission.score}%`;
    await createNotification({
      userId: teacherId,
      type: "quiz_completed",
      recipientRole: "teacher",
      studentId: submission.studentId,
      title: "Student quiz completed",
      message: `A student completed ${subject} with a score of ${score}.`,
      link: "/teacher",
    });
    return null;
  },
);
