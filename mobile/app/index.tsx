import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/useAuthStore'

export default function Index() {
  const user = useAuthStore((s) => s.user)
  const studentProfile = useAuthStore((s) => s.studentProfile)
  const teacherProfile = useAuthStore((s) => s.teacherProfile)
  const adminProfile = useAuthStore((s) => s.adminProfile)

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login')
      return
    }
    if (studentProfile) {
      router.replace('/dashboard')
    } else if (teacherProfile) {
      router.replace('/(teacher)/dashboard')
    } else if (adminProfile) {
      router.replace('/(admin)/dashboard')
    } else {
      router.replace('/(auth)/login')
    }
  }, [user, studentProfile, teacherProfile, adminProfile])

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  )
}
