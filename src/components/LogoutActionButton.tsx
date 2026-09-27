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
      whileHover={{ x: 2 }}
      onClick={onClick}
      title={collapsed ? 'Log Out' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[#5a6578] font-bold border border-transparent hover:bg-[#dde3eb] hover:border-[#dde3eb] hover:text-[#0a1628] transition-all duration-200 whitespace-nowrap',
        collapsed && 'justify-center',
        className
      )}
    >
      <LogOut size={18} strokeWidth={1.5} className="flex-shrink-0" />
      {!collapsed && <span className="font-body text-xs">Log Out</span>}
    </motion.button>
  );
};

export default LogoutActionButton;