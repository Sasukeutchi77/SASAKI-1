import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { Radio, ChevronRight, Pause, Play, Flame, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BreakingNewsTickerProps {
  articles: Article[];
  onOpenArticle: (article: Article) => void;
}

export const BreakingNewsTicker: React.FC<BreakingNewsTickerProps> = ({
  articles,
  onOpenArticle,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Filter or prioritize recent published articles or provide fallback alerts
  const tickerItems = articles.slice(0, 6).map((art, idx) => ({
    id: art.id,
    title: art.title,
    category: art.categoryName,
    time: new Date(art.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    isUrgent: idx === 0 || art.viewsCount > 100,
    article: art,
  }));

  useEffect(() => {
    if (tickerItems.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tickerItems.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [tickerItems.length, isPaused]);

  if (tickerItems.length === 0) return null;

  const currentItem = tickerItems[currentIndex] || tickerItems[0];

  return (
    <div
      id="breaking-news-ticker"
      className="relative w-full bg-[#080b16] border border-cyan-500/35 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,243,255,0.08)] mb-5 transition-all group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/40 via-transparent to-fuchsia-950/20 pointer-events-none" />

      <div className="relative flex items-center justify-between p-2 sm:p-2.5 gap-2.5">
        {/* Live Badge */}
        <div className="flex items-center gap-2 shrink-0 bg-cyan-950/80 border border-cyan-400/60 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.3)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
          </span>
          <span className="hidden sm:inline tracking-wider uppercase text-[11px]">EN DIRECT</span>
          <span className="sm:hidden text-[10px] font-bold">FLASH</span>
        </div>

        {/* Current Alert Content */}
        <div
          onClick={() => currentItem.article && onOpenArticle(currentItem.article)}
          className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 cursor-pointer overflow-hidden py-0.5"
        >
          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
            {currentItem.isUrgent ? (
              <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/50 text-red-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden md:inline">URGENT</span>
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                {currentItem.category}
              </span>
            )}
            <span className="text-cyan-400/60 hidden sm:inline">[{currentItem.time}]</span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
            {currentItem.title}
          </p>

          <ChevronRight className="w-3.5 h-3.5 text-cyan-400/50 group-hover:text-cyan-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Controls: Pause / Play & Counter */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 pl-1 border-l border-cyan-500/20 text-cyan-400/70 font-mono text-xs">
          <span className="text-[11px] hidden sm:inline">
            {currentIndex + 1}/{tickerItems.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(!isPaused);
            }}
            className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
            title={isPaused ? 'Reprendre le défilement' : 'Mettre en pause'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
