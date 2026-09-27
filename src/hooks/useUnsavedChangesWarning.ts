import { useEffect } from 'react';

/**
 * Reusable hook to protect against accidental navigation or page refresh/close
 * when there are unsaved changes.
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Standard legacy browser requirement
        e.returnValue = '';
        return '';
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
}

export default useUnsavedChangesWarning;
