// src/components/risk/InterventionChecklistPanel.tsx
// Displays and manages intervention checklists for at-risk students

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Square, CheckCircle, Loader2, ClipboardList } from 'lucide-react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/button';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface InterventionChecklist {
  studentId: string;
  items: ChecklistItem[];
  generatedAt: Date | null;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
}

interface InterventionChecklistPanelProps {
  studentId: string;
  studentName?: string;
}

export const InterventionChecklistPanel: React.FC<InterventionChecklistPanelProps> = ({
  studentId,
  studentName,
}) => {
  const [checklist, setChecklist] = useState<InterventionChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const checklistRef = doc(db, 'interventionChecklists', studentId);
    const unsubscribe = onSnapshot(
      checklistRef,
      (snap) => {
        if (!snap.exists()) {
          setChecklist(null);
          setLoading(false);
          return;
        }

        const data = snap.data();
        setChecklist({
          studentId: data.studentId,
          items: data.items || [],
          generatedAt: data.generatedAt?.toDate() || null,
          acknowledged: data.acknowledged === true,
          acknowledgedAt: data.acknowledgedAt?.toDate() || null,
          acknowledgedBy: data.acknowledgedBy || null,
        });
        setLoading(false);
      },
      (err) => {
        console.error('[InterventionChecklistPanel] error:', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [studentId]);

  const toggleItem = async (itemId: string) => {
    if (!checklist || updating) return;
    setUpdating(true);

    const newItems = checklist.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    try {
      const checklistRef = doc(db, 'interventionChecklists', studentId);
      await updateDoc(checklistRef, { items: newItems });
    } catch (err) {
      console.error('[InterventionChecklistPanel] toggle error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const acknowledge = async () => {
    if (!checklist || updating) return;
    setUpdating(true);

    try {
      const checklistRef = doc(db, 'interventionChecklists', studentId);
      await updateDoc(checklistRef, {
        acknowledged: true,
        acknowledgedAt: serverTimestamp(),
      });

      // Also acknowledge on the student doc to unlock progress
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        teacherAcknowledged: true,
        teacherAckRequired: false,
        teacherAcknowledgedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[InterventionChecklistPanel] acknowledge error:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
        <Loader2 size={14} className="animate-spin" />
        Loading intervention checklist...
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="text-sm text-slate-400 py-2">
        No intervention checklist generated yet.
      </div>
    );
  }

  const completedCount = checklist.items.filter((i) => i.completed).length;
  const allCompleted = completedCount === checklist.items.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-lg p-4 mt-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={16} className="text-rose-500" />
        <h4 className="text-sm font-semibold text-slate-800">
          Intervention Checklist {studentName ? `— ${studentName}` : ''}
        </h4>
        <span className="text-xs text-slate-400 ml-auto">
          {completedCount}/{checklist.items.length} completed
        </span>
      </div>

      <div className="space-y-2">
        {checklist.items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id)}
            disabled={updating || checklist.acknowledged}
            className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md transition-colors ${
              item.completed
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            } ${checklist.acknowledged ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {item.completed ? (
              <CheckSquare size={16} className="flex-shrink-0" />
            ) : (
              <Square size={16} className="flex-shrink-0 text-slate-400" />
            )}
            <span className={`text-sm ${item.completed ? 'line-through opacity-70' : ''}`}>
              {item.text}
            </span>
          </button>
        ))}
      </div>

      {!checklist.acknowledged && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {allCompleted
              ? 'All items completed. You can now acknowledge.'
              : 'Complete all items before acknowledging.'}
          </div>
          <Button
            size="sm"
            onClick={acknowledge}
            disabled={updating || !allCompleted}
            className="text-xs"
          >
            {updating ? (
              <Loader2 size={12} className="animate-spin mr-1" />
            ) : (
              <CheckCircle size={12} className="mr-1" />
            )}
            Acknowledge & Unlock
          </Button>
        </div>
      )}

      {checklist.acknowledged && (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-md px-3 py-2">
          <CheckCircle size={14} />
          Acknowledged on {checklist.acknowledgedAt?.toLocaleDateString() || '—'}
        </div>
      )}
    </motion.div>
  );
};
