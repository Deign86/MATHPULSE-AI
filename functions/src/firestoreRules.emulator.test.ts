import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, rmdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PROJECT_ID = "demo-mathpulse";
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const DOCUMENTS_URL = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const LOCK_PATH = join(tmpdir(), "mathpulse-demo-emulator-tests.lock");
const EMULATOR_LOCK_TIMEOUT_MS = 30_000;

async function acquireEmulatorLock(timeoutMs = EMULATOR_LOCK_TIMEOUT_MS): Promise<() => Promise<void>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await mkdir(LOCK_PATH);
      return async () => rmdir(LOCK_PATH);
    } catch (error) {
      if (error instanceof Error && error.message.includes("EEXIST")) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Timed out acquiring shared Firebase emulator lock after ${timeoutMs}ms`);
}

function authToken(uid: string, role?: string): string {
  const encode = (payload: string): string => Buffer.from(payload).toString("base64url");
  return `${encode("{\"alg\":\"none\",\"typ\":\"JWT\"}")}.${encode(JSON.stringify({
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: uid,
    user_id: uid,
    iat: 1,
    exp: 4_102_444_800,
    firebase: { sign_in_provider: "custom" },
    role,
  }))}.`;
}

interface FirestoreStringFields {
  userId?: string;
  progress?: string;
  displayName?: string;
  role?: string;
  xp?: string;
  type?: string;
  status?: string;
}

function stringFields(values: FirestoreStringFields) {
  return { fields: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { stringValue: value }])) };
}

async function firestoreRequest(path: string, uid?: string, role?: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  if (uid) headers.set("authorization", `Bearer ${authToken(uid, role)}`);
  return fetch(`${DOCUMENTS_URL}${path}`, { ...init, headers });
}

async function resetFirestore(): Promise<void> {
  const response = await fetch(`http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
  assert.equal(response.status, 200, `Firestore emulator reset failed: ${response.status}`);
}

async function runIsolated(operation: () => Promise<void>): Promise<void> {
  assert.equal(
    process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
    PROJECT_ID,
    "Firestore rules tests require demo-mathpulse project identity",
  );
  assert.ok(FIRESTORE_HOST, "Firestore emulator is required; tests must not be skipped");
  const releaseLock = await acquireEmulatorLock();
  try {
    const health = await fetch(`http://${FIRESTORE_HOST}/`);
    assert.ok(health.status < 500, `Firestore emulator health check failed: ${health.status}`);
    await resetFirestore();
    await operation();
  } finally {
    try {
      await resetFirestore();
    } finally {
      await releaseLock();
    }
  }
}

test("Firestore emulator lock acquisition fails promptly when another holder owns it", async () => {
  await mkdir(LOCK_PATH);
  let createdLock = true;
  const startedAt = Date.now();
  try {
    await assert.rejects(
      acquireEmulatorLock(100),
      new RegExp("Timed out acquiring shared Firebase emulator lock after 100ms"),
    );
    assert.ok(Date.now() - startedAt < 2_000, "lock acquisition should fail promptly");
    assert.ok((await stat(LOCK_PATH)).isDirectory(), "the existing holder's lock must remain present");
  } finally {
    if (createdLock) {
      await rmdir(LOCK_PATH);
      createdLock = false;
    }
  }
});

test("Firestore rules enforce document ownership", async () => runIsolated(async () => {
  const write = await firestoreRequest("/progress/owned-progress", "owner", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ userId: "owner", progress: "started" })),
  });
  assert.equal(write.status, 200);
  const ownerRead = await firestoreRequest("/progress/owned-progress", "owner");
  assert.equal(ownerRead.status, 200);
  const otherRead = await firestoreRequest("/progress/owned-progress", "other");
  assert.equal(otherRead.status, 403);
  const wrongOwnerWrite = await firestoreRequest("/progress/stolen-progress", "other", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ userId: "owner", progress: "started" })),
  });
  assert.equal(wrongOwnerWrite.status, 403);
}));

test("Firestore rules deny user role privilege escalation", async () => runIsolated(async () => {
  const create = await firestoreRequest("/users/student-user", "student-user", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ displayName: "Student" })),
  });
  assert.equal(create.status, 200);
  const escalation = await firestoreRequest("/users/student-user", "student-user", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ displayName: "Student", role: "admin" })),
  });
  assert.equal(escalation.status, 403);
}));

test("Firestore rules keep server-only records unwritable by clients", async () => runIsolated(async () => {
  const write = await firestoreRequest("/studentProgress/student-user/stats/summary", "student-user", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ xp: "100" })),
  });
  assert.equal(write.status, 403);
  const privateDelivery = await firestoreRequest("/_pushDeliveries/delivery-1", "student-user", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ status: "delivered" })),
  });
  assert.equal(privateDelivery.status, 403);
}));

test("Firestore notification rules scope recipients and block privileged types", async () => runIsolated(async () => {
  const studentInbox = await firestoreRequest("/notifications/student-a/items/self-item", "student-a", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ userId: "student-a", type: "system" })),
  });
  assert.equal(studentInbox.status, 200);
  const crossRecipient = await firestoreRequest("/notifications/student-b/items/cross-item", "student-a", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ userId: "student-b", type: "system" })),
  });
  assert.equal(crossRecipient.status, 403);

  const teacher = await firestoreRequest("/users/teacher-user", "teacher-user", undefined, {
    method: "PATCH",
    body: JSON.stringify(stringFields({ role: "teacher" })),
  });
  assert.equal(teacher.status, 200);
  const teacherNotification = await firestoreRequest("/notifications/student-b/items/assignment", "teacher-user", "teacher", {
    method: "PATCH",
    body: JSON.stringify(stringFields({ userId: "student-b", type: "assignment" })),
  });
  assert.equal(teacherNotification.status, 200);
  const privilegedNotification = await firestoreRequest("/notifications/student-b/items/risk", "teacher-user", "teacher", {
    method: "PATCH",
    body: JSON.stringify(stringFields({ userId: "student-b", type: "risk_alert" })),
  });
  assert.equal(privilegedNotification.status, 403);
}));
