import React from 'react';
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: 'logout' | 'delete' | 'warning';
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
  icon = 'warning'
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

  const handleConfirm = () => {
    onConfirm();
    onClose();
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#f7f9fc] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#dde3eb]"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-[#0a1628] hover:bg-[#dde3eb] rounded-xl transition-colors z-10"
              >
                <X size={20} />
              </button>

              {/* Content */}
              <div className="p-8 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                  className={`w-20 h-20 ${colors.iconBg} rounded-full flex items-center justify-center mx-auto mb-6 ${colors.iconColor}`}
                >
                  {getIcon()}
                </motion.div>

                {/* Title */}
                <h2 className="text-2xl font-display font-bold text-[#0a1628] mb-3">
                  {title}
                </h2>

                {/* Message */}
                <p className="text-[#5a6578] mb-8 leading-relaxed">
                  {message}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 px-6 py-3 rounded-xl border-[#dde3eb] hover:border-[#d1cec6] hover:bg-[#edf1f7] font-bold"
                  >
                    {cancelText}
                  </Button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold ${colors.buttonBg} ${colors.buttonText} transition-colors shadow-lg`}
                  >
                    {confirmText}
                  </motion.button>
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
