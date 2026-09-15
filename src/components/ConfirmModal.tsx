import React from 'react';
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
  zIndexClass = 'z-50',
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'logout':
        return <LogOut size={32} />;
      case 'delete':
        return <Trash2 size={32} />;
      case 'warning':
      default:
        return <AlertTriangle size={32} />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          buttonText: 'text-white'
        };
      case 'warning':
        return {
          iconBg: 'bg-rose-100',
          iconColor: 'text-rose-600',
          buttonBg: 'bg-rose-600 hover:bg-rose-700',
          buttonText: 'text-white'
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-sky-100',
          iconColor: 'text-sky-600',
          buttonBg: 'bg-sky-600 hover:bg-sky-700',
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

  return (
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative my-auto bg-[#f7f9fc] dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto border border-[#dde3eb] dark:border-slate-800"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-slate-500 hover:text-[#0a1628] dark:text-slate-400 dark:hover:text-white hover:bg-[#dde3eb] dark:hover:bg-slate-800 rounded-xl transition-colors z-10 cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Content */}
              <div className="p-5 sm:p-8 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                  className={`w-16 h-16 sm:w-20 sm:h-20 ${colors.iconBg} rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ${colors.iconColor}`}
                >
                  {getIcon()}
                </motion.div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-display font-bold text-[#0a1628] dark:text-white mb-2 sm:mb-3">
                  {title}
                </h2>

                {/* Message */}
                <p className="text-sm sm:text-base text-[#5a6578] dark:text-slate-300 mb-6 sm:mb-8 leading-relaxed">
                  {message}
                </p>

                {/* Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="lg"
                    className="flex-1 h-11 sm:h-12 rounded-xl border-[#dde3eb] dark:border-slate-700 hover:border-[#d1cec6] hover:bg-[#edf1f7] dark:hover:bg-slate-800 dark:text-slate-200 font-bold"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    size="lg"
                    className={`flex-1 h-11 sm:h-12 rounded-xl font-bold ${colors.buttonBg} ${colors.buttonText} transition-colors shadow-lg`}
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
};

export default ConfirmModal;
