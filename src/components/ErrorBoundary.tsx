import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, XCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  autoReload?: boolean;
  autoReloadDelay?: number; // seconds, default 6
}

interface State {
  hasError: boolean;
  error: Error | null;
  countdown: number;
  autoReloadPaused: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private timer: any = null;

  constructor(props: Props) {
    super(props);
    const initialDelay = props.autoReloadDelay !== undefined ? props.autoReloadDelay : 6;
    this.state = {
      hasError: false,
      error: null,
      countdown: initialDelay,
      autoReloadPaused: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Erreur interceptée dans ${this.props.name || 'Composant'}:`, error, errorInfo);
    
    // Start countdown if autoReload is enabled
    if (this.props.autoReload !== false) {
      this.startAutoReloadCountdown();
    }
  }

  public componentWillUnmount() {
    this.clearAutoReloadTimer();
  }

  private clearAutoReloadTimer = () => {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  };

  private startAutoReloadCountdown = () => {
    this.clearAutoReloadTimer();
    const delay = this.props.autoReloadDelay !== undefined ? this.props.autoReloadDelay : 6;
    this.setState({ countdown: delay, autoReloadPaused: false });

    this.timer = setInterval(() => {
      this.setState((prev) => {
        if (prev.autoReloadPaused) return null;
        if (prev.countdown <= 1) {
          this.clearAutoReloadTimer();
          this.executeAutoReload();
          return { countdown: 0 } as Pick<State, 'countdown'>;
        }
        return { countdown: prev.countdown - 1 } as Pick<State, 'countdown'>;
      });
    }, 1000);
  };

  private executeAutoReload = () => {
    // Attempt graceful state reset first, or window reload if top-level
    try {
      if (typeof window !== 'undefined' && this.props.name === 'RootApp') {
        window.location.reload();
      } else {
        this.handleReset();
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  private handleReset = () => {
    this.clearAutoReloadTimer();
    this.setState({ hasError: false, error: null, autoReloadPaused: false });
  };

  private handleManualReload = () => {
    this.clearAutoReloadTimer();
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.handleReset();
    }
  };

  private handlePauseAutoReload = () => {
    this.clearAutoReloadTimer();
    this.setState({ autoReloadPaused: true });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { autoReload = true } = this.props;
      const { countdown, autoReloadPaused, error } = this.state;

      return (
        <div className="w-full p-6 my-4 rounded-2xl bg-[#0b1026] border border-cyan-500/30 text-slate-100 flex flex-col items-center justify-center text-center gap-4 shadow-[0_0_40px_rgba(6,182,212,0.15)] animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>

          <div className="max-w-md">
            <h3 className="text-base font-bold text-white tracking-tight">
              Un incident d'affichage temporaire est survenu
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              L'application a isolé l'erreur pour préserver vos données et votre session.
            </p>
            {error?.message && (
              <p className="mt-2 text-[11px] font-mono text-cyan-300/80 bg-cyan-950/40 border border-cyan-500/20 px-3 py-1.5 rounded-lg truncate max-w-sm mx-auto">
                {error.message}
              </p>
            )}
          </div>

          {/* Auto-reload countdown indicator */}
          {autoReload && !autoReloadPaused && countdown > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/30 text-xs font-medium text-cyan-300">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>
                Rechargement automatique dans <strong className="text-white font-mono">{countdown}s</strong>
              </span>
              <button
                type="button"
                onClick={this.handlePauseAutoReload}
                className="ml-1 text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                title="Arrêter le compte à rebours"
              >
                Annuler
              </button>
            </div>
          )}

          {autoReload && autoReloadPaused && (
            <div className="flex items-center gap-1.5 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-500/20 px-3 py-1 rounded-full">
              <XCircle className="w-3.5 h-3.5" />
              <span>Rechargement automatique désactivé</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center mt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all transform active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser la vue</span>
            </button>

            <button
              type="button"
              onClick={this.handleManualReload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recharger immédiatement</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
