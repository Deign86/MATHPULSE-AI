import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: 'logout' | 'delete' | 'warning';
  zIndexClass?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  icon = 'warning',
  zIndexClass = 'z-[100]',
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'logout':
        return <LogOut className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'delete':
        return <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 dark:bg-rose-950/50',
          iconColor: 'text-rose-600 dark:text-rose-400',
          buttonBg: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800',
          buttonText: 'text-white'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-950/50',
          iconColor: 'text-amber-600 dark:text-amber-400',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
          buttonText: 'text-white'
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-sky-100 dark:bg-sky-950/50',
          iconColor: 'text-sky-600 dark:text-sky-400',
          buttonBg: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
          buttonText: 'text-white'
        };
    }
  };

  const colors = getColorClasses();

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch {
      // Keep modal open if caller throws so the user can retry or cancel.
    }
  };

  const modalElement = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${zIndexClass} overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-4`}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative my-auto bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-3xl shadow-2xl w-[calc(100%-1rem)] max-w-[340px] sm:max-w-md max-h-[90dvh] overflow-y-auto border border-slate-200/80 dark:border-slate-800"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10 cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Content */}
              <div className="p-5 sm:p-7 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.08, type: 'spring', damping: 15 }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 ${colors.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-3.5 sm:mb-4 ${colors.iconColor} shadow-inner`}
                >
                  {getIcon()}
                </motion.div>

                {/* Title */}
                <h2 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white mb-1.5 sm:mb-2 tracking-tight">
                  {title}
                </h2>

                {/* Message */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-5 sm:mb-6 leading-relaxed">
                  {message}
                </p>

                {/* Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 h-10 sm:h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className={`flex-1 h-10 sm:h-11 rounded-xl font-black text-xs sm:text-sm ${colors.buttonBg} ${colors.buttonText} shadow-md active:scale-95 transition-all cursor-pointer`}
                  >
                    {confirmText}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
};

export default ConfirmModal;
