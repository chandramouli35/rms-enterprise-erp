import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface CustomModalProps {
 isOpen: boolean;
 onClose: () => void;
 title: string;
 children: React.ReactNode;
 footer?: React.ReactNode;
}

export const CustomModal: React.FC<CustomModalProps> = ({ isOpen, onClose, title, children, footer }) => {
 const [show, setShow] = useState(false);

 useEffect(() => {
 if (isOpen) {
 setShow(true);
 document.body.style.overflow = 'hidden';
 } else {
 setTimeout(() => setShow(false), 300); // Wait for transition
 document.body.style.overflow = 'unset';
 }
 return () => {
 document.body.style.overflow = 'unset';
 };
 }, [isOpen]);

 if (!isOpen && !show) return null;

 return (
 <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
 {/* Backdrop */}
 <div 
 className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
 onClick={onClose}
 />
 
 {/* Modal Box */}
 <div 
 className={`relative w-full max-w-md max-h-[95vh] flex flex-col bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
 >
 {/* Header */}
 <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] shrink-0">
 <h2 className="text-lg font-semibold text-[var(--text-main)]">{title}</h2>
 <button 
 onClick={onClose}
 className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] p-1.5 rounded-lg transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 
 {/* Body */}
 <div className="p-6 text-[var(--text-muted)] overflow-y-auto">
 {children}
 </div>

 {/* Footer */}
 {footer && (
 <div className="px-6 py-4 border-t border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] flex justify-end gap-3 shrink-0">
 {footer}
 </div>
 )}
 </div>
 </div>
 );
};
