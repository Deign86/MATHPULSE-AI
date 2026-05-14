// src/components/ProgressGate.tsx
// Blocks student progress when teacher acknowledgment is required

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export const ProgressGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [gated, setGated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState<string>('your teacher');

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(
      userRef,
      async (snap) => {
        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data();
        const ackRequired = data?.teacherAckRequired === true;
        const acked = data?.teacherAcknowledged === true;

        if (ackRequired && !acked) {
          setGated(true);
          // Fetch teacher name for display
          const teacherId = data?.teacherId;
          if (teacherId) {
            try {
              const { getDoc } = await import('firebase/firestore');
              const teacherSnap = await getDoc(doc(db, 'users', teacherId));
              if (teacherSnap.exists()) {
                const tData = teacherSnap.data();
                setTeacherName(tData?.displayName || tData?.name || 'your teacher');
              }
            } catch {
              // ignore
            }
          }
        } else {
          setGated(false);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {gated ? (
        <motion.div
          key="gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center min-h-screen bg-slate-50 p-6"
        >
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
              <Lock className="text-rose-500" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Progress Paused</h2>
              <p className="text-sm text-slate-500 mt-2">
                Your learning path is temporarily paused while {teacherName} reviews your recent progress.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Why am I seeing this?</p>
                  <p className="mt-1">
                    The system detected that you may need additional support. {teacherName} has been notified and will reach out soon with a personalized plan.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              You can still review completed lessons and practice problems while you wait.
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
