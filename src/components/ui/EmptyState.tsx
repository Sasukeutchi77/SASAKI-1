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
      className={`p-8 sm:p-12 text-center bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200/80 dark:border-stone-800 transition-all ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-1 ring-emerald-500/20">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
