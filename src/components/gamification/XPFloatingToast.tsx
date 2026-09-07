import React, { useState, useEffect } from 'react';
import { Zap, Trophy } from 'lucide-react';
import { gamification } from '../../services/gamification';

interface ToastItem {
  id: string;
  amount: number;
  reason: string;
}

export const XPFloatingToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = gamification.subscribe((_state, xpGained) => {
      if (xpGained && xpGained.amount > 0) {
        const id = Math.random().toString(36).substring(2, 9);
        const newItem: ToastItem = {
          id,
          amount: xpGained.amount,
          reason: xpGained.reason,
        };

        setToasts((prev) => [...prev, newItem]);

        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3200);
      }
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-stone-900/95 dark:bg-stone-800/95 text-white shadow-2xl border border-amber-500/40 backdrop-blur-md animate-bounce"
          style={{ animationDuration: '0.8s' }}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center text-stone-950 font-black text-sm shadow-sm shrink-0">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-extrabold text-sm tracking-wide">
                +{toast.amount} XP
              </span>
              <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                Gain
              </span>
            </div>
            <span className="text-xs text-stone-300 font-medium line-clamp-1">{toast.reason}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
