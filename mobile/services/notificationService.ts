import { Platform } from 'react-native'

const API_URL = process.env.EXPO_PUBLIC_API_URL

export async function registerPushToken(token: string, idToken: string): Promise<void> {
  const url = `${API_URL}/notifications/register-device`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ expoPushToken: token, platform: Platform.OS }),
    })
    if (!res.ok) {
      console.warn(
        `[notifications] Backend /notifications/register-device returned ${res.status} — endpoint may not exist yet.`
      )
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[notifications] registerPushToken failed (endpoint likely not deployed): ${message}`)
  }
}
