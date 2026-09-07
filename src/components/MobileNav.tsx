import React from 'react';
import { Home, Compass, Bookmark, Users, User, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenCreateArticle,
  onOpenBookmarks,
  onOpenMyProfile,
  onOpenAuth,
}) => {
  const { user, isAuthenticated, bookmarksCount } = useAuth();

  return (
    <>
      {/* Floating compose button for journalists & admins on mobile */}
      {isAuthenticated && (user?.role === 'journalist' || user?.role === 'admin') && (
        <button
          id="mobile-floating-create-btn"
          onClick={onOpenCreateArticle}
          className="md:hidden fixed bottom-20 right-4 z-40 w-13 h-13 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 active:scale-95 text-black shadow-[0_0_20px_rgba(0,243,255,0.6)] flex items-center justify-center cursor-pointer interactive-pop touch-target border border-white/40"
          aria-label="Rédiger un article"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Main Ergonomic Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0e1a]/95 backdrop-blur-lg border-t border-cyan-500/30 shadow-[0_-5px_25px_rgba(0,243,255,0.1)] safe-area-bottom transition-all"
      >
        <div className="grid grid-cols-5 h-15 px-1 items-center">
          {/* 1. Accueil */}
          <button
            id="mobile-nav-home"
            onClick={() => onTabChange('feed')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer ${
              activeTab === 'feed'
                ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]'
                : 'text-cyan-400/50 hover:text-cyan-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'feed' ? 'bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,243,255,0.3)]' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="leading-tight mt-0.5">Accueil</span>
          </button>

          {/* 2. Explorer */}
          <button
            id="mobile-nav-explore"
            onClick={() => {
              if (onOpenSearch) {
                onOpenSearch();
              } else {
                onTabChange('search');
              }
            }}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer ${
              activeTab === 'search' || activeTab === 'trending'
                ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]'
                : 'text-cyan-400/50 hover:text-cyan-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'search' || activeTab === 'trending' ? 'bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,243,255,0.3)]' : ''}`}>
              <Compass className="w-5 h-5" />
            </div>
            <span className="leading-tight mt-0.5">Explorer</span>
          </button>

          {/* 3. Abonnements */}
          <button
            id="mobile-nav-following"
            onClick={() => onTabChange('following')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer ${
              activeTab === 'following'
                ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]'
                : 'text-cyan-400/50 hover:text-cyan-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'following' ? 'bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,243,255,0.3)]' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="leading-tight mt-0.5">Abonnés</span>
          </button>

          {/* 4. Favoris */}
          <button
            id="mobile-nav-bookmarks"
            onClick={isAuthenticated ? onOpenBookmarks : onOpenAuth}
            className={`relative flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]'
                : 'text-cyan-400/50 hover:text-cyan-200'
            }`}
          >
            <div className="relative p-1 rounded-xl">
              <Bookmark className="w-5 h-5" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-0.5 -right-1 px-1 min-w-4 h-4 bg-fuchsia-500 text-[10px] font-bold font-mono text-white rounded-full flex items-center justify-center ring-2 ring-[#0b0e1a] shadow-[0_0_8px_rgba(240,38,211,0.8)]">
                  {bookmarksCount}
                </span>
              )}
            </div>
            <span className="leading-tight mt-0.5">Favoris</span>
          </button>

          {/* 5. Profil */}
          <button
            id="mobile-nav-profile"
            onClick={() => {
              if (isAuthenticated && user) {
                onOpenMyProfile();
              } else {
                onOpenAuth();
              }
            }}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-bold transition-all touch-target cursor-pointer ${
              activeTab === 'profile'
                ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]'
                : 'text-cyan-400/50 hover:text-cyan-200'
            }`}
          >
            <div className={`p-0.5 rounded-full ${activeTab === 'profile' ? 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(0,243,255,0.7)]' : ''}`}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover border border-cyan-500/40"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
            </div>
            <span className="leading-tight mt-0.5">{isAuthenticated ? 'Profil' : 'Compte'}</span>
          </button>
        </div>
      </nav>
    </>
  );
};

