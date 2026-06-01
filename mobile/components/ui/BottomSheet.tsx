import React, { useRef, useEffect, useCallback } from 'react';
import { View, ViewProps } from 'react-native';
import BottomSheetRaw, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { cn } from './utils';

export interface BottomSheetProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: string[];
  className?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  snapPoints = ['50%', '75%'],
  className,
  children,
  ...props
}: BottomSheetProps) {
  const sheetRef = useRef<BottomSheetRaw>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <BottomSheetRaw
      ref={sheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      )}
      backgroundStyle={{ backgroundColor: '#0f172a' }}
      handleIndicatorStyle={{ backgroundColor: '#1e293b' }}
    >
      <BottomSheetView
        className={cn('p-sp-4', className)}
        {...props}
      >
        {children}
      </BottomSheetView>
    </BottomSheetRaw>
  );
}
