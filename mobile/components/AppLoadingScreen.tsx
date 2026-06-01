import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { Text } from './ui/Text';
import { impact } from '../lib/haptics';

interface BotIconProps {
  size?: number;
  color?: string;
}

function BotIcon({ size = 48, color = '#6366f1' }: BotIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="4" y="10" width="16" height="10" rx="2" />
      <Circle cx="9" cy="14" r="1" fill={color} />
      <Circle cx="15" cy="14" r="1" fill={color} />
      <Path d="M9 17h6" />
      <Path d="M12 10V7" />
      <Circle cx="12" cy="5" r="1.5" fill={color} />
    </Svg>
  );
}

export interface AppLoadingScreenProps extends ViewProps {
  message?: string;
}

export function AppLoadingScreen({
  message = 'Loading...',
  className,
  ...props
}: AppLoadingScreenProps) {
  const floatY = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.95);

  useEffect(() => {
    impact('light');

    floatY.value = withRepeat(
      withTiming(-8, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    cardOpacity.value = withTiming(1, { duration: 400 });
    cardScale.value = withTiming(1, { duration: 400 });
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const a11yProps = (): Record<string, unknown> => ({
    accessibilityRole: 'status',
    accessibilityLabel: 'Loading MathPulse',
    accessibilityLiveRegion: 'polite',
  });

  return (
    <Animated.View
      className="flex-1 items-center justify-center bg-background"
      {...a11yProps()}
      {...props}
    >
      <View className="absolute inset-0 bg-[#0f172a]" />
      <View className="absolute inset-0 bg-primary/10" />

      <View className="items-center z-10">
        <Animated.View style={logoAnimatedStyle} className="mb-sp-6">
          <View className="rounded-2xl bg-primary/20 p-sp-4">
            <BotIcon size={56} color="#818cf8" />
          </View>
        </Animated.View>

        <Animated.View style={cardAnimatedStyle} className="items-center">
          <View className="rounded-xl border border-border/50 bg-surface/90 backdrop-blur-sm px-sp-6 py-sp-5 items-center shadow-lg">
            <Text variant="h3" className="text-surface-foreground mb-sp-1">
              MathPulse
            </Text>
            <Text variant="body-small" className="text-muted-foreground mb-sp-3">
              AI-powered math tutor
            </Text>
            <Text variant="caption" className="text-muted-foreground">
              {message}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
