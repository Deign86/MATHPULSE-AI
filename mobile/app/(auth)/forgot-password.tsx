import { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { Link } from 'expo-router'
import { Text } from '../../components/ui/Text'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { resetPassword } from '../../services/authService'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReset = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Please enter your email address.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send reset email.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }, [email])

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
            Reset Password
          </Text>
          <Text variant="body" className="mb-10 text-center text-on-surface">
            {sent
              ? 'Check your email for a password reset link.'
              : 'Enter your email and we will send you a reset link.'}
          </Text>

          {!sent ? (
            <>
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Button
                className="mt-6"
                onPress={handleReset}
                loading={loading}
                disabled={loading}
              >
                Send Reset Link
              </Button>
            </>
          ) : (
            <Button
              className="mt-6"
              variant="outline"
              onPress={() => setSent(false)}
            >
              Send Again
            </Button>
          )}

          <View className="mt-8 flex-row justify-center">
            <Link href="/(auth)/login">
              <Text variant="body-small" className="text-primary">
                Back to Sign In
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
