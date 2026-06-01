import { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { Link, router } from 'expo-router'
import { Text } from '../../components/ui/Text'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { signUp } from '../../services/authService'
import { useAuthStore } from '../../stores/useAuthStore'
import type { UserRole } from '../../types/models'

const roles: { key: UserRole; label: string }[] = [
  { key: 'student', label: 'Student' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'admin', label: 'Admin' },
]

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleRegister = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Validation', 'Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const { user, profile } = await signUp(
        email.trim(),
        password,
        name.trim(),
        role
      )
      login(user, profile)
      const roleRoutes = {
        student: '/(student)/dashboard',
        teacher: '/(teacher)/dashboard',
        admin: '/(admin)/dashboard',
      } as const
      router.replace(roleRoutes[profile.role as keyof typeof roleRoutes] ?? '/(student)/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.'
      Alert.alert('Registration Error', message)
    } finally {
      setLoading(false)
    }
  }, [name, email, password, role, login])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-background"
      >
        <View className="flex-1 justify-center px-6 py-12">
          <Text variant="h1" className="mb-2 text-center">
            Create Account
          </Text>
          <Text variant="body" className="mb-10 text-center text-on-surface">
            Join MathPulse AI and start learning
          </Text>

          <Text variant="label" className="mb-2 text-on-surface">
            I am a…
          </Text>
          <View className="mb-6 flex-row gap-2">
            {roles.map((r) => {
              const selected = role === r.key
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  className={`flex-1 rounded-xl border-2 py-3 ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-on-surface/20 bg-surface'
                  }`}
                >
                  <Text
                    variant="body-small"
                    className={`text-center ${
                      selected ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View className="gap-4">
            <Input
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              placeholder="Password (6+ characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
          </View>

          <Button
            className="mt-6"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
          >
            Create Account
          </Button>

          <View className="mt-8 flex-row justify-center gap-1">
            <Text variant="body-small" className="text-on-surface">
              Already have an account?
            </Text>
            <Link href="/(auth)/login">
              <Text variant="body-small" className="text-primary">
                Sign In
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
