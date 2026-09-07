import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Une erreur est survenue',
  message,
  onRetry,
  onGoHome,
  className = '',
}) => {
  // Convert technical errors to user-friendly French text
  const cleanMessage = React.useMemo(() => {
    if (!message) return 'Impossible de charger ces informations actuellement.';
    if (message.includes('permission-denied') || message.includes('Accès refusé') || message.includes('403')) {
      return 'Vous ne disposez pas des autorisations nécessaires pour accéder à cette ressource.';
    }
    if (message.includes('not-found') || message.includes('404')) {
      return 'Le contenu demandé est introuvable ou a été retiré.';
    }
    if (message.includes('network') || message.includes('Failed to fetch')) {
      return 'Problème de connexion réseau. Veuillez vérifier votre accès Internet et réessayer.';
    }
    if (message.includes('429') || message.includes('Trop de requêtes')) {
      return 'Trop de requêtes envoyées en peu de temps. Veuillez patienter quelques instants.';
    }
    return message;
  }, [message]);

  return (
    <div
      className={`p-8 sm:p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-red-200/80 dark:border-red-950/50 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 ring-1 ring-red-500/20">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
        {cleanMessage}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>
        )}
      </div>
    </div>
  );
};
