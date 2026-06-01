import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Slot, router, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { listenAuthState, fetchCurrentProfile } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Configure notification handler to show notifications while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Prevent splash screen from auto-hiding while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const requestPermissions = useNotificationStore((s) => s.requestPermissions);
  const expoPushToken = useNotificationStore((s) => s.expoPushToken);

  // Load all Nunito font weights from assets
  const [fontsLoaded, fontError] = useFonts({
    'Nunito-Light': require('../assets/fonts/Nunito-Light.ttf'),
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-Medium': require('../assets/fonts/Nunito-Medium.ttf'),
    'Nunito-SemiBold': require('../assets/fonts/Nunito-SemiBold.ttf'),
    'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
    'Nunito-ExtraBold': require('../assets/fonts/Nunito-ExtraBold.ttf'),
    'Nunito-Black': require('../assets/fonts/Nunito-Black.ttf'),
  });

  // Hide splash screen once fonts are loaded or errored
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Set up Android notification channel at app startup
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      }).catch((err) => {
        console.warn('[notifications] Android channel setup failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = listenAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchCurrentProfile();
        if (profile) {
          login(
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              name: firebaseUser.displayName ?? firebaseUser.email ?? 'User',
              photo: firebaseUser.photoURL ?? undefined,
              role: 'student',
              updatedAt: new Date(),
              createdAt: new Date(firebaseUser.metadata.creationTime ?? Date.now()),
            },
            profile,
          );
        } else {
          logout();
        }
      } else {
        logout();
      }
    });

    return unsubscribe;
  }, [login, logout]);

  // Request notification permissions and push token after login
  useEffect(() => {
    if (isAuthenticated && !expoPushToken) {
      requestPermissions();
    }
  }, [isAuthenticated, expoPushToken, requestPermissions]);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [user, segments]);

  // Block render until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Slot />
    </ErrorBoundary>
  );
}
