import test from "node:test";
import assert from "node:assert/strict";
import {
  chunkTokens,
  dedupeTokens,
  isInvalidTokenError,
  isWithinQuietHours,
  resolvePushPreferenceData,
  sanitizeAppRoute,
} from "./sendPush";

test("sanitizeAppRoute accepts app routes and preserves query/hash", () => {
  assert.equal(sanitizeAppRoute("/grades?tab=recent#scores"), "/grades?tab=recent#scores");
  assert.equal(sanitizeAppRoute("//evil.example/path"), null);
  assert.equal(sanitizeAppRoute("https://evil.example"), null);
  assert.equal(sanitizeAppRoute("/safe\\\\path"), null);
  assert.equal(sanitizeAppRoute("/safe\npath"), null);
});

test("quiet hours use Asia/Manila and support overnight ranges", () => {
  const inQuietHours = new Date("2025-01-01T15:00:00.000Z"); // 23:00 PHT
  const outside = new Date("2025-01-01T01:00:00.000Z"); // 09:00 PHT
  assert.equal(isWithinQuietHours(inQuietHours, "22:00", "08:00"), true);
  assert.equal(isWithinQuietHours(outside, "22:00", "08:00"), false);
  assert.equal(isWithinQuietHours(inQuietHours, "22:00", "22:00"), false);
});

test("preference resolution defaults allow, suppresses category, and permits system alerts", () => {
  const date = new Date("2025-01-01T15:00:00.000Z");
  assert.deepEqual(resolvePushPreferenceData(undefined, "achievement", date), { allowed: true });
  assert.deepEqual(resolvePushPreferenceData({ pushPreferences: { achievement: false } }, "achievement", date), { allowed: false });
  const quiet = { notifications: { quietHours: { start: "22:00", end: "08:00" } } };
  assert.deepEqual(resolvePushPreferenceData(quiet, "achievement", date), { allowed: false });
  assert.deepEqual(resolvePushPreferenceData(quiet, "system", date), { allowed: true });
});

test("token chunks never exceed FCM multicast limit and dedupe reports accurately", () => {
  const tokens = Array.from({ length: 1001 }, (_, index) => `token-${index}`);
  const batches = chunkTokens(tokens);
  assert.deepEqual(batches.map((batch) => batch.length), [500, 500, 1]);
  assert.deepEqual(dedupeTokens(["a", "a", "b", "bad token", ""]), {
    tokens: ["a", "b"], duplicate: 1, malformed: 2,
  });
});

test("invalid token classification is limited to invalid registration errors", () => {
  assert.equal(isInvalidTokenError("messaging/registration-token-not-registered"), true);
  assert.equal(isInvalidTokenError("messaging/invalid-registration-token"), true);
  assert.equal(isInvalidTokenError("messaging/invalid-argument"), true);
  assert.equal(isInvalidTokenError("messaging/unavailable"), false);
});
