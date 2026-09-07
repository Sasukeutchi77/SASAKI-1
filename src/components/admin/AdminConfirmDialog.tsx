import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  isDestructive = true,
  onConfirm,
  onCancel,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <button
                  onClick={onCancel}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>
            </div>
          </div>

          {children && <div className="mt-4">{children}</div>}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition shadow-sm ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
