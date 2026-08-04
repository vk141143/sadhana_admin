import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isHazard?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirm Final Action',
  message,
  confirmText = 'Yes, Delete Permanently',
  cancelText = 'Cancel',
  isHazard = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#19202e] border-2 border-rose-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Top Warning Glow Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${isHazard ? 'bg-rose-500' : 'bg-[#f2ca50]'}`} />

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isHazard ? 'bg-rose-500/20 text-rose-400' : 'bg-[#f2ca50]/20 text-[#f2ca50]'}`}>
            <span className="material-symbols-outlined text-2xl">
              {isHazard ? 'warning' : 'help_outline'}
            </span>
          </div>

          <div className="flex-1">
            <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">
              {title}
            </h3>
            <p className="text-xs text-[#d0c5af]/80 mt-2 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#232a39] text-[#dce2f6] border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
              isHazard
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                : 'bg-[#f2ca50] hover:bg-[#ffe082] text-[#3c2f00]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
