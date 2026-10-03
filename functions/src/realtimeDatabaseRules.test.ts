import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import { createConnection } from "node:net";
import { mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PROJECT_ID = "demo-mathpulse";
const DATABASE_URL = `http://127.0.0.1:9000/?ns=${PROJECT_ID}-default-rtdb`;
const LOCK_PATH = join(tmpdir(), "mathpulse-demo-emulator-tests.lock");
const EMULATOR_LOCK_TIMEOUT_MS = 30_000;

function authToken(uid: string): string {
  const encode = (payload: string): string => Buffer.from(payload).toString("base64url");
  return `${encode("{\"alg\":\"none\",\"typ\":\"JWT\"}")}.${encode(JSON.stringify({
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: uid,
    user_id: uid,
    iat: 1,
    exp: 4_102_444_800,
    firebase: { sign_in_provider: "custom" },
  }))}.`;
}

const emulatorUrl = (path: string, uid?: string): string => {
  const url = new URL(DATABASE_URL);
  url.pathname = path;
  if (uid) url.searchParams.set("auth", authToken(uid));
  return url.toString();
};

async function acquireEmulatorLock(): Promise<() => Promise<void>> {
  const deadline = Date.now() + EMULATOR_LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await mkdir(LOCK_PATH);
      return async () => rmdir(LOCK_PATH);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error(`Timed out acquiring shared Firebase emulator lock after ${EMULATOR_LOCK_TIMEOUT_MS}ms`);
}

async function assertEmulatorAvailable(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const connection = createConnection({ host: "127.0.0.1", port: 9000 });
    connection.once("connect", () => { connection.end(); resolve(); });
    connection.once("error", reject);
  });
}

async function resetDatabase(uid: string): Promise<void> {
  const url = emulatorUrl(`/quizBattlePresence/queue/resource-${uid}/${uid}.json`, uid);
  const response = await fetch(url, { method: "DELETE" });
  assert.equal(response.ok, true, `RTDB emulator reset failed for ${uid}: ${response.status}`);
}

test("RTDB presence rules enforce identity, validation, and owner deletion", async (t: TestContext) => {
  if ((process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT) !== PROJECT_ID) {
    t.skip("RTDB rules tests require demo-mathpulse project identity");
    return;
  }
  const releaseLock = await acquireEmulatorLock();
  const uid = "phase3-presence-owner";
  let emulatorAvailable = false;
  let presenceCreated = false;
  let ownerDeleteAttempted = false;
  try {
    await assertEmulatorAvailable();
    emulatorAvailable = true;

    const otherUid = "phase3-presence-other";
    const path = `/quizBattlePresence/queue/resource-${uid}/${uid}.json`;
    const presence = {
      studentId: uid,
      scope: "queue",
      resourceId: `resource-${uid}`,
      online: true,
      heartbeatAt: Date.now(),
      updatedAt: Date.now(),
    };

    const anonymousWrite = await fetch(emulatorUrl(path), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(presence),
    });
    assert.equal(anonymousWrite.status, 401);

    const wrongOwnerWrite = await fetch(emulatorUrl(path, otherUid), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(presence),
    });
    assert.equal(wrongOwnerWrite.status, 401);

    const ownerWriteUrl = emulatorUrl(path, uid);
    const validWrite = await fetch(ownerWriteUrl, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(presence),
    });
    assert.equal(validWrite.ok, true, `Owner write failed at ${ownerWriteUrl}: ${validWrite.status} ${await validWrite.text()}`);
    presenceCreated = true;

    const invalidWrite = await fetch(emulatorUrl(path, uid), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ online: "yes", unexpectedField: true }),
    });
    assert.equal(invalidWrite.status, 401);

    ownerDeleteAttempted = true;
    const ownerDelete = await fetch(emulatorUrl(path, uid), { method: "DELETE" });
    assert.equal(ownerDelete.ok, true, `Owner delete failed: ${ownerDelete.status}`);
    const persisted = await fetch(emulatorUrl(path, uid));
    assert.equal(await persisted.json(), null);
  } finally {
    try {
      if (emulatorAvailable && presenceCreated && !ownerDeleteAttempted) await resetDatabase(uid);
    } finally {
      await releaseLock();
    }
  }
});
