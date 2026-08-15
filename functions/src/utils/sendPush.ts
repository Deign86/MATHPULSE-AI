import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

export type PushNotificationType =
  | "achievement"
  | "quiz_battle"
  | "daily_reward"
  | "assignment"
  | "grade_posted"
  | "streak_reminder"
  | "leaderboard"
  | "system";

export const PUSH_NOTIFICATION_TYPES: readonly PushNotificationType[] = [
  "achievement", "quiz_battle", "daily_reward", "assignment", "grade_posted",
  "streak_reminder", "leaderboard", "system",
];

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  eventId?: string;
  notificationType: PushNotificationType;
  icon?: string;
  badge?: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  suppressed: number;
  invalidated: number;
  duplicate: number;
}

export interface SendPushTokenOptions {
  /** User owning the tokens. Required for delivery deduplication and cleanup. */
  userId?: string;
  tokenRefs?: Map<string, FirebaseFirestore.DocumentReference>;
}

const DEFAULT_ICON = "/mathpulse_final_logo.png";
const DEFAULT_BADGE = "/mathpulse_final_logo.png";
const MAX_BATCH = 500;
const RECIPIENT_CONCURRENCY = 8;
const MAX_RETRIES = 2;
const DELIVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/** FCM error classification is exported so callers/tests cannot duplicate it. */
export function isInvalidTokenError(code: unknown): boolean {
  return typeof code === "string" && INVALID_TOKEN_CODES.has(code);
}

/** Only app-relative routes are accepted. Query strings and hashes are retained. */
export function sanitizeAppRoute(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value[0] !== "/") return null;
  if (value.startsWith("//") || /[\\\r\n]/.test(value)) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return null;
  return value;
}

// Alias retained for consumers that prefer the longer name.
export const sanitizeAppRelativeRoute = sanitizeAppRoute;

export function emptyPushResult(): PushResult {
  return { sent: 0, failed: 0, suppressed: 0, invalidated: 0, duplicate: 0 };
}

function addResults(target: PushResult, value: PushResult): void {
  target.sent += value.sent;
  target.failed += value.failed;
  target.suppressed += value.suppressed;
  target.invalidated += value.invalidated;
  target.duplicate += value.duplicate;
}

function isToken(value: unknown): value is string {
  // FCM registration tokens are opaque, but cannot contain whitespace/control chars.
  return typeof value === "string" && value.length > 0 && value.length <= 4096 && !/[\s\u0000-\u001f\u007f]/.test(value);
}

function stableEventId(userId: string, payload: PushPayload): string {
  if (payload.eventId && /^[\w:./-]{1,200}$/.test(payload.eventId)) return payload.eventId;
  // Deterministic fallback keeps old callers compile-compatible while making retries idempotent.
  return `derived-${Buffer.from(JSON.stringify({ userId, title: payload.title, body: payload.body, url: payload.url || "/", tag: payload.tag || "", type: payload.notificationType })).toString("base64url")}`.slice(0, 200);
}

function deliveryId(eventId: string, userId: string): string {
  return Buffer.from(`${eventId}\u0000${userId}`).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 150);
}

function dateValue(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (value && typeof (value as { toMillis?: () => number }).toMillis === "function") return (value as { toMillis: () => number }).toMillis();
  return 0;
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Returns whether a local clock is within a possibly overnight quiet period. */
export function isWithinQuietHours(date: Date, start: unknown, end: unknown, timeZone = "Asia/Manila"): boolean {
  if (!validTime(start) || !validTime(end) || start === end) return false;
  let local: string;
  try {
    local = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  } catch {
    local = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  }
  const minutes = (Number(local.slice(0, 2)) * 60) + Number(local.slice(3, 5));
  const begin = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
  const finish = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5));
  return begin < finish ? minutes >= begin && minutes < finish : minutes >= begin || minutes < finish;
}

interface PreferenceDecision { allowed: boolean; }

export function resolvePushPreferenceData(data: Record<string, unknown> | undefined, type: PushNotificationType, now = new Date()): PreferenceDecision {
  if (!data) return { allowed: true };
  const push = (data.pushPreferences || {}) as Record<string, unknown>;
  if (push.pushEnabled === false || push[type] === false) return { allowed: false };
  // System alerts are allowed during quiet hours. Other categories are deferred/suppressed.
  if (type !== "system") {
    const notifications = (data.notifications || {}) as Record<string, unknown>;
    const quiet = (notifications.quietHours || {}) as Record<string, unknown>;
    if (isWithinQuietHours(now, quiet.start, quiet.end, typeof quiet.timeZone === "string" ? quiet.timeZone : "Asia/Manila")) return { allowed: false };
  }
  return { allowed: true };
}

