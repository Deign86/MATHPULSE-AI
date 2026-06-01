import { useState, useCallback } from 'react'
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { Link, router } from 'expo-router'
import { Text } from '../../components/ui/Text'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { signIn } from '../../services/authService'
import { useAuthStore } from '../../stores/useAuthStore'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Please enter both email and password.')
      return
    }
    setLoading(true)
    try {
      const { user, profile } = await signIn(email.trim(), password)
      login(user, profile)
      const roleRoutes = {
        student: '/(student)/dashboard',
        teacher: '/(teacher)/dashboard',
        admin: '/(admin)/dashboard',
      } as const
      router.replace(roleRoutes[profile.role as keyof typeof roleRoutes] ?? '/(student)/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      Alert.alert('Login Error', message)
    } finally {
      setLoading(false)
    }
  }, [email, password, login])

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
            MathPulse AI
          </Text>
          <Text variant="body" className="mb-10 text-center text-on-surface">
            Welcome back — sign in to continue
          </Text>

          <View className="gap-4">
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />
          </View>

          <Link
            href="/(auth)/forgot-password"
            className="mt-3 self-end"
          >
            <Text variant="body-small" className="text-primary">
              Forgot password?
            </Text>
          </Link>

          <Button
            className="mt-6"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          >
            Sign In
          </Button>

          <View className="mt-8 flex-row justify-center gap-1">
            <Text variant="body-small" className="text-on-surface">
              Don't have an account?
            </Text>
            <Link href="/(auth)/register">
              <Text variant="body-small" className="text-primary">
                Sign Up
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
