import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { cn } from './utils';

export interface SkeletonProps extends ViewProps {
  className?: string;
  circle?: boolean;
}

export function Skeleton({ className, circle, style, ...props }: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <Animated.View
      className={cn(
        'bg-muted',
        circle ? 'rounded-full' : 'rounded-md',
        className
      )}
      style={[animatedStyle, style]}
      {...props}
    />
  );
}