/** Preference reads fail closed; an absent preferences document defaults to allow. */
export async function resolvePushPreferences(userId: string, type: PushNotificationType, now = new Date()): Promise<PreferenceDecision> {
  try {
    const snap = await admin.firestore().doc(`users/${userId}/settings/preferences`).get();
    return resolvePushPreferenceData(snap.exists ? snap.data() : undefined, type, now);
  } catch (error) {
    functions.logger.warn("[sendPush] preference read failed; failing closed", { userId, error: error instanceof Error ? error.message : "unknown" });
    return { allowed: false };
  }
}

async function claimDelivery(userId: string, eventId: string): Promise<"claimed" | "duplicate"> {
  const ref = admin.firestore().collection("_pushDeliveries").doc(deliveryId(eventId, userId));
  const now = Date.now();
  let duplicate = false;
  await admin.firestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const old = snap.exists ? snap.data() || {} : {};
    const status = old.status as string | undefined;
    const fresh = dateValue(old.expiresAt) > now;
    const processingFresh = status === "processing" && now - dateValue(old.processingAt) < PROCESSING_TIMEOUT_MS;
    // Delivered claims suppress trigger retries. A fresh processing claim is
    // still owned by another invocation; stale processing claims are safely
    // recovered. Failed claims remain retryable and are never permanent.
    if ((fresh && status === "delivered") || (fresh && status === "processing" && processingFresh)) {
      duplicate = true;
      return;
    }
    transaction.set(ref, {
      eventId,
      userId,
      status: "processing",
      processingAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(now + DELIVERY_TTL_MS),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return duplicate ? "duplicate" : "claimed";
}

async function finishDelivery(userId: string, eventId: string, status: "delivered" | "failed"): Promise<void> {
  await admin.firestore().collection("_pushDeliveries").doc(deliveryId(eventId, userId)).set({
    status,
    finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

function payloadData(payload: PushPayload): Record<string, string> {
  const url = sanitizeAppRoute(payload.url || "/");
  if (!url) throw new Error("Push URL must be a single-leading-slash app route");
  return {
    title: String(payload.title),
    body: String(payload.body),
    icon: String(payload.icon || DEFAULT_ICON),
    badge: String(payload.badge || DEFAULT_BADGE),
    tag: String(payload.tag || `mathpulse-${payload.notificationType}`),
    eventId: String(payload.eventId || ""),
    url,
    notificationType: String(payload.notificationType),
  };
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

export function chunkTokens(tokens: string[], size = MAX_BATCH): string[][] {
  return chunks(tokens, Math.min(Math.max(1, size), MAX_BATCH));
}

export function dedupeTokens(tokens: string[]): { tokens: string[]; duplicate: number; malformed: number } {
  const unique: string[] = [];
  const seen = new Set<string>();
  let duplicate = 0;
  let malformed = 0;
  for (const token of tokens) {
    if (!isToken(token)) { malformed += 1; continue; }
    if (seen.has(token)) { duplicate += 1; continue; }
    seen.add(token); unique.push(token);
  }
  return { tokens: unique, duplicate, malformed };
}

function wait(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }

interface BatchSendResult { sent: number; failed: number; invalidated: number; }

async function sendBatch(tokens: string[], data: Record<string, string>, refs?: Map<string, FirebaseFirestore.DocumentReference>): Promise<BatchSendResult> {
  let response: admin.messaging.BatchResponse | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      response = await admin.messaging().sendEachForMulticast({
        tokens,
        data,
        // Deliberately omit notification and webpush.notification: the service worker displays once.
        webpush: { fcmOptions: { link: data.url } },
      });
      break;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        functions.logger.error("[sendPush] FCM batch failed", { count: tokens.length, error: error instanceof Error ? error.message : "unknown" });
        return { sent: 0, failed: tokens.length, invalidated: 0 };
      }
      await wait(50 * (2 ** attempt));
    }
  }
  if (!response) return { sent: 0, failed: tokens.length, invalidated: 0 };
  let invalidated = 0;
  await Promise.all(response.responses.map(async (item, index) => {
    if (item.success || !isInvalidTokenError(item.error?.code)) return;
    const ref = refs?.get(tokens[index]);
    if (!ref) return;
    try {
      await ref.update({ active: false, invalidatedAt: admin.firestore.FieldValue.serverTimestamp(), invalidationReason: item.error?.code });
      invalidated += 1;
    } catch (error) {
      functions.logger.warn("[sendPush] token invalidation failed", { error: error instanceof Error ? error.message : "unknown" });
    }
  }));
  return { sent: response.successCount, failed: response.failureCount, invalidated };
}

/** Send to an explicit token list. This never logs token values or prefixes. */
export async function sendPushToTokens(tokens: string[], payload: PushPayload, options: SendPushTokenOptions = {}): Promise<PushResult> {
  const result = emptyPushResult();
  const deduped = dedupeTokens(tokens);
  const unique = deduped.tokens;
  result.failed += deduped.malformed;
  result.duplicate += deduped.duplicate;
  if (unique.length === 0) return result;
  const eventId = payload.eventId || `token-send-${Buffer.from(JSON.stringify({ title: payload.title, body: payload.body, url: payload.url || "/", tag: payload.tag || "", type: payload.notificationType })).toString("base64url")}`.slice(0, 180);
  if (options.userId) {
    const claim = await claimDelivery(options.userId, eventId);
    if (claim === "duplicate") { result.duplicate += 1; return result; }
  }
  const data = payloadData({ ...payload, eventId });
  for (const batch of chunkTokens(unique)) {
    addResults(result, await sendBatch(batch, data, options.tokenRefs));
  }
  if (options.userId) {
    await finishDelivery(options.userId, eventId, result.sent > 0 || result.failed < unique.length ? "delivered" : "failed");
  }
  return result;
}

async function sendForUser(userId: string, payload: PushPayload): Promise<PushResult> {
  const result = emptyPushResult();
  if (!userId) return result;
  const prefs = await resolvePushPreferences(userId, payload.notificationType);
  if (!prefs.allowed) { result.suppressed = 1; return result; }
  const db = admin.firestore();
  const snap = await db.collection(`users/${userId}/fcmTokens`).where("active", "==", true).get();
  const refs = new Map<string, FirebaseFirestore.DocumentReference>();
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const doc of snap.docs) {
    const value = doc.data().token;
    if (!isToken(value)) {
      try { await doc.ref.update({ active: false, invalidatedAt: admin.firestore.FieldValue.serverTimestamp(), invalidationReason: "malformed-token" }); result.invalidated += 1; } catch { /* best effort */ }
      continue;
    }
    if (seen.has(value)) { result.duplicate += 1; continue; }
    seen.add(value); tokens.push(value); refs.set(value, doc.ref);
  }
  if (tokens.length === 0) return result;
  const eventId = stableEventId(userId, payload);
  const sent = await sendPushToTokens(tokens, { ...payload, eventId }, { userId, tokenRefs: refs });
  addResults(result, sent);
  return result;
}

/** Existing callers remain compatible; additional counters are additive. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  return sendForUser(userId, payload);
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<PushResult> {
  const result = emptyPushResult();
  const validIds = userIds.filter((id) => typeof id === "string" && id.length > 0);
  const unique = Array.from(new Set(validIds));
  result.duplicate += validIds.length - unique.length;
  for (let i = 0; i < unique.length; i += RECIPIENT_CONCURRENCY) {
    const part = await Promise.all(unique.slice(i, i + RECIPIENT_CONCURRENCY).map((uid) => sendForUser(uid, payload)));
    part.forEach((item) => addResults(result, item));
  }
  return result;
}

export type PushRole = "student" | "teacher" | "admin";

/** Server-only role fan-out. It is intentionally not exposed as a callable endpoint. */
export async function sendPushToRole(role: PushRole, payload: PushPayload): Promise<PushResult> {
  if (!(["student", "teacher", "admin"] as string[]).includes(role)) return emptyPushResult();
  const snap = await admin.firestore().collection("users").where("role", "==", role).get();
  return sendPushToUsers(snap.docs.map((doc) => doc.id), payload);
}

// Small aliases useful to unit tests and other server-side modules.
export const isQuietHours = isWithinQuietHours;
export const resolvePreferences = resolvePushPreferences;
export const getTokenChunks = chunkTokens;
export const resolvePreferenceData = resolvePushPreferenceData;
