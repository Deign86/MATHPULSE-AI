import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './ui/Text';
import { Button } from './ui/Button';

// ---------------------------------------------------------------------------
// Optional dependencies — installed packages only, no forced peer deps
// Run the associated install command to enable the feature.
// ---------------------------------------------------------------------------

// Run: npx expo install expo-updates
let UpdatesModule: { reloadAsync: () => Promise<void> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-updates');
  UpdatesModule = mod.default ?? mod;
} catch {
  // expo-updates not installed
}

// Run: npm install react-native-restart
let RNRestartModule: { Restart: () => void } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('react-native-restart');
  RNRestartModule = mod.default ?? mod;
} catch {
  // react-native-restart not installed
}

// Run: npx expo install @react-native-clipboard/clipboard
let ClipboardModule: { setString: (text: string) => void } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-clipboard/clipboard');
  ClipboardModule = mod.default ?? mod;
} catch {
  // @react-native-clipboard/clipboard not installed
}

// ---------------------------------------------------------------------------
// Crash reporting — shaped for Sentry, no SDK installed yet
// ---------------------------------------------------------------------------

/**
 * Report a crash to the configured error-monitoring service.
 *
 * Currently logs to console. Integrate with Sentry when ready:
 *
 *   import * as Sentry from '@sentry/react-native';
 *   Sentry.captureException(error, { extra: context });
 *
 * @param error   The Error that was caught.
 * @param context Arbitrary metadata attached to the crash report.
 */
export function reportCrash(error: Error, context: Record<string, unknown>): void {
  console.error('[CrashReport]', {
    error: { name: error.name, message: error.message, stack: error.stack },
    context,
  });
}

// ---------------------------------------------------------------------------
// ErrorBoundary — catches render errors and renders a recovery screen
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  detailsExpanded: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, detailsExpanded: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, detailsExpanded: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    reportCrash(error, { componentStack: errorInfo.componentStack ?? '' });
  }

  handleRestart = (): void => {
    // Preferred: expo-updates can reload the JS bundle via OTA
    if (UpdatesModule?.reloadAsync) {
      UpdatesModule.reloadAsync().catch(() => {
        // Fallback 1: native module restart
        if (RNRestartModule?.Restart) {
          RNRestartModule.Restart();
          return;
        }
        // Fallback 2: manual close + reset boundary
        Alert.alert('Restart Required', 'Please close and reopen the app manually.');
        this.setState({ hasError: false, error: null, detailsExpanded: false });
      });
      return;
    }

    // Fallback 1: native module restart
    if (RNRestartModule?.Restart) {
      RNRestartModule.Restart();
      return;
    }

    // Fallback 2: reset boundary (re-renders children)
    Alert.alert('Restart Required', 'Please close and reopen the app manually.');
    this.setState({ hasError: false, error: null, detailsExpanded: false });
  };

  handleCopyError = (): void => {
    if (!ClipboardModule) {
      Alert.alert(
        'Clipboard Unavailable',
        'Install @react-native-clipboard/clipboard to enable copying error details.'
      );
      return;
    }

    const errorDetail = [
      `Error: ${this.state.error?.name ?? 'Unknown'}`,
      `Message: ${this.state.error?.message ?? 'N/A'}`,
      '',
      'Stack:',
      this.state.error?.stack ?? 'No stack trace available',
    ].join('\n');

    ClipboardModule.setString(errorDetail);
    Alert.alert('Copied', 'Error details have been copied to your clipboard.');
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ detailsExpanded: !prev.detailsExpanded }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const error = this.state.error;

      return (
        <View
          className="flex-1 bg-background items-center justify-center p-6"
          accessibilityRole="alert"
        >
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" className="mb-4">
            <Path
              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 9v4"
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 17h.01"
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>

          <Text variant="h2" className="text-foreground mb-2 text-center">
            Something went wrong
          </Text>

          <Text className="text-muted-foreground text-sm text-center mb-6">
            {error?.message || 'An unexpected error occurred'}
          </Text>

          <View className="w-full gap-3 mb-4">
            <Button
              onPress={this.handleRestart}
              hapticStyle="none"
              className="w-full"
              accessibilityLabel="Restart the application"
            >
              Restart App
            </Button>

            <Button
              variant="outline"
              onPress={this.handleCopyError}
              hapticStyle="none"
              className="w-full"
              accessibilityLabel="Copy error details to clipboard"
            >
              Copy Error Details
            </Button>

            <Button
              variant="ghost"
              onPress={this.toggleDetails}
              hapticStyle="none"
              className="w-full"
              accessibilityLabel={
                this.state.detailsExpanded ? 'Hide error details' : 'Show error details'
              }
            >
              {this.state.detailsExpanded ? 'Hide Error Details' : 'View Error Details'}
            </Button>
          </View>

          {this.state.detailsExpanded && error?.stack && (
            <ScrollView className="w-full max-h-48 bg-surface rounded-lg p-4">
              <Text variant="caption" className="font-mono text-[11px] leading-[16px]">
                {error.stack}
              </Text>
            </ScrollView>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}
