import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

const Toast = ({ toast }) => {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-rose-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-sky-400" />,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl glass-panel shadow-2xl border border-gray-700/50 text-sm font-medium"
      >
        {icons[toast.type] || icons.info}
        <span className="text-gray-100">{toast.message}</span>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast;
