import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  ArrowRight,
  KeyRound,
  UserPlus,
  LogIn,
  RotateCw,
  ShieldAlert,
  Clock,
  WifiOff,
} from 'lucide-react';
import { toastBus, ToastItem, ToastType, ToastAction } from '../services/toastBus';
import { analyzeAuthError, AnalyzedAuthError } from '../services/authErrors';
import { openAuthModal, AuthModalMode } from '../services/authModalEvents';
import { sfx } from '../services/soundEffects';

export interface ToastOptions {
  title?: string;
  duration?: number;
  action?: ToastAction;
  secondaryAction?: ToastAction;
  category?: string;
}

export interface AuthToastOptions extends ToastOptions {
  retry?: () => void | Promise<void>;
  overrideActionLabel?: string;
  overrideAction?: () => void;
  overrideMode?: AuthModalMode;
}

export interface ToastMethods {
  error: (message: string, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  authError: (error: any, options?: AuthToastOptions) => string;
}

export interface ToastContextType extends ToastMethods {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  toast: ToastMethods;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Individual Toast Card with progress bar & pause on hover
const ToastCard: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(item.duration || 6000);
  const timerRef = useRef<any>(null);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;

    const totalDuration = item.duration;
    const interval = 50;

    const tick = () => {
      if (isHovered) return;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, remainingTimeRef.current - elapsed);
      const pct = (remaining / totalDuration) * 100;
      setProgress(pct);

      if (remaining <= 0) {
        onDismiss(item.id);
      }
    };

    timerRef.current = setInterval(tick, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [item.id, item.duration, isHovered, onDismiss]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    startTimeRef.current = Date.now();
  };

  // Determine icon & styling based on category and type
  const renderIcon = () => {
    if (item.type === 'auth') {
      if (item.category === 'credentials' || item.category === 'weak_password') {
        return <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />;
      }
      if (item.category === 'user_not_found') {
        return <UserPlus className="w-5 h-5 text-cyan-400 shrink-0" />;
      }
      if (item.category === 'already_exists') {
        return <LogIn className="w-5 h-5 text-emerald-400 shrink-0" />;
      }
      if (item.category === 'suspended') {
        return <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />;
      }
      if (item.category === 'rate_limit') {
        return <Clock className="w-5 h-5 text-amber-400 shrink-0" />;
      }
      if (item.category === 'network') {
        return <WifiOff className="w-5 h-5 text-rose-400 shrink-0" />;
      }
      return <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />;
    }

    switch (item.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
      case 'error':
      default:
        return <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />;
    }
  };

