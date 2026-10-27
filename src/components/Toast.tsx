import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 flex items-center gap-2.5 bg-[#FFFFFF] border border-[#E9E4F5] text-[#29263A] px-4 py-2.5 rounded-2xl shadow-[0_8px_25px_rgba(41,38,58,0.08)] animate-in slide-in-from-top-3 fade-in duration-200">
      {toast.type === 'error' ? (
        <AlertCircle className="w-4 h-4 text-[#EF4444]" />
      ) : toast.type === 'info' ? (
        <Info className="w-4 h-4 text-[#3B82F6]" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
      )}
      <span className="text-xs font-medium text-[#29263A]">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-[#858398] hover:text-[#29263A] p-0.5 rounded-lg transition-colors ml-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
