import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from './utils';

export interface ProgressProps extends ViewProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, max = 100, className, indicatorClassName, ...props }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <View
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <View
        className={cn('h-full rounded-full bg-primary', indicatorClassName)}
        style={{ width: `${percentage}%` }}
      />
    </View>
  );
}
