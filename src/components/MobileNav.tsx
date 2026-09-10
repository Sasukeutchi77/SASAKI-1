import React from 'react';
import { Home, Trophy, Compass, Bookmark, Users, User, Plus, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sfx } from '../services/soundEffects';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSearch?: () => void;
  onOpenCreateArticle: () => void;
  onOpenNotifications?: () => void;
  onOpenBookmarks: () => void;
  onOpenProfile: (userId?: string) => void;
  onOpenMyProfile: () => void;
  onOpenAuth: () => void;
  onOpenAdmin?: () => void;
  onOpenMyHouse?: () => void;
  onOpenRankings?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenCreateArticle,
  onOpenBookmarks,
  onOpenMyProfile,
  onOpenAuth,
  onOpenMyHouse,
  onOpenRankings,
}) => {
  const { user, isAuthenticated, bookmarksCount } = useAuth();
  const isJournalistOrAdmin = isAuthenticated && (user?.role === 'journalist' || user?.role === 'admin');

  return (
    <>
      {/* Floating compose button for journalists & admins on mobile/Android */}
      {isJournalistOrAdmin && (
        <button
          id="mobile-floating-create-btn"
          onClick={() => {
            sfx.playClick();
            onOpenCreateArticle();
          }}
          className="md:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0.75rem))] right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 active:scale-92 text-white shadow-[0_4px_25px_rgba(29,104,255,0.65)] flex items-center justify-center cursor-pointer interactive-pop touch-target border border-white/30"
          aria-label="Rédiger un article"
        >
          <Plus className="w-6 h-6 stroke-[2.8]" />
        </button>
      )}

      {/* Main Ergonomic Bottom Navigation Bar for Android & Mobile */}
      <nav
        id="mobile-bottom-navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#040817]/95 backdrop-blur-xl border-t border-blue-500/25 shadow-[0_-8px_30px_rgba(0,10,35,0.85)] safe-area-bottom transition-all"
      >
        <div className="grid grid-cols-6 h-16 px-1 items-center max-w-lg mx-auto">
          {/* 1. Accueil */}
          <button
            id="mobile-nav-home"
            onClick={() => {
              sfx.playMechanicalClick();
              onTabChange('feed');
            }}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer interactive-pop ${
              activeTab === 'feed'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'feed'
                  ? 'bg-blue-600/30 border border-blue-400/50 shadow-[0_0_15px_rgba(29,104,255,0.45)] text-cyan-300'
                  : ''
              }`}
            >
              <Home className="w-5 h-5" />
            </div>
            <span className={`leading-tight mt-0.5 text-[10px] tracking-tight ${activeTab === 'feed' ? 'text-cyan-300 font-extrabold' : ''}`}>
              Accueil
            </span>
          </button>

          {/* 2. Classement (Top 7) */}
          <button
            id="mobile-nav-rankings"
            onClick={() => {
              sfx.playClick();
              if (onOpenRankings) {
                onOpenRankings();
              } else {
                onTabChange('rankings');
              }
            }}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer interactive-pop ${
              activeTab === 'rankings'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'rankings'
                  ? 'bg-gradient-to-r from-yellow-500/25 to-amber-500/25 border border-yellow-400/50 shadow-[0_0_15px_rgba(234,179,8,0.45)] text-yellow-300'
                  : ''
              }`}
            >
              <Trophy className={`w-5 h-5 ${activeTab === 'rankings' ? 'text-yellow-300' : 'text-yellow-400/80'}`} />
            </div>
            <span className={`leading-tight mt-0.5 text-[10px] tracking-tight ${activeTab === 'rankings' ? 'text-yellow-300 font-extrabold' : ''}`}>
              Classement
            </span>
          </button>

          {/* 3. Explorer */}
          <button
            id="mobile-nav-explore"
            onClick={() => {
              sfx.playMechanicalClick();
              if (onOpenSearch) {
                onOpenSearch();
              } else {
                onTabChange('search');
              }
            }}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer interactive-pop ${
              activeTab === 'search' || activeTab === 'trending'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'search' || activeTab === 'trending'
                  ? 'bg-blue-600/30 border border-blue-400/50 shadow-[0_0_15px_rgba(29,104,255,0.45)] text-cyan-300'
                  : ''
              }`}
            >
              <Compass className="w-5 h-5" />
            </div>
            <span className={`leading-tight mt-0.5 text-[10px] tracking-tight ${activeTab === 'search' || activeTab === 'trending' ? 'text-cyan-300 font-extrabold' : ''}`}>
              Explorer
            </span>
          </button>

          {/* 4. Abonnements */}
          <button
            id="mobile-nav-following"
            onClick={() => {
              sfx.playMechanicalClick();
              onTabChange('following');
            }}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer interactive-pop ${
              activeTab === 'following'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'following'
                  ? 'bg-blue-600/30 border border-blue-400/50 shadow-[0_0_15px_rgba(29,104,255,0.45)] text-cyan-300'
                  : ''
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
            <span className={`leading-tight mt-0.5 text-[10px] tracking-tight ${activeTab === 'following' ? 'text-cyan-300 font-extrabold' : ''}`}>
              Abonnés
            </span>
          </button>

          {/* 5. Favoris avec badge jaune lumineux */}
          <button
            id="mobile-nav-bookmarks"
            onClick={() => {
              sfx.playClick();
              if (isAuthenticated) {
                onOpenBookmarks();
              } else {
                onOpenAuth();
              }
            }}
            className={`relative flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer interactive-pop ${
              activeTab === 'bookmarks'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative p-1.5 rounded-xl">
              <Bookmark className="w-5 h-5" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-0.5 -right-1 px-1.5 min-w-4 h-4 bg-yellow-400 text-[10px] font-black font-mono text-slate-950 rounded-full flex items-center justify-center ring-2 ring-[#040817] shadow-[0_0_10px_rgba(250,204,21,0.85)]">
                  {bookmarksCount}
                </span>
              )}
            </div>
            <span className={`leading-tight mt-0.5 text-[10px] tracking-tight ${activeTab === 'bookmarks' ? 'text-cyan-300 font-extrabold' : ''}`}>
              Favoris
            </span>
          </button>

          {/* 6. Profil */}
          <button
            id="mobile-nav-profile"
            onClick={() => {
              sfx.playClick();
              if (isAuthenticated && user) {
                onOpenMyProfile();
              } else {
                onOpenAuth();
              }
            }}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer interactive-pop ${
              activeTab === 'profile'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-0.5 rounded-full transition-all ${
                activeTab === 'profile'
                  ? 'ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.7)]'
                  : ''
              }`}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover border border-blue-500/40"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-blue-500/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
            </div>
            <span className={`leading-tight mt-0.5 text-[10px] tracking-tight ${activeTab === 'profile' ? 'text-cyan-300 font-extrabold' : ''}`}>
              Compte
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
