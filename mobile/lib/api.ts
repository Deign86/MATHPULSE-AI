import { auth } from './firebase';

export const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token ?? ''}`,
  };
}
