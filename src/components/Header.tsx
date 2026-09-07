import React, { useState } from 'react';
import {
  Search,
  Bell,
  Bookmark,
  PenSquare,
  Shield,
  User as UserIcon,
  LogOut,
  Sparkles,
  CheckCircle2,
  Menu,
  X,
  Layers,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onSearchChange: (search: string) => void;
  searchQuery: string;
  onGoHome?: () => void;
  onOpenSearchPage?: () => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenCreateArticle: () => void;
  onOpenAdmin: () => void;
  onOpenJournalistDashboard: () => void;
  onOpenNotifications: () => void;
  onOpenBookmarks: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenMyProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchChange,
  searchQuery,
  onGoHome,
  onOpenSearchPage,
  onOpenAuth,
  onOpenCreateArticle,
  onOpenAdmin,
  onOpenJournalistDashboard,
  onOpenNotifications,
  onOpenBookmarks,
  onOpenProfile,
  onOpenMyProfile,
}) => {
  const { user, isAuthenticated, logout, unreadNotifs, bookmarksCount, quickSwitch } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#07080f]/90 backdrop-blur-xl border-b border-cyan-500/25 shadow-[0_4px_25px_rgba(0,243,255,0.08)] transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              id="brand-logo-btn"
              onClick={() => {
                onSearchChange('');
                if (onGoHome) onGoHome();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-emerald-400 flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(0,243,255,0.5)] tracking-tight group-hover:scale-105 group-hover:shadow-[0_0_22px_rgba(0,243,255,0.8)] transition-all">
                P
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg sm:text-xl tracking-tight text-white">
                    purge<span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,243,255,0.7)]">-info</span>
                  </span>
                  <span className="hidden xs:inline text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(0,243,255,0.3)]">
                    Neon
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-cyan-400/60 font-semibold font-mono">
                  <span>DEV:</span>
                  <span className="text-fuchsia-400 font-extrabold tracking-tight drop-shadow-[0_0_6px_rgba(240,38,211,0.5)]">
                    SASAKI COMPAGNIE
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Search bar (Desktop) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4 gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
              <input
                id="search-input-desktop"
                type="text"
                placeholder="Rechercher articles, journalistes, tags..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onOpenSearchPage) {
                    onOpenSearchPage();
                  }
                }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#0b0e1a] border border-cyan-500/30 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.25)] rounded-full focus:outline-none transition-all text-cyan-50 placeholder:text-cyan-500/40"
              />
              {searchQuery && (
                <button
                  id="clear-search-btn"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/60 hover:text-cyan-300 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onOpenSearchPage && (
              <button
                id="header-open-discovery-btn"
                onClick={onOpenSearchPage}
                className="px-3.5 py-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-400/50 rounded-full shrink-0 transition-all cursor-pointer shadow-[0_0_8px_rgba(0,243,255,0.1)]"
                title="Ouvrir la recherche avancée & découverte"
              >
                Explorer
              </button>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Toggle Button */}
            <button
              id="mobile-search-toggle"
              onClick={() => {
                if (onOpenSearchPage) {
                  onOpenSearchPage();
                } else {
                  setMobileSearchOpen(!mobileSearchOpen);
                }
              }}
              className="md:hidden p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full cursor-pointer touch-target flex items-center justify-center"
              aria-label="Rechercher"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Dark / Light Theme Toggle */}
            <button
              id="theme-toggle-header-btn"
              onClick={toggleTheme}
              className="p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer touch-target flex items-center justify-center"
              title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
              aria-label="Changer le thème"
            >
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />}
            </button>

            {/* Quick Demo Role Switcher (Visible in development environment only) */}
            {import.meta.env.DEV && (
              <div className="relative">
                <button
                  id="quick-demo-role-btn"
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700 transition-colors cursor-pointer"
                  title="Basculer rapidement entre les rôles de test (Mode Dev)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">Rôle Test</span>
                </button>

                {showDemoMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1.5 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800">
                      Tester avec un rôle :
                    </div>
                    <div className="mt-1 space-y-1">
                      <button
                        id="demo-switch-admin"
                        onClick={() => {
                          quickSwitch('admin');
                          setShowDemoMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-2 text-xs rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-stone-800 dark:text-stone-200 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5" /> Administrateur
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">Modération, vérifications, gestion</div>
                        </div>
                      </button>
                      <button
                        id="demo-switch-media"
                        onClick={() => {
                          quickSwitch('burkinanews');
                          setShowDemoMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-2 text-xs rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 text-stone-800 dark:text-stone-200 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Burkina News (Média)
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">125k abonnés, publication, stats</div>
                        </div>
                      </button>
                      <button
                        id="demo-switch-journalist"
                        onClick={() => {
                          quickSwitch('salif');
                          setShowDemoMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-2 text-xs rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/50 text-stone-800 dark:text-stone-200 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Salif O. (Journaliste)
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">Enquêtes, économie, articles</div>
                        </div>
                      </button>
                      <button
                        id="demo-switch-reader"
                        onClick={() => {
                          quickSwitch('aminata');
                          setShowDemoMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-2 text-xs rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5" /> Aminata T. (Lectrice)
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">Abonnements, likes, commentaires</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notifications Button */}
            {isAuthenticated && (
              <button
                id="notifications-header-btn"
                onClick={onOpenNotifications}
                className="relative p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white dark:ring-stone-900 animate-pulse" />
                )}
              </button>
            )}

            {/* Bookmarks Button (Desktop) */}
            {isAuthenticated && (
              <button
                id="bookmarks-header-btn"
                onClick={onOpenBookmarks}
                className="hidden sm:flex relative p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
                aria-label="Articles enregistrés"
              >
                <Bookmark className="w-5 h-5" />
                {bookmarksCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 bg-stone-800 dark:bg-stone-200 text-[10px] font-bold text-white dark:text-stone-900 rounded-full">
                    {bookmarksCount}
                  </span>
                )}
              </button>
            )}

            {/* Journalist Dashboard / Create Article Button */}
            {isAuthenticated && (user?.role === 'journalist' || user?.role === 'admin') && (
              <button
                id="header-create-article-btn"
                onClick={onOpenCreateArticle}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-95 rounded-full shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all cursor-pointer"
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Rédiger</span>
              </button>
            )}

            {/* Admin Control Center Button */}
            {isAuthenticated && user?.role === 'admin' && (
              <button
                id="header-admin-portal-btn"
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-fuchsia-300 bg-fuchsia-950/50 hover:bg-fuchsia-900/60 border border-fuchsia-500/40 rounded-full shadow-[0_0_10px_rgba(240,38,211,0.25)] transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="hidden sm:inline">Administration</span>
              </button>
            )}

            {/* User Account Menu / Login Trigger */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none cursor-pointer"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-stone-700"
                  />
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1 leading-tight">
                      {user.name.split(' ')[0]}
                      {user.isVerified && <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 capitalize">
                      {user.role === 'admin' ? 'Administrateur' : user.role === 'journalist' ? 'Journaliste' : 'Lecteur'}
                    </span>
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        {user.name}
                        {user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 truncate">{user.email}</div>
                      <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {user.role === 'admin' ? 'Super Administrateur' : user.role === 'journalist' ? (user.mediaName || 'Journaliste') : 'Lecteur'}
                      </div>
                    </div>

                    <button
                      id="menu-open-my-profile-btn"
                      onClick={() => {
                        onOpenMyProfile();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 font-medium cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Mon profil & Paramètres
                    </button>

                    <button
                      id="menu-open-profile-btn"
                      onClick={() => {
                        onOpenProfile(user.id);
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-stone-400" /> Voir ma page publique
                    </button>

                    {(user.role === 'journalist' || user.role === 'admin') && (
                      <button
                        id="menu-open-journalist-dash"
                        onClick={() => {
                          onOpenJournalistDashboard();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Layers className="w-4 h-4 text-stone-500" /> Tableau de bord Journaliste
                      </button>
                    )}

                    {user.role === 'admin' && (
                      <button
                        id="menu-open-admin-portal"
                        onClick={() => {
                          onOpenAdmin();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Console d'administration
                      </button>
                    )}

                    <div className="border-t border-stone-100 dark:border-stone-800 my-1.5" />

                    <div className="px-4 py-1 text-[10px] text-stone-400 dark:text-stone-500 font-semibold">
                      Développeur : <span className="text-amber-500 font-bold">SASAKI COMPAGNIE</span>
                    </div>

                    <button
                      id="menu-logout-btn"
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center gap-2.5 font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="header-login-btn"
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(0,243,255,0.3)] rounded-lg transition-all cursor-pointer"
                >
                  Connexion
                </button>
                <button
                  id="header-register-btn"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 text-xs font-bold text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all cursor-pointer"
                >
                  S'inscrire
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-3 pt-1 border-t border-stone-100 dark:border-stone-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                id="search-input-mobile"
                type="text"
                placeholder="Rechercher des articles, journalistes, médias..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-9 py-2.5 text-sm bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
