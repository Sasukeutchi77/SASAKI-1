import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Award, Sparkles, ChevronRight, Zap, Trophy, ShieldCheck } from 'lucide-react';
import { gamification, GamificationState, DailyQuest } from '../../services/gamification';

interface DailyQuestsWidgetProps {
  onOpenFullQuests: () => void;
}

export const DailyQuestsWidget: React.FC<DailyQuestsWidgetProps> = ({ onOpenFullQuests }) => {
  const [state, setState] = useState<GamificationState>(gamification.getState());

  useEffect(() => {
    const unsub = gamification.subscribe((newState) => setState(newState));
    return unsub;
  }, []);

  const completedCount = state.quests.filter((q) => q.completed).length;

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white border border-stone-800 shadow-xl relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar of Widget */}
      <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-stone-950 font-black shadow-md">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-stone-100 flex items-center gap-2">
                Quêtes & Missions du Jour
              </h3>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {completedCount}/{state.quests.length} Complétées
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Gagnez des points d'expérience pour élever votre rang citoyen sur <span className="text-amber-400 font-bold">purge-info</span>
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFullQuests}
          className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          <span>Trophées & Rangs</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quests List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 relative z-10">
        {state.quests.map((quest) => {
          const progressPercent = Math.min(100, Math.round((quest.current / quest.target) * 100));
          return (
            <div
              key={quest.id}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                quest.completed
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                  : 'bg-stone-800/60 hover:bg-stone-800/90 border-stone-700/60 text-stone-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-semibold leading-snug line-clamp-2">
                  {quest.title}
                </span>
                {quest.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
                    +{quest.rewardXP} XP
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 mb-1">
                  <span>Progression</span>
                  <span>
                    {quest.current} / {quest.target}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-700/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      quest.completed
                        ? 'bg-emerald-400'
                        : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Developer signature banner */}
      <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Plateforme d'actualités & journalisme citoyen</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-stone-300">
          <span className="text-stone-500">Développeur :</span>
          <span className="px-2 py-0.5 rounded bg-stone-800 text-amber-400 font-extrabold border border-stone-700">
            SASAKI COMPAGNIE
          </span>
        </div>
      </div>
    </div>
  );
};
