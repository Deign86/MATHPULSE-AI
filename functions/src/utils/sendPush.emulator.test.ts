import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import { mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { sendPushToUsers } from "./sendPush";

const PROJECT_ID = "demo-mathpulse";
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const LOCK_PATH = join(tmpdir(), "mathpulse-demo-emulator-tests.lock");
const EMULATOR_LOCK_TIMEOUT_MS = 30_000;

async function acquireEmulatorLock(): Promise<() => Promise<void>> {
  const deadline = Date.now() + EMULATOR_LOCK_TIMEOUT_MS;
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
  throw new Error(`Timed out acquiring shared Firebase emulator lock after ${EMULATOR_LOCK_TIMEOUT_MS}ms`);
}

async function resetFirestore(): Promise<void> {
  const response = await fetch(`http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
  assert.equal(response.status, 200, `Firestore emulator reset failed: ${response.status}`);
}

test("push delivery retains successes across retry and deduplicates delivered tokens", async () => {
  assert.equal(
    process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
    PROJECT_ID,
    "Push delivery emulator tests require demo-mathpulse project identity",
  );
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Firestore emulator is required; tests must not be skipped");
  const releaseLock = await acquireEmulatorLock();
  try {
    const health = await fetch(`http://${FIRESTORE_HOST}/`);
    assert.ok(health.status < 500, `Firestore emulator health check failed: ${health.status}`);
    await resetFirestore();
  const app = admin.apps[0] ?? admin.initializeApp({ projectId: PROJECT_ID });
  await app.firestore().collection("_pushDeliveries").limit(1).get();

  const messaging = admin.messaging(app);
  const originalSend = messaging.sendEachForMulticast;
  let phase: "partial" | "retry" = "partial";
  let calls = 0;
  messaging.sendEachForMulticast = async (message) => {
    calls += 1;
    if (phase === "partial") {
      return {
        responses: message.tokens.map((token) => token !== "token-retry"
          ? { success: true, messageId: "sent" }
          : {
            success: false,
            error: Object.assign(new Error("transient FCM outage"), {
              code: "messaging/unavailable",
              toJSON: () => ({ code: "messaging/unavailable", message: "transient FCM outage" }),
            }),
          }),
        successCount: message.tokens.filter((token) => token !== "token-retry").length,
        failureCount: message.tokens.filter((token) => token === "token-retry").length,
      };
    }
    return {
      responses: message.tokens.map(() => ({ success: true, messageId: "retry-sent" })),
      successCount: message.tokens.length,
      failureCount: 0,
    };
  };

  try {
    const eventId = `phase3-partial-${Date.now()}`;
    const push = {
      title: "Quiz result",
      body: "Your result is ready",
      eventId,
      notificationType: "quiz_battle" as const,
    };
    const userRefs = ["phase3-push-user-a", "phase3-push-user-b"].map((userId) => app.firestore().collection("users").doc(userId));
    await Promise.all([
      userRefs[0].collection("fcmTokens").doc("token-success").set({ token: "token-success", active: true }),
      userRefs[0].collection("fcmTokens").doc("token-retry").set({ token: "token-retry", active: true }),
      userRefs[1].collection("fcmTokens").doc("token-other").set({ token: "token-other", active: true }),
    ]);
    const recipientIds = ["phase3-push-user-a", "phase3-push-user-b"];
    const firstAttempt = await sendPushToUsers(recipientIds, push);
    assert.deepEqual(firstAttempt, { sent: 2, failed: 1, suppressed: 0, invalidated: 0, duplicate: 0 });
    phase = "retry";
    const retryAttempt = await sendPushToUsers(recipientIds, push);
    assert.deepEqual(retryAttempt, { sent: 1, failed: 0, suppressed: 0, invalidated: 0, duplicate: 2 });
  } finally {
    messaging.sendEachForMulticast = originalSend;
  }
  } finally {
    try {
      await resetFirestore();
    } finally {
      await releaseLock();
    }
  }
});
