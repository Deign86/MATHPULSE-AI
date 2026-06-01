import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from './utils';

export interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <View
      className={cn('rounded-lg border border-border bg-surface p-sp-4', className)}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('mb-sp-3', className)} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('', className)} {...props}>
      {children}
    </View>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('', className)} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('mt-sp-3 flex-row items-center', className)} {...props}>
      {children}
    </View>
  );
}
