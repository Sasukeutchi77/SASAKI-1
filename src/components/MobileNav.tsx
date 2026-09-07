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
          className="md:hidden fixed bottom-20 right-4 z-40 w-13 h-13 rounded-full bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center cursor-pointer interactive-pop touch-target"
          aria-label="Rédiger un article"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Main Ergonomic Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200/80 dark:border-stone-800 safe-area-bottom transition-colors"
      >
        <div className="grid grid-cols-5 h-15 px-1 items-center">
          {/* 1. Accueil */}
          <button
            id="mobile-nav-home"
            onClick={() => onTabChange('feed')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-semibold transition-all touch-target cursor-pointer ${
              activeTab === 'feed'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'feed' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
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
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-semibold transition-all touch-target cursor-pointer ${
              activeTab === 'search' || activeTab === 'trending'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'search' || activeTab === 'trending' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Compass className="w-5 h-5" />
            </div>
            <span className="leading-tight mt-0.5">Explorer</span>
          </button>

          {/* 3. Abonnements */}
          <button
            id="mobile-nav-following"
            onClick={() => onTabChange('following')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-semibold transition-all touch-target cursor-pointer ${
              activeTab === 'following'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'following' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="leading-tight mt-0.5">Abonnés</span>
          </button>

          {/* 4. Favoris */}
          <button
            id="mobile-nav-bookmarks"
            onClick={isAuthenticated ? onOpenBookmarks : onOpenAuth}
            className={`relative flex flex-col items-center justify-center h-full py-1 text-[11px] font-semibold transition-all touch-target cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <div className="relative p-1 rounded-xl">
              <Bookmark className="w-5 h-5" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-0.5 -right-1 px-1 min-w-4 h-4 bg-emerald-700 text-[10px] font-bold text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-stone-900">
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
            className={`flex flex-col items-center justify-center h-full py-1 text-[11px] font-semibold transition-all touch-target cursor-pointer ${
              activeTab === 'profile'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <div className={`p-0.5 rounded-full ${activeTab === 'profile' ? 'ring-2 ring-emerald-700 dark:ring-emerald-400' : ''}`}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
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

