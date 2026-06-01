import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { cn } from './utils';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'body-small' | 'caption' | 'label';
  className?: string;
}

const variantStyles: Record<NonNullable<TextProps['variant']>, string> = {
  h1: 'text-[32px] font-bold text-surface-foreground leading-[40px]',
  h2: 'text-[24px] font-bold text-surface-foreground leading-[32px]',
  h3: 'text-[20px] font-semibold text-surface-foreground leading-[28px]',
  h4: 'text-[18px] font-semibold text-surface-foreground leading-[24px]',
  body: 'text-[16px] font-normal text-on-surface leading-[24px]',
  'body-small': 'text-[14px] font-normal text-on-surface leading-[20px]',
  caption: 'text-[12px] font-normal text-muted-foreground leading-[16px]',
  label: 'text-[14px] font-medium text-surface-foreground leading-[20px]',
};

export function Text({ variant = 'body', className, style, ...props }: TextProps) {
  return (
    <RNText
      className={cn(variantStyles[variant], className)}
      style={style}
      {...props}
    />
  );
}
