import React from 'react';
import { Pressable, View, ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { cn } from './utils';

export interface SwitchProps extends ViewProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  className?: string;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Switch({ value, onValueChange, className, disabled, ...props }: SwitchProps) {
  const translateX = useSharedValue(value ? 20 : 0);

  React.useEffect(() => {
    translateX.value = withSpring(value ? 20 : 0, { damping: 15, stiffness: 200 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <AnimatedPressable
      className={cn(
        'h-7 w-12 rounded-full p-sp-1',
        value ? 'bg-primary' : 'bg-muted',
        disabled && 'opacity-50',
        className
      )}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        className="h-5 w-5 rounded-full bg-surface-foreground"
        style={thumbStyle}
      />
    </AnimatedPressable>
  );
}
