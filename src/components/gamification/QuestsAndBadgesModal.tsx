import React, { useState, useEffect } from 'react';
import { X, Trophy, Zap, Flame, Award, Shield, CheckCircle2, Sparkles, Star } from 'lucide-react';
import { gamification, GamificationState } from '../../services/gamification';

interface QuestsAndBadgesModalProps {
  onClose: () => void;
}

export const QuestsAndBadgesModal: React.FC<QuestsAndBadgesModalProps> = ({ onClose }) => {
  const [state, setState] = useState<GamificationState>(gamification.getState());

  useEffect(() => {
    const unsub = gamification.subscribe((newState) => setState(newState));
    return unsub;
  }, []);

  const unlockedBadgesCount = state.badges.filter((b) => b.unlockedAt !== null).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-stone-900 text-stone-100 rounded-3xl shadow-2xl border border-stone-800 flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center text-stone-950 font-black shadow-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Centre des Rangs & Quêtes
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  purge-info
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Développeur : <span className="text-amber-400 font-bold">SASAKI COMPAGNIE</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Player Profile Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-800/90 to-stone-850 border border-stone-700/80 shadow-inner flex flex-col sm:flex-row items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-amber-500 to-rose-500 flex items-center justify-center text-stone-950 font-black text-2xl shadow-xl">
                {state.level}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-stone-900 rounded-full border border-stone-700">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-lg font-black text-white">{state.rankTitle}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  Niveau {state.level}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-current" /> {state.streakDays} jours consécutifs
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-xs text-stone-300 font-bold">
                  <span>Expérience totale</span>
                  <span className="text-emerald-400 font-extrabold">{state.currentLevelXP} / {state.nextLevelXP} XP</span>
                </div>
                <div className="w-full h-2.5 bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 rounded-full transition-all duration-500"
                    style={{ width: `${state.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* XP Rewards Guide */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" /> Comment gagner des XP sur purge-info
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl bg-stone-800/60 border border-stone-700/60">
                <div className="text-sm font-black text-emerald-400">+10 XP</div>
                <div className="text-[11px] text-stone-300 font-medium">Lecture dépêche</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-800/60 border border-stone-700/60">
                <div className="text-sm font-black text-rose-400">+5 XP</div>
                <div className="text-[11px] text-stone-300 font-medium">Like citoyen</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-800/60 border border-stone-700/60">
                <div className="text-sm font-black text-amber-400">+20 XP</div>
                <div className="text-[11px] text-stone-300 font-medium">Commentaire</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-800/60 border border-stone-700/60">
                <div className="text-sm font-black text-sky-400">+15 XP</div>
                <div className="text-[11px] text-stone-300 font-medium">Partage réseau</div>
              </div>
            </div>
          </div>

          {/* Badges and Achievements Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" /> Trophées Citoyens ({unlockedBadgesCount}/{state.badges.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {state.badges.map((badge) => {
                const isUnlocked = badge.unlockedAt !== null;
                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                      isUnlocked
                        ? 'bg-stone-800/90 border-amber-500/40 shadow-sm'
                        : 'bg-stone-850/40 border-stone-800 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                        isUnlocked
                          ? 'bg-amber-500/20 border border-amber-500/40'
                          : 'bg-stone-800 border border-stone-700 grayscale'
                      }`}
                    >
                      {badge.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-white truncate">{badge.name}</h4>
                        {isUnlocked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5">{badge.description}</p>
                      {isUnlocked && (
                        <span className="text-[9px] text-amber-400/90 font-bold mt-1 inline-block">
                          Débloqué • +50 XP
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <span className="text-stone-500">Développeur :</span>
            <span className="text-amber-400 font-extrabold">SASAKI COMPAGNIE</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
