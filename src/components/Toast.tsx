import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-[360px] w-[90%]"
        >
          <div className="retro-box bg-[#3B2F2F] text-[#F5EFE4] px-4 py-3 flex items-center justify-between gap-3 shadow-[4px_4px_0_#2E8BFF]">
            <div className="flex items-center gap-2.5">
              <span className="text-[#2E8BFF] text-lg font-pixel">★</span>
              <p className="font-pixel text-xs sm:text-sm tracking-wide">{message}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#2E8BFF] shrink-0" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
