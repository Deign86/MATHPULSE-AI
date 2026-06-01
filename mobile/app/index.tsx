import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { AppLoadingScreen } from '@/components/AppLoadingScreen'

export default function Index() {
  const [hasChecked, setHasChecked] = useState(false)
  const user = useAuthStore((s) => s.user)
  const studentProfile = useAuthStore((s) => s.studentProfile)
  const teacherProfile = useAuthStore((s) => s.teacherProfile)
  const adminProfile = useAuthStore((s) => s.adminProfile)

  useEffect(() => {
    setHasChecked(true)

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

  if (!hasChecked) {
    return <AppLoadingScreen />
  }

  return <AppLoadingScreen />
}
