import { toast } from 'sonner';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';

/**
 * Parse retry_after value from response headers or body
 */
function getRetryAfterSeconds(response: Response): number {
  // Try header first
  const retryAfter = response.headers.get('retry-after') || response.headers.get('Retry-After');
  if (retryAfter) {
    const parsed = parseInt(retryAfter, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  
  // Try to parse from body
  response.clone().json().then((body: any) => {
    if (body?.retry_after) {
      const parsed = parseInt(body.retry_after, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }).catch(() => {});
  
  // Default to 60 seconds
  return 60;
}

/**
 * Log rate limit event to Firestore for monitoring
 */
async function logRateLimitHit(endpoint: string, retryAfter: number): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const logRef = doc(db, '_analytics/rateLimitHits', user.uid);
    await setDoc(logRef, {
      uid: user.uid,
      endpoint,
      retryAfter,
      timestamp: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    // Non-critical, don't throw
    console.warn('Failed to log rate limit hit:', err);
  }
}

/**
 * Countdown timer hook state for AI submit buttons
 */
interface RateLimitCountdown {
  remainingSeconds: number;
  isLimited: boolean;
  endpoint: string | null;
}

/**
 * Global countdown state (in real implementation, this would be a React context or store)
 */
const activeCountdowns: Map<string, { endpoint: string; endsAt: number; timerId: number }> = new Map();

/**
 * Show rate limit toast and manage countdown
 */
function showRateLimitToast(endpoint: string, retryAfter: number): void {
  const key = `${endpoint}-${Date.now()}`;
  const endsAt = Date.now() + retryAfter * 1000;
  
  toast.error(`You're going too fast! Please wait ${retryAfter} seconds before trying again.`, {
    duration: retryAfter * 1000,
    id: key,
  });
  
  // Clear any existing countdown for this endpoint
  const existing = activeCountdowns.get(endpoint);
  if (existing) {
    clearInterval(existing.timerId);
  }
  
  // Start countdown
  const timerId = window.setInterval(() => {
    const remaining = Math.ceil((endsAt - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(timerId);
      activeCountdowns.delete(endpoint);
      toast.dismiss(key);
    }
  }, 1000);
  
  activeCountdowns.set(endpoint, { endpoint, endsAt, timerId });
}

/**
 * Handle rate limit error from API response
 * Returns true if the error was a rate limit error, false otherwise
 */
export async function handleRateLimitError(
  response: Response,
  endpoint: string
): Promise<boolean> {
  if (response.status !== 429) {
    return false;
  }
  
  const retryAfter = getRetryAfterSeconds(response);
  
  // Log to Firestore
  await logRateLimitHit(endpoint, retryAfter);
  
  // Show toast notification
  showRateLimitToast(endpoint, retryAfter);
  
  // Dispatch custom event for UI components to disable buttons
  window.dispatchEvent(new CustomEvent('rate-limit-hit', {
    detail: { endpoint, retryAfter, expiresAt: Date.now() + retryAfter * 1000 }
  }));
  
  return true;
}

/**
 * Check if an endpoint is currently rate-limited
 */
export function isEndpointRateLimited(endpoint: string): boolean {
  const active = activeCountdowns.get(endpoint);
  if (!active) return false;
  return Date.now() < active.endsAt;
}

/**
 * Get remaining seconds for a rate limited endpoint
 */
export function getRateLimitRemaining(endpoint: string): number {
  const active = activeCountdowns.get(endpoint);
  if (!active) return 0;
  return Math.max(0, Math.ceil((active.endsAt - Date.now()) / 1000));
}

/**
 * AI/chatbot endpoints that should disable submit buttons when rate limited
 */
export const AI_ENDPOINTS = ['/api/chat', '/api/chat/stream', '/api/ai/', '/api/rag/lesson'];

export function isAIEndpoint(endpoint: string): boolean {
  return AI_ENDPOINTS.some(prefix => endpoint.startsWith(prefix));
}

    // @integration: Chat Component Integration
// For AI/chatbot submit buttons, the countdown should visually disable the button.
// This requires adding a listener in the chat component that uses the 'rate-limit-hit' custom event.
// Example: window.addEventListener('rate-limit-hit', (e) => { ... });
