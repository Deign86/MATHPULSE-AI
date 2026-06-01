import React from 'react';
import { Pressable, PressableProps, ActivityIndicator } from 'react-native';
import { cn } from './utils';
import { Text } from './Text';
import { impact } from '../../lib/haptics';

export interface ButtonProps extends PressableProps {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  textClassName?: string;
  loading?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'none';
  children: React.ReactNode;
}

const buttonVariants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-primary active:bg-primary/80',
  secondary: 'bg-secondary active:bg-secondary/80',
  outline: 'border border-border bg-transparent active:bg-surface/50',
  ghost: 'bg-transparent active:bg-surface/50',
  destructive: 'bg-error active:bg-error/80',
};

const textVariants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-surface-foreground',
  ghost: 'text-surface-foreground',
  destructive: 'text-error-foreground',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-11 px-sp-4',
  sm: 'h-9 px-sp-3',
  lg: 'h-12 px-sp-6',
};

export function Button({
  variant = 'default',
  size = 'default',
  className,
  textClassName,
  loading,
  hapticStyle = 'light',
  onPress,
  children,
  disabled,
  accessibilityLabel,
  ...props
}: ButtonProps) {
  const isLoading = loading ?? disabled;

  const handlePress = (e: any) => {
    if (hapticStyle !== 'none' && !isLoading) impact(hapticStyle);
    onPress?.(e);
  };

  return (
    <Pressable
      className={cn(
        'min-h-[44] min-w-[44] items-center justify-center rounded-md',
        buttonVariants[variant],
        sizeStyles[size],
        isLoading && 'opacity-50',
        className
      )}
      disabled={isLoading}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: !!isLoading, busy: !!loading } as any}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" className={cn(textVariants[variant], 'text-[16px] font-medium', textClassName)} />
      ) : typeof children === 'string' ? (
        <Text className={cn(textVariants[variant], 'text-[16px] font-medium', textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
