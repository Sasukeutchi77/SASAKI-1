import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ShieldAlert } from 'lucide-react';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { Home } from './pages/Home';
import { SearchPage } from './pages/SearchPage';
import { CategoryPage } from './pages/CategoryPage';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { CreateArticleModal } from './components/CreateArticleModal';
import { MediaProfileModal } from './components/MediaProfileModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { JournalistDashboardModal } from './components/JournalistDashboardModal';
import { BookmarksModal } from './components/BookmarksModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Article, Category } from './types';
import { api } from './services/api';

export function AppContent() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'category'>('home');
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
  const [showJournalistModal, setShowJournalistModal] = useState<boolean>(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Key to force refresh feed when an article is created or updated
  const [feedRefreshKey, setFeedRefreshKey] = useState<number>(0);

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
    <div className="min-h-screen bg-[#07080f] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header with brand, search bar, demo switcher, notifications */}
      <Header
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
        onOpenBookmarks={() => setShowBookmarksModal(true)}
        onOpenProfile={(userId) => setProfileUserId(userId)}
        onOpenMyProfile={() => setShowUserProfileModal(true)}
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
      <div className="flex-1" key={feedRefreshKey}>
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
            categorySlug={selectedCategory || 'politique'}
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
        ) : (
          <Home
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
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
          />
        )}
      </div>

      {/* Mobile Navigation Bar (Optimized for Android / Mobile screens) */}
      <MobileNav
        activeTab={currentView === 'search' ? 'search' : mobileTab}
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === 'trending' || tab === 'search') {
            navigateToSearch();
          } else if (tab === 'feed') {
            navigateToHome();
            setSelectedCategory(null);
            setSelectedTag(null);
            setSearchQuery('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenSearch={() => navigateToSearch()}
        onOpenCreateArticle={() => {
          setArticleToEdit(null);
          setShowCreateArticle(true);
        }}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenBookmarks={() => setShowBookmarksModal(true)}
        onOpenProfile={(userId) => {
          if (userId) setProfileUserId(userId);
        }}
        onOpenMyProfile={() => setShowUserProfileModal(true)}
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
