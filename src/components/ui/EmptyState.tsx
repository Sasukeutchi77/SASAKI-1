import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`p-8 sm:p-12 text-center bg-[#101428] rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,243,255,0.08)] font-mono transition-all ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
        {title}
      </h3>
      <p className="mt-2 text-xs sm:text-sm text-cyan-400/70 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 text-white text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(0,210,255,0.4)] transition-all cursor-pointer active:scale-95"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2.5 rounded-xl bg-[#141933] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
