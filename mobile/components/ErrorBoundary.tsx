import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from './ui/Text';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View className="flex-1 bg-background items-center justify-center p-6">
          <Text className="text-6xl mb-4">⚠️</Text>
          <Text variant="h2" className="text-foreground mb-2 text-center">Something went wrong</Text>
          <Text className="text-muted-foreground text-sm text-center mb-4">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </Text>
          <Button onPress={this.reset}>Try Again</Button>
        </View>
      );
    }
    return this.props.children;
  }
}
