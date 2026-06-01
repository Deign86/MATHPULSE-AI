import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import type { Notification } from '../types/models'
import { registerPushToken } from '../services/notificationService'
import { auth } from '../lib/firebase'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  permissionsGranted: boolean
  expoPushToken: string | null
  error: string | null
}

interface NotificationActions {
  addNotification: (notification: Notification) => void
  markRead: (notificationId: string) => void
  markAllRead: () => void
  setPushToken: (token: string) => void
  requestPermissions: () => Promise<void>
  clearAll: () => void
  clearError: () => void
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      permissionsGranted: false,
      expoPushToken: null,
      error: null,

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: notification.read
            ? state.unreadCount
            : state.unreadCount + 1,
        })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

      markRead: (notificationId) =>
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === notificationId && !n.read ? { ...n, read: true } : n
          )
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          }
        }),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      setPushToken: (token) => set({ expoPushToken: token }),

      requestPermissions: async () => {
        try {
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'default',
              importance: Notifications.AndroidImportance.MAX,
            })
          }

          const { status: existingStatus } = await Notifications.getPermissionsAsync()
          let finalStatus = existingStatus

          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync()
            finalStatus = status
          }

          set({ permissionsGranted: finalStatus === 'granted' })

          if (finalStatus !== 'granted') {
            return
          }

          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

          if (!projectId) {
            console.warn(
              '[notifications] No EAS projectId found — cannot obtain Expo push token. Set extra.eas.projectId in app.json.'
            )
            return
          }

          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
          const token = tokenData.data

          set({ expoPushToken: token })

          const currentUser = auth.currentUser
          if (currentUser) {
            const idToken = await currentUser.getIdToken()
            await registerPushToken(token, idToken)
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          set({ error: message })
          console.warn(`[notifications] requestPermissions failed: ${message}`)
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'mathpulse-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        permissionsGranted: state.permissionsGranted,
        expoPushToken: state.expoPushToken,
      }),
    }
  )
)
