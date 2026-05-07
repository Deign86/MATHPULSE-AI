/**
 * Rate limiting utility for Firebase Cloud Functions using Firestore.
 *
 * Uses TTL-based document approach in _ratelimits/{uid}/{functionName} sub-collection.
 * Stores { count, windowStart } per user per function, resets every 60 seconds.
 */

import * as admin from 'firebase-admin';

// Rate limits per function type
const RATE_LIMITS: Record<string, number> = {
  // AI tutor / chatbot functions: 20 calls/minute
  ai_tutor: 20,
  chatbot: 20,
  chat_generate: 20,

  // Quiz generation functions: 10 calls/minute
  quiz_generate: 10,
  generate_quiz: 10,
  create_quiz: 10,

  // XP/reward award functions: 50 calls/minute
  award_xp: 50,
  grant_xp: 50,
  award_badge: 50,
  grant_badge: 50,

  // Admin bulk operations: 10 calls/minute
  admin_bulk: 10,
  bulk_operation: 10,
  admin_users: 10,

  // All other functions: 60 calls/minute
  default: 60,
};

// Admin multiplier for elevated limits
const ADMIN_MULTIPLIER = 10;
const TEACHER_MULTIPLIER = 3;
const WINDOW_SECONDS = 60;

interface RateLimitDoc {
  count: number;
  windowStart: number;
}

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  functionName: string;
  uid: string;
  role?: 'admin' | 'teacher' | 'student';
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimitError extends Error {
  code: number;
  retryAfter?: number;
  rateLimitInfo?: RateLimitResult;
}

/**
 * Get the effective rate limit for a function, accounting for role multipliers.
 */
function getEffectiveLimit(
  functionName: string,
  role?: string
): number {
  const baseLimit = RATE_LIMITS[functionName] || RATE_LIMITS['default'];

  if (role === 'admin') {
    return baseLimit * ADMIN_MULTIPLIER;
  }
  if (role === 'teacher') {
    return baseLimit * TEACHER_MULTIPLIER;
  }
  return baseLimit;
}

/**
 * Check if a rate limit is exceeded for a given user and function.
 * Uses Firestore for distributed state management.
 */
export async function checkRateLimit(
  uid: string,
  functionName: string,
  role?: 'admin' | 'teacher' | 'student'
): Promise<RateLimitResult> {
  const db = admin.firestore();
  const effectiveLimit = getEffectiveLimit(functionName, role);

  const rateLimitDoc: RateLimitDoc = {
    count: 0,
    windowStart: Date.now(),
  };

  try {
    const docPath = `_ratelimits/${uid}/${functionName}`;
    const docRef = db.doc(docPath);

    // Use Firestore transaction for atomic read-write
    const result = await db.runTransaction(async (transaction) => {
      const docSnapshot = await transaction.get(docRef);
      const now = Date.now();

      if (docSnapshot.exists) {
        const data = docSnapshot.data() as RateLimitDoc;
        const windowStart = data.windowStart || now;
        const windowMs = WINDOW_SECONDS * 1000;

        // Check if window has expired
        if (now - windowStart >= windowMs) {
          // Reset window
          rateLimitDoc.count = 1;
          rateLimitDoc.windowStart = now;
          transaction.set(docRef, rateLimitDoc);
        } else {
          // Increment count
          rateLimitDoc.count = data.count + 1;
          rateLimitDoc.windowStart = windowStart;

          if (rateLimitDoc.count > effectiveLimit) {
            // Rate limit exceeded
            const retryAfterSeconds = Math.ceil(
              (windowStart + windowMs - now) / 1000
            );
            return {
              allowed: false,
              currentCount: rateLimitDoc.count,
              limit: effectiveLimit,
              remaining: 0,
              retryAfterSeconds,
            };
          }
          transaction.update(docRef, { count: rateLimitDoc.count });
        }
      } else {
        // First request in window
        rateLimitDoc.count = 1;
        rateLimitDoc.windowStart = now;
        transaction.set(docRef, rateLimitDoc);
      }

      return {
        allowed: true,
        currentCount: rateLimitDoc.count,
        limit: effectiveLimit,
        remaining: Math.max(0, effectiveLimit - rateLimitDoc.count),
        retryAfterSeconds: 0,
      };
    });

    return result;
  } catch (error) {
    console.error(
      `Rate limit check failed for ${uid}/${functionName}:`,
      error
    );
    // On error, allow the request (fail open) but log
    return {
      allowed: true,
      currentCount: 0,
      limit: effectiveLimit,
      remaining: effectiveLimit,
      retryAfterSeconds: 0,
    };
  }
}

/**
 * Check rate limit and throw HTTP 429 if exceeded.
 * Use this in Cloud Function handlers.
 */
export async function checkRateLimitOrThrow(
  uid: string,
  functionName: string,
  role?: 'admin' | 'teacher' | 'student'
): Promise<void> {
  const result = await checkRateLimit(uid, functionName, role);

  if (!result.allowed) {
    const error = new Error(
      `RATE_LIMIT_EXCEEDED: ${result.retryAfterSeconds} seconds`
    ) as RateLimitError;
    error.code = 429;
    error.retryAfter = result.retryAfterSeconds;
    error.rateLimitInfo = result;
    throw error;
  }
}

/**
 * Create a rate limiting middleware for Cloud Functions.
 * Usage in onCall handler:
 *
 * export const myFunction = onCall(async (data, context) => {
 *   // Check rate limit at function entry
 *   await checkRateLimitOrThrow(context.auth?.uid, 'my_function', context.auth?.token?.role);
 *   // ... rest of handler
 * });
 *
 * Or use the before() hook pattern:
 * export const myFunction = onCall(
 *   (data, context) => checkRateLimitOrThrow(context.auth?.uid, 'my_function', context.auth?.token?.role),
 *   async (data, context) => { ... }
 * );
 */
export async function rateLimitBefore(
  data: any,
  context: any,
  options: {
    functionName: string;
    getRole?: (data: any, context: any) => 'admin' | 'teacher' | 'student' | undefined;
  }
): Promise<void> {
  const uid = context?.auth?.uid;
  if (!uid) {
    // No auth - can't rate limit, allow
    return;
  }

  const role = options.getRole
    ? options.getRole(data, context)
    : context?.auth?.token?.role;

  await checkRateLimitOrThrow(uid, options.functionName, role);
}

/**
 * HttpsError-compatible rate limit error for Cloud Functions
 */
export function createRateLimitError(retryAfterSeconds: number): RateLimitError {
  const error = new Error(
    `Too many requests. Please try again in ${retryAfterSeconds} seconds.`
  ) as RateLimitError;
  error.code = 429;
  error.retryAfter = retryAfterSeconds;
  return error;
}