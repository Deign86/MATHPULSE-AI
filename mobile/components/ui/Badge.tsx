import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from './utils';
import { Text } from './Text';

export interface BadgeProps extends ViewProps {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
  className?: string;
  children: React.ReactNode;
}

const badgeVariants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'border border-border bg-transparent',
  destructive: 'bg-error',
  success: 'bg-success',
  warning: 'bg-warning',
};

const textVariants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-surface-foreground',
  destructive: 'text-error-foreground',
  success: 'text-background',
  warning: 'text-background',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <View
      className={cn(
        'rounded-full px-sp-2 py-sp-1 items-center justify-center',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={cn(textVariants[variant], 'text-[12px] font-medium')}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
