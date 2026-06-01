import React, { useEffect, useRef } from 'react';
import { Modal as RNModal, Pressable, View, ViewProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { cn } from './utils';

export interface ModalProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, className, children, ...props }: ModalProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const [internalVisible, setInternalVisible] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      opacity.value = withSpring(1, { damping: 20, stiffness: 200 });
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    } else {
      opacity.value = withSpring(0, { damping: 20, stiffness: 200 });
      scale.value = withSpring(0.95, { damping: 20, stiffness: 200 }, () => {
        runOnJS(setInternalVisible)(false);
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!internalVisible) return null;

  return (
    <RNModal
      visible={internalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/60"
        onPress={onClose}
      >
        <Animated.View
          className={cn(
            'rounded-lg border border-border bg-surface p-sp-4 shadow-lg',
            className
          )}
          style={animatedStyle}
          {...props}
        >
          <Pressable onPress={() => {}}>
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </RNModal>
  );
}
