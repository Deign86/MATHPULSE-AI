import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { cn } from './utils';

export interface InputProps extends TextInputProps {
  className?: string;
  containerClassName?: string;
}

export function Input({ className, containerClassName, ...props }: InputProps) {
  return (
    <View
      className={cn(
        'h-11 rounded-md border border-border bg-background px-sp-3',
        containerClassName
      )}
    >
      <TextInput
        className={cn(
          'flex-1 text-[16px] text-surface-foreground placeholder:text-muted-foreground',
          className
        )}
        placeholderTextColor="#64748b"
        {...props}
      />
    </View>
  );
}
