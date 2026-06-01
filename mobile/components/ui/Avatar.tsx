import React from 'react';
import { Image, View, ViewProps } from 'react-native';
import { cn } from './utils';
import { Text } from './Text';

export interface AvatarProps extends ViewProps {
  src?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function Avatar({ src, fallback = '?', size = 'md', className, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false);
  const initials = fallback.slice(0, 2).toUpperCase();

  return (
    <View
      className={cn(
        'rounded-full bg-secondary items-center justify-center overflow-hidden',
        sizeMap[size],
        className
      )}
      {...props}
    >
      {src && !error ? (
        <Image
          source={{ uri: src }}
          className={cn('w-full h-full', sizeMap[size])}
          onError={() => setError(true)}
        />
      ) : (
        <Text variant="label" className="text-secondary-foreground">
          {initials}
        </Text>
      )}
    </View>
  );
}
