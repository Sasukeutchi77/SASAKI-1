import React, { useState, useEffect } from 'react';
import { Zap, Flame, Trophy, ChevronRight } from 'lucide-react';
import { gamification, GamificationState } from '../../services/gamification';

interface GamifiedHUDProps {
  onOpenQuestsModal: () => void;
}

export const GamifiedHUD: React.FC<GamifiedHUDProps> = ({ onOpenQuestsModal }) => {
  const [gameState, setGameState] = useState<GamificationState>(gamification.getState());

  useEffect(() => {
    const unsubscribe = gamification.subscribe((newState) => {
      setGameState(newState);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Streak Badge */}
      <button
        onClick={onOpenQuestsModal}
        id="hud-streak-btn"
        className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
        title="Série de connexion quotidienne active"
      >
        <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform animate-pulse" />
        <span className="text-[11px] sm:text-xs font-black">{gameState.streakDays}j</span>
      </button>

      {/* Level & XP HUD Pill */}
      <button
        onClick={onOpenQuestsModal}
        id="hud-level-xp-btn"
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-950/20 via-stone-900/30 to-amber-950/20 dark:from-stone-800 dark:to-stone-850 hover:border-emerald-500/50 border border-emerald-600/30 text-stone-900 dark:text-stone-100 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
        title="Voir mes points XP, niveau et quêtes du jour"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-black text-[10px] shadow-xs">
            {gameState.level}
          </div>
          <span className="hidden sm:inline font-bold text-stone-900 dark:text-stone-100 text-[11px]">
            {gameState.rankTitle}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-0.5 w-14 sm:w-20">
          <div className="flex items-center justify-between text-[9px] font-black text-emerald-600 dark:text-emerald-400">
            <span>{gameState.currentLevelXP} XP</span>
          </div>
          <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${gameState.progressPercent}%` }}
            />
          </div>
        </div>

        <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform shrink-0" />
      </button>
    </div>
  );
};
