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
      className={`p-8 sm:p-12 text-center bg-[#101428] rounded-2xl border border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.15)] font-mono ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
        {title}
      </h3>
      <p className="mt-2 text-xs sm:text-sm text-red-300/80 max-w-md mx-auto leading-relaxed">
        {cleanMessage}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:brightness-110 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141933] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>
        )}
      </div>
    </div>
  );
};
