import React from 'react';
import { LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './ui/utils';

interface LogoutActionButtonProps {
  onClick: () => void;
  collapsed?: boolean;
  className?: string;
}

const LogoutActionButton: React.FC<LogoutActionButtonProps> = ({
  onClick,
  collapsed = false,
  className,
}) => {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      title={collapsed ? 'Log Out' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors',
        collapsed && 'justify-center px-3',
        className
      )}
    >
      <LogOut size={18} strokeWidth={1.5} className="flex-shrink-0" />
      {!collapsed && <span className="font-body font-medium text-sm">Log Out</span>}
    </motion.button>
  );
};

export default LogoutActionButton;