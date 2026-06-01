import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { cn } from './utils';

export interface ScrollAreaProps extends ScrollViewProps {
  className?: string;
  contentClassName?: string;
}

export function ScrollArea({
  className,
  contentClassName,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollView
      className={cn('flex-1', className)}
      contentContainerClassName={contentClassName}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
