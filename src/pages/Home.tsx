import React, { useState, useEffect } from 'react';
import { Article, Category, User } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleCardSkeleton } from '../components/ui/Skeleton';
import {
  Flame,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  TrendingUp,
  UserPlus,
  UserCheck,
  PlusCircle,
  Search,
  Filter,
  Tag,
  X,
  ChevronDown,
  Loader2,
  Radio,
} from 'lucide-react';
import { BreakingNewsTicker } from '../components/BreakingNewsTicker';
import { LiveFeedTimeline } from '../components/LiveFeedTimeline';

interface HomeProps {
  onOpenArticle: (article: Article) => void;
  onOpenProfile: (userId: string) => void;
  onOpenAuth: () => void;
  onOpenCreateArticle: () => void;
  onOpenSearch?: () => void;
  onOpenCategoryPage?: (catSlug: string) => void;
  searchQuery: string;
  selectedCategory: string | null;
  onSelectCategory: (catSlug: string | null) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export const Home: React.FC<HomeProps> = ({
  onOpenArticle,
  onOpenProfile,
  onOpenAuth,
  onOpenCreateArticle,
  onOpenSearch,
  onOpenCategoryPage,
  searchQuery,
  selectedCategory,
  onSelectCategory,
  selectedTag: externalTag,
  onSelectTag: externalSetTag,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [feedTab, setFeedTab] = useState<'foryou' | 'trending' | 'latest' | 'following' | 'live'>('foryou');
  const [internalTag, setInternalTag] = useState<string | null>(null);

  const selectedTag = externalTag !== undefined ? externalTag : internalTag;
  const setSelectedTag = (tag: string | null) => {
    if (externalSetTag) externalSetTag(tag);
    else setInternalTag(tag);
  };

  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [topJournalists, setTopJournalists] = useState<User[]>([]);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Load initial global data
  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.categories);
    });
    api.getJournalists().then((res) => {
      setTopJournalists(res.journalists);
    });
    api.getTags().then((res) => {
      setPopularTags(res.tags);
    });
  }, []);

  // Fetch first page of articles when filter criteria change
  const fetchInitialArticles = async () => {
    setLoading(true);
    setPage(1);
    try {
      const params: Parameters<typeof api.getArticles>[0] = {
        feed: feedTab,
        page: 1,
        limit: 10,
      };

      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (selectedTag) {
        params.tag = selectedTag;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const res = await api.getArticles(params);
      setArticles(res.articles);
      setHasMore(res.hasMore);

      // Select featured article on main feed if not searching / filtering
      if (!selectedCategory && !selectedTag && !searchQuery && feedTab === 'foryou' && res.articles.length > 0) {
        setFeaturedArticle(res.articles[0]);
      } else {
        setFeaturedArticle(null);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialArticles();
  }, [feedTab, selectedCategory, selectedTag, searchQuery, isAuthenticated]);

  // Load next page
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params: Parameters<typeof api.getArticles>[0] = {
        feed: feedTab,
        page: nextPage,
        limit: 10,
      };

      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (selectedTag) {
        params.tag = selectedTag;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const res = await api.getArticles(params);
      setArticles((prev) => [...prev, ...res.articles]);
      setPage(nextPage);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to load more articles:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleFollow = async (journalistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return onOpenAuth();
    try {
      const res = await api.toggleFollow(journalistId);
      setTopJournalists((prev) =>
        prev.map((j) =>
          j.id === journalistId
            ? { ...j, isFollowing: res.isFollowing, followersCount: res.followersCount }
            : j
        )
      );
      // If currently on following tab, reload to reflect followed creator's articles
      if (feedTab === 'following') {
        fetchInitialArticles();
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    }
  };

  const handleSelectTagFilter = (tag: string) => {
    const clean = tag.replace(/^#/, '').trim();
    setSelectedTag(clean);
  };

  // Regular articles excluding featured article (if shown)
  const regularArticles = featuredArticle
    ? articles.filter((a) => a.id !== featuredArticle.id)
    : articles;

  return (
    <div className="min-h-screen bg-[#07080f] text-slate-100 pb-20 md:pb-12 cyber-grid">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Category active banner */}
        {selectedCategory && selectedCategory !== 'all' && (
          <div className="mb-4 p-3.5 bg-[#0b0e1a]/90 rounded-xl border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_15px_rgba(0,243,255,0.15)]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,243,255,0.8)] animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-cyan-200">
                Rubrique : {categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory)?.name || selectedCategory}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onOpenCategoryPage && (
                <button
                  onClick={() => onOpenCategoryPage(selectedCategory)}
                  className="px-3 py-1 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-500/40 shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all cursor-pointer"
                >
                  Page complète de la rubrique →
                </button>
              )}
              <button
                onClick={() => onSelectCategory(null)}
                className="text-cyan-400/60 hover:text-cyan-200 p-1 cursor-pointer"
                title="Toutes les rubriques"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Active Filters Bar (Search or Tag) */}
        {(searchQuery || selectedTag) && (
          <div className="mb-4 p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400 shadow-2xs transition-colors">
            <div className="flex items-center gap-2 flex-wrap">
              {searchQuery && (
                <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg text-stone-800 dark:text-stone-200">
                  <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Recherche : <strong>« {searchQuery} »</strong></span>
                </div>
              )}
              {selectedTag && (
                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg font-semibold">
                  <Tag className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>#{selectedTag}</span>
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="ml-1 text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-100 cursor-pointer"
                    title="Retirer ce filtre"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <span className="font-bold text-stone-900 dark:text-stone-100">{articles.length} article(s) trouvé(s)</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Feed Column (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Cyber Breaking News Ticker */}
            <BreakingNewsTicker articles={articles} onOpenArticle={onOpenArticle} />

            {/* Feed Tabs Bar */}
            <div className="bg-[#0b0e1a]/90 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-1.5 flex items-center justify-between shadow-[0_0_20px_rgba(0,243,255,0.06)] transition-all">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto">
                <button
                  id="tab-feed-foryou"
                  onClick={() => setFeedTab('foryou')}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    feedTab === 'foryou'
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_15px_rgba(0,243,255,0.5)]'
                      : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/10'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pour vous</span>
                </button>

                <button
                  id="tab-feed-trending"
                  onClick={() => setFeedTab('trending')}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    feedTab === 'trending'
                      ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-[0_0_15px_rgba(240,38,211,0.5)]'
                      : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/10'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Tendances</span>
                </button>

                <button
                  id="tab-feed-latest"
                  onClick={() => setFeedTab('latest')}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    feedTab === 'latest'
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,157,0.5)]'
                      : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/10'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Dernières minutes</span>
                </button>

                <button
                  id="tab-feed-live"
                  onClick={() => setFeedTab('live')}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    feedTab === 'live'
                      ? 'bg-gradient-to-r from-red-500 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                      : 'text-red-400/80 hover:text-red-300 hover:bg-red-500/10'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
                  <span>En direct 🔴</span>
                </button>

                <button
                  id="tab-feed-following"
                  onClick={() => {
                    if (!isAuthenticated) {
                      onOpenAuth();
                    } else {
                      setFeedTab('following');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    feedTab === 'following'
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_15px_rgba(0,243,255,0.5)]'
                      : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/10'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Abonnements</span>
                </button>
              </div>
            </div>

            {/* Featured Article Hero Banner (Only on main "Pour vous" feed with no search or tag) */}
            {featuredArticle && !selectedCategory && !selectedTag && !searchQuery && feedTab === 'foryou' && (
              <div
                id="featured-article-hero"
                onClick={() => onOpenArticle(featuredArticle)}
                className="group relative rounded-2xl overflow-hidden bg-[#0a0c16] text-white border border-cyan-500/40 shadow-[0_0_25px_rgba(0,243,255,0.15)] hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(0,243,255,0.3)] transition-all cursor-pointer aspect-[16/10] sm:aspect-[21/9]"
              >
                <img
                  src={featuredArticle.coverImage}
                  alt={featuredArticle.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080f] via-[#07080f]/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                      À la Une • {featuredArticle.categoryName}
                    </span>
                    <span className="text-xs text-cyan-300/80 font-mono">
                      {new Date(featuredArticle.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-black leading-tight text-white glitch-hover line-clamp-2 drop-shadow-md cursor-pointer">
                    {featuredArticle.title}
                  </h2>
                  {featuredArticle.summary && (
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-2xl leading-relaxed">
                      {featuredArticle.summary}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs text-cyan-300/80 font-mono">
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="font-bold text-white">
                        {featuredArticle.mediaName || featuredArticle.authorName}
                      </span>
                      {featuredArticle.isAuthorVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <span>•</span>
                    <span>{featuredArticle.viewsCount} vues</span>
                    <span>•</span>
                    <span>{featuredArticle.likesCount} likes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Articles List / Grid or Live Timeline */}
            {feedTab === 'live' ? (
              <LiveFeedTimeline
                onOpenArticleById={(id) => {
                  const art = articles.find((a) => a.id === id);
                  if (art) onOpenArticle(art);
                }}
              />
            ) : loading ? (
              <ArticleCardSkeleton count={4} />
            ) : articles.length === 0 ? (
              <div className="p-10 text-center text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 transition-colors">
                <Filter className="w-10 h-10 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm">Aucun article trouvé</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {feedTab === 'following'
                    ? "Vous n'êtes abonné à aucun journaliste ou média pour le moment. Abonnez-vous à vos sources d'information préférées ci-dessous pour composer votre fil personnalisé !"
                    : 'Aucune publication ne correspond à vos critères de recherche.'}
                </p>

                {feedTab === 'following' && topJournalists.length > 0 && (
                  <div className="mt-6 max-w-md mx-auto text-left border-t border-stone-100 dark:border-stone-800 pt-4">
                    <p className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-3 text-center">
                      Suggestions de médias et journalistes à suivre :
                    </p>
                    <div className="space-y-2">
                      {topJournalists.slice(0, 3).map((j) => (
                        <div
                          key={j.id}
                          className="flex items-center justify-between p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-700"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={j.avatar}
                              alt={j.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                                {j.mediaName || j.name}
                              </p>
                              <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                                {j.followersCount || 0} abonnés
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleToggleFollow(j.id, e)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                          >
                            Suivre
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedCategory || selectedTag || searchQuery) && (
                  <button
                    onClick={() => {
                      onSelectCategory(null);
                      setSelectedTag(null);
                    }}
                    className="mt-4 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {regularArticles.map((art) => (
                    <ArticleCard
                      key={art.id}
                      article={art}
                      onOpenArticle={onOpenArticle}
                      onOpenProfile={onOpenProfile}
                      onOpenAuth={onOpenAuth}
                      onSelectTag={handleSelectTagFilter}
                      onSelectCategory={onSelectCategory}
                      titleClassName="glitch-hover"
                    />
                  ))}
                </div>

                {/* Pagination: Load More Button */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      id="load-more-articles-btn"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-200/80 dark:border-stone-700 text-stone-800 dark:text-stone-100 font-bold text-xs sm:text-sm rounded-full shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                          <span>Chargement des articles...</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          <span>Afficher plus d'actualités</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar Column (4 cols on desktop, hidden on small screens) */}
          <aside className="hidden lg:block lg:col-span-4 space-y-5">
            {/* Journalist Write Callout */}
            {isAuthenticated && (user?.role === 'journalist' || user?.role === 'admin') ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0a1226] via-[#09152e] to-[#120a26] text-white border border-cyan-500/40 shadow-[0_0_20px_rgba(0,243,255,0.15)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-cyan-500/20 rounded-lg border border-cyan-500/40">
                    <PlusCircle className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-cyan-100">Espace de Publication</h3>
                    <p className="text-[11px] text-cyan-300/70 font-mono">Journaliste / Média accrédité</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mt-2 mb-3">
                  Partagez une dépêche urgente, une enquête d'investigation ou une analyse citoyenne.
                </p>
                <button
                  id="sidebar-create-article-btn"
                  onClick={onOpenCreateArticle}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Rédiger un nouvel article</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#0b0e1a]/90 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,243,255,0.06)]">
                <h3 className="font-black text-white text-sm flex items-center gap-1.5">
                  <span>Rejoignez l'élite des médias</span>
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                  Vous êtes journaliste professionnel ou directeur d'un organe de presse ? Créez votre profil
                  et demandez votre badge officiel.
                </p>
                <button
                  onClick={onOpenAuth}
                  className="mt-3 w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 font-bold text-xs rounded-xl shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all cursor-pointer"
                >
                  Déclarer un média ou journaliste
                </button>
              </div>
            )}

            {/* Recommended & Verified Media */}
            <div className="bg-[#0b0e1a]/90 rounded-2xl border border-cyan-500/30 p-4 shadow-[0_0_15px_rgba(0,243,255,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Médias & Journalistes de référence</span>
                </h3>
              </div>

              <div className="divide-y divide-cyan-500/10">
                {topJournalists.slice(0, 5).map((j) => (
                  <div key={j.id} className="py-3 flex items-center justify-between gap-3">
                    <button
                      onClick={() => onOpenProfile(j.id)}
                      className="flex items-center gap-2.5 text-left group min-w-0 cursor-pointer"
                    >
                      <img
                        src={j.avatar}
                        alt={j.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-cyan-500/40 group-hover:border-cyan-400 group-hover:shadow-[0_0_10px_rgba(0,243,255,0.5)] shrink-0 transition-all"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white group-hover:text-cyan-300 truncate flex items-center gap-1 transition-colors">
                          <span>{j.mediaName || j.name}</span>
                          {j.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-cyan-400/60 font-mono truncate">
                          {j.followersCount || 0} abonnés
                        </div>
                      </div>
                    </button>

                    {user?.id !== j.id && (
                      <button
                        onClick={(e) => handleToggleFollow(j.id, e)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          j.isFollowing
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-cyan-950/60 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-500/30'
                        }`}
                        title={j.isFollowing ? 'Abonné' : "S'abonner"}
                      >
                        {j.isFollowing ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Tags & Topics Widget */}
            {popularTags.length > 0 && (
              <div className="bg-[#0b0e1a]/90 rounded-2xl border border-cyan-500/30 p-4 shadow-[0_0_15px_rgba(0,243,255,0.06)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-cyan-400" />
                    <span>Sujets & Tags populaires</span>
                  </h3>
                  {onOpenSearch && (
                    <button
                      onClick={onOpenSearch}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-200 cursor-pointer"
                    >
                      Explorer tout
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {popularTags.slice(0, 12).map((t) => (
                    <button
                      key={t.tag}
                      onClick={() => handleSelectTagFilter(t.tag)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#101428] hover:bg-cyan-950/60 text-cyan-200 hover:text-white border border-cyan-500/25 hover:border-cyan-400/60 hover:shadow-[0_0_10px_rgba(0,243,255,0.25)] rounded-lg text-xs font-semibold transition-all group cursor-pointer"
                    >
                      <span className="text-cyan-400">#</span>
                      <span>{t.tag}</span>
                      <span className="text-[10px] text-cyan-400/60 group-hover:text-cyan-300 font-mono">
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick About purge-info */}
            <div className="p-4 rounded-2xl bg-[#0b0e1a]/90 border border-cyan-500/30 text-xs text-slate-400 space-y-2.5 shadow-[0_0_15px_rgba(0,243,255,0.06)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-200 uppercase tracking-wider text-[10px] font-mono">
                  Éthique & Transparence
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,243,255,0.25)]">
                  purge-info
                </span>
              </div>
              <p className="leading-relaxed text-slate-300">
                purge-info est la plateforme moderne d'actualités, de journalisme social et de veille citoyenne.
                Chaque article est vérifié pour assurer une information intègre.
              </p>
              <div className="p-2.5 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/40 flex items-center justify-between shadow-[0_0_10px_rgba(240,38,211,0.2)]">
                <span className="text-[11px] font-bold text-slate-300 font-mono">DÉVELOPPEUR :</span>
                <span className="text-xs font-black text-fuchsia-400 tracking-wider font-mono drop-shadow-[0_0_6px_rgba(240,38,211,0.6)]">
                  SASAKI COMPAGNIE
                </span>
              </div>
              <div className="pt-2 border-t border-cyan-500/15 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-cyan-400/50 font-mono">
                <span>© 2026 purge-info</span>
                <span>•</span>
                <span>Conditions</span>
                <span>•</span>
                <span>Presse</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
