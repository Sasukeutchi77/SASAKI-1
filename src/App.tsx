import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ShieldAlert, Building2, ArrowRight, X } from 'lucide-react';
import { realtime } from './services/realtime';
import { sfx } from './services/soundEffects';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { Home } from './pages/Home';
import { SearchPage } from './pages/SearchPage';
import { CategoryPage } from './pages/CategoryPage';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { CreateArticleModal } from './components/CreateArticleModal';
import { MediaProfileModal } from './components/MediaProfileModal';
import { AdminDashboardModal, AdminTab } from './components/AdminDashboardModal';
import { JournalistDashboardModal } from './components/JournalistDashboardModal';
import { BookmarksModal } from './components/BookmarksModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MediaHousesModal } from './components/MediaHousesModal';
import { TrustSystemModal } from './components/TrustSystemModal';
import { RankingsModal } from './components/RankingsModal';
import { BookmarksPage } from './pages/BookmarksPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { MediaHousesPage } from './pages/MediaHousesPage';
import { RankingsPage } from './pages/RankingsPage';
import { Article, Category } from './types';
import { api } from './services/api';
import { OfflineIndicator } from './components/OfflineIndicator';

export function AppContent() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<
    'home' | 'search' | 'category' | 'houses' | 'bookmarks' | 'account' | 'rankings'
  >('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<string>('feed');
  const [categories, setCategories] = useState<Category[]>([]);

  // Modals state
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [showCreateArticle, setShowCreateArticle] = useState<boolean>(false);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab>('overview');
  const [showJournalistModal, setShowJournalistModal] = useState<boolean>(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);
  const [showMediaHousesModal, setShowMediaHousesModal] = useState<boolean>(false);
  const [mediaHousesTab, setMediaHousesTab] = useState<'explore' | 'my-house'>('explore');
  const [showTrustSystemModal, setShowTrustSystemModal] = useState<boolean>(false);
  const [showRankingsModal, setShowRankingsModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const handleOpenMyHouse = () => {
    setMediaHousesTab('my-house');
    setCurrentView('houses');
    setMobileTab('my-house');
    window.location.hash = 'my-house';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMediaHouses = () => {
    setMediaHousesTab('explore');
    setCurrentView('houses');
    setMobileTab('houses');
    window.location.hash = 'houses';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenBookmarks = () => {
    setCurrentView('bookmarks');
    setMobileTab('bookmarks');
    window.location.hash = 'bookmarks';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMyProfile = () => {
    setCurrentView('account');
    setMobileTab('profile');
    window.location.hash = 'account';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRankings = () => {
    setCurrentView('rankings');
    setMobileTab('rankings');
    window.location.hash = 'rankings';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real-time Global Breaking Notification
  const [globalLiveToast, setGlobalLiveToast] = useState<{
    article: Article;
    time: string;
  } | null>(null);

  // Key to force refresh feed when an article is created or updated
  const [feedRefreshKey, setFeedRefreshKey] = useState<number>(0);

  // Global Real-time listener for new articles published anywhere on the platform
  useEffect(() => {
    let hideTimer: any = null;
    const unsub = realtime.on('article:created', (newArt: Article) => {
      if (!newArt || !newArt.id) return;
      sfx.playNotificationDing();
      setGlobalLiveToast({
        article: newArt,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      });
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setGlobalLiveToast(null);
      }, 12000);
    });
    return () => {
      unsub();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  // Fetch categories once
  const loadCategories = () => {
    api.getCategories().then((res) => {
      setCategories(res.categories);
    });
  };

  const navigateToHome = () => {
    setCurrentView('home');
    setMobileTab('feed');
    if (window.location.hash && !window.location.hash.startsWith('#article-')) {
      history.replaceState(null, '', ' ');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSearch = (initialParams?: { query?: string; category?: string; tag?: string }) => {
    if (initialParams?.query !== undefined) setSearchQuery(initialParams.query);
    if (initialParams?.category !== undefined) setSelectedCategory(initialParams.category);
    if (initialParams?.tag !== undefined) setSelectedTag(initialParams.tag);
    setCurrentView('search');
    setMobileTab('search');
    window.location.hash = 'search';
  };

  const navigateToCategory = (slug: string) => {
    setSelectedCategory(slug);
    setCurrentView('category');
    window.location.hash = `category-${slug}`;
  };

  useEffect(() => {
    loadCategories();

    // Check URL hash for direct deep links
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#article-')) {
        const id = hash.replace('#article-', '');
        if (id) {
          setActiveArticleId(id);
        }
      } else if (hash.startsWith('#category-')) {
        const slug = hash.replace('#category-', '');
        if (slug) {
          setSelectedCategory(slug);
          setCurrentView('category');
        }
      } else if (hash.startsWith('#tag-')) {
        const tag = hash.replace('#tag-', '');
        if (tag) {
          setSelectedTag(tag);
          setCurrentView('search');
          setMobileTab('search');
        }
      } else if (hash.startsWith('#search')) {
        setCurrentView('search');
        setMobileTab('search');
      } else if (hash === '#houses') {
        setMediaHousesTab('explore');
        setCurrentView('houses');
        setMobileTab('houses');
      } else if (hash === '#my-house') {
        setMediaHousesTab('my-house');
        setCurrentView('houses');
        setMobileTab('my-house');
      } else if (hash === '#bookmarks') {
        setCurrentView('bookmarks');
        setMobileTab('bookmarks');
      } else if (hash === '#account' || hash === '#profile') {
        setCurrentView('account');
        setMobileTab('profile');
      } else if (hash === '#rankings' || hash === '#classement') {
        setCurrentView('rankings');
        setMobileTab('rankings');
      } else if (hash.startsWith('#profile-')) {
        const uid = hash.replace('#profile-', '');
        if (uid) setProfileUserId(uid);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const handleOpenArticle = (art: Article | string) => {
    if (typeof art === 'string') {
      setActiveArticleId(art);
      window.location.hash = `article-${art}`;
    } else {
      setActiveArticle(art);
      setActiveArticleId(art.id);
      window.location.hash = `article-${art.id}`;
    }
  };

  const handleCloseArticle = () => {
    setActiveArticle(null);
    setActiveArticleId(null);
    if (window.location.hash.startsWith('#article-')) {
      history.replaceState(null, '', ' ');
    }
  };

  const handleArticleCreatedOrUpdated = (article: Article) => {
    setFeedRefreshKey((prev) => prev + 1);
    loadCategories();
    handleOpenArticle(article);
  };

  return (
    <div className="w-full max-w-full min-h-screen bg-[#07080f] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-clip">
      {/* Top Header with brand, search bar, demo switcher, notifications */}
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(slug) => {
          if (slug) {
            navigateToCategory(slug);
          } else {
            setSelectedCategory(null);
            navigateToHome();
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
        }}
        onGoHome={navigateToHome}
        onOpenSearchPage={() => navigateToSearch()}
        onOpenAuth={handleOpenAuth}
        onOpenCreateArticle={() => {
          setArticleToEdit(null);
          setShowCreateArticle(true);
        }}
        onOpenAdmin={() => setShowAdminModal(true)}
        onOpenJournalistDashboard={() => setShowJournalistModal(true)}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenBookmarks={handleOpenBookmarks}
        onOpenProfile={(userId) => setProfileUserId(userId)}
        onOpenMyProfile={handleOpenMyProfile}
        onOpenMediaHouses={handleOpenMediaHouses}
        onOpenMyHouse={handleOpenMyHouse}
        onOpenTrustSystem={() => setShowTrustSystemModal(true)}
        onOpenRankings={handleOpenRankings}
        showCategories={currentView === 'home' || currentView === 'category'}
      />

      {/* Security Alert Banner for Suspended Accounts */}
      {user?.status === 'suspended' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-4 py-3 text-xs sm:text-sm font-medium transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Compte suspendu :</strong> Vos privilèges d'interaction, publication et signalement ont été révoqués par la modération.
              </span>
            </div>
            <span className="text-xs text-amber-700 hidden sm:inline bg-amber-100 px-2 py-0.5 rounded font-mono">
              Accès restreint
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-full" key={feedRefreshKey}>
        {currentView === 'search' ? (
          <SearchPage
            initialQuery={searchQuery}
            initialCategory={selectedCategory}
            initialTag={selectedTag}
            categories={categories}
            onOpenArticle={handleOpenArticle}
            onOpenProfile={(userId) => setProfileUserId(userId)}
            onOpenAuth={() => handleOpenAuth('login')}
            onSelectCategory={(slug) => {
              if (slug) navigateToCategory(slug);
              else setSelectedCategory(null);
            }}
            onSelectTag={(tag) => setSelectedTag(tag.replace(/^#/, ''))}
            onClose={navigateToHome}
          />
        ) : currentView === 'category' ? (
          <CategoryPage
            categorySlug={selectedCategory || 'purgeur'}
            categories={categories}
            onBack={navigateToHome}
            onOpenArticle={handleOpenArticle}
            onOpenProfile={(userId) => setProfileUserId(userId)}
            onOpenAuth={() => handleOpenAuth('login')}
            onSelectTag={(tag) => {
              const clean = tag.replace(/^#/, '');
              setSelectedTag(clean);
              navigateToSearch({ tag: clean });
            }}
            onSelectOtherCategory={navigateToCategory}
          />
        ) : currentView === 'houses' ? (
          <MediaHousesPage
            onBack={navigateToHome}
            onOpenArticle={handleOpenArticle}
            onOpenProfile={(userId) => setProfileUserId(userId)}
            onOpenCreateArticle={() => {
              setArticleToEdit(null);
              setShowCreateArticle(true);
            }}
            initialTab={mediaHousesTab}
          />
        ) : currentView === 'rankings' ? (
          <RankingsPage
            onBack={navigateToHome}
            onOpenArticle={handleOpenArticle}
            onOpenProfile={(userId) => setProfileUserId(userId)}
            onOpenMediaHouses={handleOpenMediaHouses}
            onOpenAuth={() => handleOpenAuth('login')}
          />
        ) : currentView === 'bookmarks' ? (
          <BookmarksPage
            onBack={navigateToHome}
            onOpenArticle={handleOpenArticle}
            onOpenProfile={(userId) => setProfileUserId(userId)}
            onExploreMore={navigateToHome}
          />
        ) : currentView === 'account' ? (
          <UserProfilePage
            onBack={navigateToHome}
            onOpenAuth={() => handleOpenAuth('login')}
            onOpenMyHouse={handleOpenMyHouse}
            onOpenBookmarks={handleOpenBookmarks}
            onOpenTrustSystem={() => setShowTrustSystemModal(true)}
          />
        ) : (
          <Home
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            refreshTrigger={feedRefreshKey}
            onSelectCategory={(cat) => {
              setSelectedTag(null);
              setSelectedCategory(cat);
            }}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            onOpenArticle={handleOpenArticle}
            onOpenProfile={(userId) => setProfileUserId(userId)}
            onOpenAuth={() => handleOpenAuth('login')}
            onOpenCreateArticle={() => {
              setArticleToEdit(null);
              setShowCreateArticle(true);
            }}
            onOpenSearch={() => navigateToSearch()}
            onOpenCategoryPage={navigateToCategory}
            onOpenMediaHouses={handleOpenMediaHouses}
            onOpenMyHouse={handleOpenMyHouse}
            onOpenTrustSystem={() => setShowTrustSystemModal(true)}
            onOpenRankings={handleOpenRankings}
          />
        )}
      </div>

      {/* Mobile Navigation Bar (Optimized for Android / Mobile screens) */}
      <MobileNav
        activeTab={
          showRankingsModal || currentView === 'rankings'
            ? 'rankings'
            : currentView === 'search'
            ? 'search'
            : currentView === 'houses'
            ? mediaHousesTab === 'my-house'
              ? 'my-house'
              : 'houses'
            : currentView === 'bookmarks'
            ? 'bookmarks'
            : currentView === 'account'
            ? 'profile'
            : mobileTab
        }
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === 'rankings') {
            handleOpenRankings();
          } else if (tab === 'trending' || tab === 'search') {
            navigateToSearch();
          } else if (tab === 'feed') {
            navigateToHome();
            setSelectedCategory(null);
            setSelectedTag(null);
            setSearchQuery('');
          } else if (tab === 'following') {
            navigateToHome();
          } else if (tab === 'my-house') {
            handleOpenMyHouse();
          } else if (tab === 'bookmarks') {
            handleOpenBookmarks();
          } else if (tab === 'profile') {
            handleOpenMyProfile();
          }
        }}
        onOpenRankings={handleOpenRankings}
        onOpenSearch={() => navigateToSearch()}
        onOpenCreateArticle={() => {
          setArticleToEdit(null);
          setShowCreateArticle(true);
        }}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenBookmarks={handleOpenBookmarks}
        onOpenProfile={(userId) => {
          if (userId) setProfileUserId(userId);
        }}
        onOpenMyProfile={handleOpenMyProfile}
        onOpenMediaHouses={handleOpenMediaHouses}
        onOpenMyHouse={handleOpenMyHouse}
        onOpenAuth={() => handleOpenAuth('login')}
        onOpenAdmin={() => setShowAdminModal(true)}
      />

      {/* MODALS */}

      {/* 1. Full Article Reading View Modal */}
      {activeArticleId && (
        <ArticleDetailModal
          articleId={activeArticleId}
          onClose={handleCloseArticle}
          onOpenProfile={(uid) => {
            handleCloseArticle();
            setProfileUserId(uid);
          }}
          onOpenAuth={() => handleOpenAuth('login')}
          onOpenArticle={handleOpenArticle}
          onSelectTag={(tag) => {
            handleCloseArticle();
            setSelectedTag(tag.replace(/^#/, ''));
          }}
          onArticleDeleted={() => {
            setFeedRefreshKey((prev) => prev + 1);
            loadCategories();
          }}
          onOpenEditArticle={(art) => {
            setArticleToEdit(art);
            setShowCreateArticle(true);
          }}
          onOpenTrustSystem={() => setShowTrustSystemModal(true)}
        />
      )}

      {/* 2. Create or Edit Article Modal */}
      {showCreateArticle && (
        <CreateArticleModal
          categories={categories}
          articleToEdit={articleToEdit}
          onClose={() => {
            setShowCreateArticle(false);
            setArticleToEdit(null);
          }}
          onArticleCreated={handleArticleCreatedOrUpdated}
        />
      )}

      {/* 3. Media & Journalist Profile Modal */}
      {profileUserId && (
        <MediaProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
          onOpenArticle={handleOpenArticle}
          onOpenAuth={() => handleOpenAuth('login')}
        />
      )}

      {/* 4. Administration Dashboard Modal */}
      {showAdminModal && (
        <AdminDashboardModal
          onClose={() => setShowAdminModal(false)}
          initialTab={adminInitialTab}
          onRefreshData={() => {
            setFeedRefreshKey((prev) => prev + 1);
            loadCategories();
          }}
          onPreviewArticle={(art) => {
            setShowAdminModal(false);
            handleOpenArticle(art);
          }}
        />
      )}

      {/* 5. Journalist Management Dashboard Modal */}
      {showJournalistModal && (
        <JournalistDashboardModal
          onClose={() => setShowJournalistModal(false)}
          onOpenCreateArticle={() => {
            setArticleToEdit(null);
            setShowCreateArticle(true);
          }}
          onOpenEditArticle={(art) => {
            setArticleToEdit(art);
            setShowCreateArticle(true);
          }}
          onOpenArticle={handleOpenArticle}
          onOpenMediaHouses={() => {
            setShowJournalistModal(false);
            handleOpenMediaHouses();
          }}
        />
      )}

      {/* 6. User Bookmarks Reading List Modal */}
      {showBookmarksModal && (
        <BookmarksModal
          onClose={() => setShowBookmarksModal(false)}
          onOpenArticle={handleOpenArticle}
        />
      )}

      {/* 7. Notifications Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          onClose={() => setShowNotificationsModal(false)}
          onOpenArticleId={(artId) => {
            setShowNotificationsModal(false);
            handleOpenArticle(artId);
          }}
          onOpenAdminJournalists={() => {
            setShowNotificationsModal(false);
            setAdminInitialTab('journalists');
            setShowAdminModal(true);
          }}
          onOpenProfile={() => {
            setShowNotificationsModal(false);
            setShowUserProfileModal(true);
          }}
        />
      )}

      {/* 8. Authentication Modal (Login / Register) */}
      {showAuthModal && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* 9. User Profile & Cloudinary Settings Modal */}
      {showUserProfileModal && (
        <UserProfileModal
          onClose={() => setShowUserProfileModal(false)}
          onOpenAuth={() => handleOpenAuth('login')}
        />
      )}

      {/* 10. Media Houses Modal (Maisons de Presse - max 5 journalistes) */}
      {showMediaHousesModal && (
        <MediaHousesModal
          initialTab={mediaHousesTab}
          onClose={() => setShowMediaHousesModal(false)}
          onOpenProfile={() => {
            setShowMediaHousesModal(false);
            handleOpenMyProfile();
          }}
          onOpenArticle={(art) => {
            setShowMediaHousesModal(false);
            handleOpenArticle(art);
          }}
          onOpenCreateArticle={() => {
            setShowMediaHousesModal(false);
            setShowCreateArticle(true);
          }}
        />
      )}

      {/* 11. Trust System, Verification Levels & Deontological Charter Modal */}
      {showTrustSystemModal && (
        <TrustSystemModal
          isOpen={showTrustSystemModal}
          onClose={() => setShowTrustSystemModal(false)}
          onOpenMediaHouses={handleOpenMediaHouses}
          onOpenAuth={() => handleOpenAuth('login')}
        />
      )}

      {/* 12. Top 7 Official Rankings Modal */}
      {showRankingsModal && (
        <RankingsModal
          isOpen={showRankingsModal}
          onClose={() => {
            setShowRankingsModal(false);
            if (mobileTab === 'rankings') {
              setMobileTab(currentView === 'home' ? 'feed' : currentView);
            }
          }}
          onOpenArticle={handleOpenArticle}
          onOpenProfile={(userId) => setProfileUserId(userId)}
          onOpenMediaHouses={handleOpenMediaHouses}
          onOpenAuth={() => handleOpenAuth('login')}
        />
      )}

      {/* Global Live Breaking Publication Toast */}
      {globalLiveToast && (
        <div
          id="global-live-broadcast-toast"
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] sm:w-auto bg-gradient-to-r from-red-950/95 via-[#12071a]/95 to-cyan-950/95 border border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.4)] rounded-2xl p-4 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 transition-all text-slate-100"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="relative flex h-3 w-3 mt-1 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs mb-1">
                  <span className="px-2 py-0.5 rounded bg-red-500/25 text-red-300 font-extrabold font-mono tracking-wider border border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                    EN DIRECT • {globalLiveToast.time}
                  </span>
                  {globalLiveToast.article.mediaName && (
                    <span className="flex items-center gap-1 font-bold text-cyan-300 text-xs bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
                      <Building2 className="w-3 h-3 text-cyan-400" />
                      {globalLiveToast.article.mediaName}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                  {globalLiveToast.article.title}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Par {globalLiveToast.article.authorName}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    id="global-toast-read-btn"
                    onClick={() => {
                      handleOpenArticle(globalLiveToast.article);
                      setGlobalLiveToast(null);
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-cyan-600 hover:from-red-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Consulter l'article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id="global-toast-dismiss-btn"
                    onClick={() => setGlobalLiveToast(null)}
                    className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Ignorer
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setGlobalLiveToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PWA Offline Network Toast */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
