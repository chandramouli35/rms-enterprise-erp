import React from 'react';
import { useUiStore } from '../store/uiStore';
import type { Toast } from '../store/uiStore';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastIcon = ({ type }: { type: Toast['type'] }) => {
  switch (type) {
    case 'success': return <CheckCircle2 className="text-green-500" size={20} />;
    case 'error': return <XCircle className="text-red-500" size={20} />;
    case 'info': return <Info className="text-blue-500" size={20} />;
    default: return null;
  }
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] min-w-[300px] max-w-md animate-in slide-in-from-right-8 fade-in duration-300"
        >
          <div className="mt-0.5">
            <ToastIcon type={toast.type} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-main)]">{toast.message}</p>
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
