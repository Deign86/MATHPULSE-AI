import React, { useRef, useState, useCallback } from 'react';
import { View, PanResponder, GestureResponderEvent, PanResponderGestureState, ViewProps } from 'react-native';
import { cn } from './utils';

export interface SliderProps extends ViewProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (value: number) => void;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className,
  trackClassName,
  thumbClassName,
  disabled,
  ...props
}: SliderProps) {
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [trackX, setTrackX] = useState(0);

  const percentage = ((value - min) / (max - min)) * 100;

  const calculateValue = useCallback(
    (x: number) => {
      const relativeX = Math.max(0, Math.min(x - trackX, trackWidth));
      const rawValue = min + (relativeX / trackWidth) * (max - min);
      const stepped = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [trackWidth, trackX, min, max, step]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const newValue = calculateValue(gestureState.moveX);
        onValueChange(newValue);
      },
    })
  ).current;

  const handleLayout = useCallback(() => {
    trackRef.current?.measure((_, __, width, ___, pageX) => {
      setTrackWidth(width);
      setTrackX(pageX);
    });
  }, []);

  return (
    <View
      className={cn('h-6 justify-center', className)}
      {...props}
      {...panResponder.panHandlers}
    >
      <View
        ref={trackRef}
        className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', trackClassName)}
        onLayout={handleLayout}
      >
        <View
          className={cn('h-full rounded-full bg-primary', trackClassName)}
          style={{ width: `${percentage}%` }}
        />
      </View>
      <View
        className={cn(
          'absolute h-5 w-5 rounded-full bg-primary-foreground border-2 border-primary',
          thumbClassName
        )}
        style={{ left: `${percentage}%`, transform: [{ translateX: -10 }] }}
        pointerEvents="none"
      />
    </View>
  );
}