  const getThemeStyles = () => {
    if (item.type === 'auth') {
      return {
        bg: 'from-[#140b12] via-[#0f172a] to-[#0a101f]',
        border: 'border-red-500/50 hover:border-red-400/80',
        shadow: 'shadow-[0_0_25px_rgba(239,68,68,0.3)]',
        badge: 'bg-red-500/20 text-red-300 border-red-500/40',
        badgeText: 'AUTHENTIFICATION',
        progress: 'bg-gradient-to-r from-red-500 to-amber-500',
      };
    }

    switch (item.type) {
      case 'success':
        return {
          bg: 'from-[#061813] via-[#091b24] to-[#0a0f1d]',
          border: 'border-emerald-500/50 hover:border-emerald-400/80',
          shadow: 'shadow-[0_0_25px_rgba(16,185,129,0.3)]',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          badgeText: 'SUCCÈS',
          progress: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
        };
      case 'warning':
        return {
          bg: 'from-[#1c1206] via-[#151722] to-[#0f1422]',
          border: 'border-amber-500/50 hover:border-amber-400/80',
          shadow: 'shadow-[0_0_25px_rgba(245,158,11,0.3)]',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          badgeText: 'ATTENTION',
          progress: 'bg-gradient-to-r from-amber-500 to-yellow-400',
        };
      case 'info':
        return {
          bg: 'from-[#081524] via-[#0f172a] to-[#061824]',
          border: 'border-cyan-500/50 hover:border-cyan-400/80',
          shadow: 'shadow-[0_0_25px_rgba(6,182,212,0.3)]',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          badgeText: 'INFORMATION',
          progress: 'bg-gradient-to-r from-cyan-500 to-blue-500',
        };
      case 'error':
      default:
        return {
          bg: 'from-[#1a0808] via-[#0f172a] to-[#120a1c]',
          border: 'border-red-500/50 hover:border-red-400/80',
          shadow: 'shadow-[0_0_25px_rgba(239,68,68,0.3)]',
          badge: 'bg-red-500/20 text-red-300 border-red-500/40',
          badgeText: 'ERREUR',
          progress: 'bg-gradient-to-r from-red-500 to-rose-400',
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-gradient-to-r ${theme.bg} ${theme.border} ${theme.shadow} border p-4 backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 p-2 rounded-xl bg-white/5 border border-white/10">
          {renderIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`px-2 py-0.5 text-[10px] font-extrabold uppercase font-mono tracking-wider rounded border ${theme.badge}`}
            >
              {theme.badgeText}
            </span>
            {item.title && (
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
                {item.title}
              </h4>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium break-words">
            {item.message}
          </p>

          {/* Actionable Feedback Buttons */}
          {(item.action || item.secondaryAction) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    onDismiss(item.id);
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
                >
                  <span>{item.action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {item.secondaryAction && (
                <button
                  type="button"
                  onClick={() => {
                    item.secondaryAction?.onClick();
                    onDismiss(item.id);
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {item.secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Fermer cette notification"
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      {item.duration && item.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
          <div
            className={`h-full ${theme.progress} transition-all duration-75`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const duration = options.duration !== undefined ? options.duration : type === 'error' || type === 'auth' ? 7000 : 4500;

      const item: ToastItem = {
        id,
        type,
        title: options.title,
        message,
        duration,
        action: options.action,
        secondaryAction: options.secondaryAction,
        category: options.category,
        createdAt: Date.now(),
      };

      if (type === 'error' || type === 'auth') {
        sfx.playError();
      } else if (type === 'success') {
        sfx.playSuccess();
      }

      setToasts((prev) => [item, ...prev].slice(0, 4)); // Max 4 concurrent toasts
      return id;
    },
    []
  );

  // Dedicated human-readable auth error handler with actionable buttons
  const authError = useCallback(
    (error: any, options: AuthToastOptions = {}): string => {
      const analyzed: AnalyzedAuthError = analyzeAuthError(error);

      // Determine the actionable feedback button
      let action: ToastAction | undefined = options.action;
      if (!action) {
        if (options.overrideAction && options.overrideActionLabel) {
          action = {
            label: options.overrideActionLabel,
            onClick: options.overrideAction,
          };
        } else if (analyzed.actionType === 'register') {
          action = {
            label: options.overrideActionLabel || analyzed.actionLabel || 'Créer mon compte citoyen',
            onClick: () => openAuthModal(options.overrideMode || 'register'),
          };
        } else if (analyzed.actionType === 'forgot') {
          action = {
            label: options.overrideActionLabel || analyzed.actionLabel || 'Mot de passe oublié ?',
            onClick: () => openAuthModal(options.overrideMode || 'forgot'),
          };
        } else if (analyzed.actionType === 'login') {
          action = {
            label: options.overrideActionLabel || analyzed.actionLabel || 'Se connecter',
            onClick: () => openAuthModal(options.overrideMode || 'login'),
          };
        } else if (analyzed.actionType === 'retry' && options.retry) {
          action = {
            label: options.overrideActionLabel || analyzed.actionLabel || 'Réessayer',
            onClick: () => {
              options.retry?.();
            },
          };
        }
      }

      return showToast('auth', analyzed.message, {
        title: options.title || analyzed.title,
        duration: options.duration || 8000, // Generous time for actionable interaction
        action,
        secondaryAction: options.secondaryAction,
        category: analyzed.category,
      });
    },
    [showToast]
  );

  // Expose toast convenience helpers
  const toastHelpers = {
    error: (msg: string, opts?: ToastOptions) => showToast('error', msg, opts),
    success: (msg: string, opts?: ToastOptions) => showToast('success', msg, opts),
    warning: (msg: string, opts?: ToastOptions) => showToast('warning', msg, opts),
    info: (msg: string, opts?: ToastOptions) => showToast('info', msg, opts),
    authError,
  };

  // Wire up toastBus listener for non-React/API triggers
  useEffect(() => {
    const unsubToast = toastBus.onToast((incoming) => {
      setToasts((prev) => [incoming, ...prev].slice(0, 4));
      if (incoming.type === 'error' || incoming.type === 'auth') {
        sfx.playError();
      } else if (incoming.type === 'success') {
        sfx.playSuccess();
      }
    });

    const unsubDismiss = toastBus.onDismiss((id) => {
      dismissToast(id);
    });

    const unsubClear = toastBus.onClear(() => {
      clearToasts();
    });

    return () => {
      unsubToast();
      unsubDismiss();
      unsubClear();
    };
  }, [dismissToast, clearToasts]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        clearToasts,
        toast: toastHelpers,
        ...toastHelpers,
      }}
    >
      {children}

      {/* Global Toast Render Container */}
      {toasts.length > 0 && (
        <div
          id="global-toast-container"
          aria-label="Zone de notifications"
          className="fixed top-4 sm:top-6 right-0 sm:right-6 left-0 sm:left-auto px-3 sm:px-0 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none"
        >
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
