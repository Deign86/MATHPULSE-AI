/**
 * Haptics wrapper — safe to call even if expo-haptics is not installed.
 * Falls back to no-op with a console warning.
 */

type ImpactStyle = 'light' | 'medium' | 'heavy';

let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // expo-haptics not installed — fall back to no-op
  // eslint-disable-next-line no-console
  console.warn('[haptics] expo-haptics not installed; tap feedback disabled');
}

function mapStyle(style: ImpactStyle): any {
  if (!Haptics) return undefined;
  return Haptics.ImpactFeedbackStyle?.[style.charAt(0).toUpperCase() + style.slice(1)] ?? Haptics.ImpactFeedbackStyle?.Light;
}

export function impact(style: ImpactStyle = 'light'): void {
  if (!Haptics) return;
  try {
    Haptics.impactAsync(mapStyle(style));
  } catch {
    // ignore
  }
}

export function notification(type: 'success' | 'warning' | 'error' = 'success'): void {
  if (!Haptics) return;
  try {
    const t =
      type === 'success' ? Haptics.NotificationFeedbackType?.Success :
      type === 'warning' ? Haptics.NotificationFeedbackType?.Warning :
      Haptics.NotificationFeedbackType?.Error;
    if (t !== undefined) Haptics.notificationAsync(t);
  } catch {
    // ignore
  }
}

export function selection(): void {
  if (!Haptics) return;
  try {
    Haptics.selectionAsync?.();
  } catch {
    // ignore
  }
}
