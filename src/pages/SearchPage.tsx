import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Clock,
  Trash2,
  TrendingUp,
  Filter,
  Sparkles,
  Layers,
  Hash,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  Heart,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Article, Category, User } from '../types';
import { api } from '../services/api';
import { searchHistory } from '../services/searchHistory';
import { ArticleCard } from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';

interface SearchPageProps {
  initialQuery?: string;
  initialType?: 'all' | 'articles' | 'journalists' | 'media' | 'categories' | 'tags';
  initialCategory?: string | null;
  initialTag?: string | null;
  categories: Category[];
  onOpenArticle: (art: Article) => void;
  onOpenProfile: (userId: string) => void;
  onOpenAuth: () => void;
  onSelectCategory: (slug: string | null) => void;
  onSelectTag: (tag: string) => void;
  onClose?: () => void;
}

interface MediaItem {
  id: string;
  name: string;
  logo?: string;
  bio?: string;
  isVerified: boolean;
  articlesCount: number;
  journalistsCount: number;
  followersCount: number;
  isFollowing: boolean;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery = '',
  initialType = 'all',
  initialCategory = null,
  initialTag = null,
  categories,
  onOpenArticle,
  onOpenProfile,
  onOpenAuth,
  onSelectCategory,
  onSelectTag,
  onClose,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'articles' | 'journalists' | 'media' | 'categories' | 'tags'>(initialType);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>(initialTag ? initialTag.replace(/^#/, '') : '');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [sortMode, setSortMode] = useState<'latest' | 'popular' | 'views' | 'likes'>('latest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Results state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search Results data
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [articlesPage, setArticlesPage] = useState(1);
  const [articlesHasMore, setArticlesHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [journalists, setJournalists] = useState<User[]>([]);
  const [journalistsTotal, setJournalistsTotal] = useState(0);

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaTotal, setMediaTotal] = useState(0);

  const [categoryResults, setCategoryResults] = useState<(Category & { articleCount: number })[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(0);

  const [tagResults, setTagResults] = useState<{ tag: string; count: number }[]>([]);
  const [tagsTotal, setTagsTotal] = useState(0);

  // Discovery data (when search query is empty)
  const [discoveryData, setDiscoveryData] = useState<{
    popularArticles: Article[];
    recentArticles: Article[];
    popularJournalists: User[];
    popularMedia: MediaItem[];
    popularCategories: (Category & { articleCount: number })[];
    popularTags: { tag: string; count: number }[];
    totalArticles: number;
  } | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Instant suggestions state
  const [suggestions, setSuggestions] = useState<{
    articles: { id: string; title: string; categoryName: string; coverImage: string; authorName: string }[];
    journalists: { id: string; name: string; avatar?: string; mediaName?: string; isVerified?: boolean }[];
    media: { id: string; name: string; logo?: string; isVerified?: boolean }[];
    categories: { id: string; name: string; slug: string; articleCount: number }[];
    tags: { tag: string; count: number }[];
  } | null>(null);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Load recent searches & discovery data on mount
  useEffect(() => {
    setRecentSearches(searchHistory.getSearches());
    loadDiscovery();
  }, []);

  // Synchronize when initialQuery changes
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Load discovery data
  const loadDiscovery = async () => {
    try {
      setDiscoveryLoading(true);
      const data = await api.getDiscoveryData();
      setDiscoveryData(data as any);
    } catch (err: any) {
      console.error('Failed to load discovery data:', err);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Execute search function
  const executeSearch = useCallback(
    async (
      searchQuery: string,
      type: 'all' | 'articles' | 'journalists' | 'media' | 'categories' | 'tags',
      cat: string,
      tag: string,
      date: string,
      sort: string,
      page: number = 1,
      append: boolean = false
    ) => {
      const trimmed = searchQuery.trim();

      // If query is empty and no filters are applied, show discovery view instead
      if (!trimmed && cat === 'all' && !tag && date === 'all') {
        setArticles([]);
        setJournalists([]);
        setMediaList([]);
        setCategoryResults([]);
        setTagResults([]);
        setLoading(false);
        return;
      }

      if (page === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await api.searchGlobal({
          q: trimmed,
          type,
          category: cat !== 'all' ? cat : undefined,
          tag: tag || undefined,
          date: date !== 'all' ? date : undefined,
          sort,
          page,
          limit: 12,
        });

        if (append) {
          setArticles((prev) => [...prev, ...res.articles.items]);
        } else {
          setArticles(res.articles.items);
        }

        setArticlesTotal(res.articles.total);
        setArticlesPage(res.articles.page);
        setArticlesHasMore(res.articles.hasMore);

        setJournalists(res.journalists.items);
        setJournalistsTotal(res.journalists.total);

        setMediaList(res.media.items);
        setMediaTotal(res.media.total);

        setCategoryResults(res.categories.items);
        setCategoryTotal(res.categories.total);

        setTagResults(res.tags.items);
        setTagsTotal(res.tags.total);

        // Save to recent search history if user provided a query
        if (trimmed) {
          const updated = searchHistory.addSearch(trimmed);
          setRecentSearches(updated);
        }
      } catch (err: any) {
        setError(err.message || 'Une erreur est survenue lors de la recherche.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Debounce search whenever query or filters change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(query, activeTab, selectedCategory, selectedTagFilter, dateRange, sortMode, 1, false);
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, activeTab, selectedCategory, selectedTagFilter, dateRange, sortMode, executeSearch]);

  // Autocomplete suggestions fetch
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.getSearchSuggestions(trimmed);
        setSuggestions(res);
      } catch (e) {
        // Ignored
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle follow / unfollow for journalists or media
  const handleFollowToggle = async (targetId: string, isMedia: boolean = false) => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    try {
      const res = await api.toggleFollow(targetId);
      if (isMedia) {
        setMediaList((prev) =>
          prev.map((m) =>
            m.id === targetId ? { ...m, isFollowing: res.isFollowing, followersCount: res.followersCount } : m
          )
        );
      } else {
        setJournalists((prev) =>
          prev.map((j) =>
            j.id === targetId ? { ...j, isFollowing: res.isFollowing, followersCount: res.followersCount } : j
          )
        );
      }
    } catch (err: any) {
      console.error('Follow error:', err);
    }
  };

  const handleClearQuery = () => {
    setQuery('');
    setSuggestions(null);
    setShowSuggestionsDropdown(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
    setShowSuggestionsDropdown(false);
  };

  const handleRemoveRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = searchHistory.removeSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllHistory = () => {
    searchHistory.clearAll();
    setRecentSearches([]);
  };

  const handleLoadMoreArticles = () => {
    if (!loadingMore && articlesHasMore) {
      executeSearch(
        query,
        activeTab,
        selectedCategory,
        selectedTagFilter,
        dateRange,
        sortMode,
        articlesPage + 1,
        true
      );
    }
  };

  const isSearchActive = query.trim().length > 0 || selectedCategory !== 'all' || selectedTagFilter !== '' || dateRange !== 'all';

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Top sticky search header */}
      <div className="sticky top-16 z-20 bg-white border-b border-stone-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  ref={inputRef}
                  id="search-main-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestionsDropdown(true);
                  }}
                  onFocus={() => setShowSuggestionsDropdown(true)}
                  placeholder="Rechercher des articles, journalistes, rédactions, rubriques, tags..."
                  className="w-full pl-11 pr-10 py-3 text-sm sm:text-base bg-stone-100 hover:bg-stone-100/90 focus:bg-white border border-stone-200 focus:border-emerald-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 text-stone-900 transition-all placeholder:text-stone-400"
                />
                {query && (
                  <button
                    id="search-clear-btn"
                    onClick={handleClearQuery}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors"
                    aria-label="Effacer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Advanced Filter Toggle Button */}
              <button
                id="search-toggle-filters-btn"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-semibold rounded-xl border transition-all shrink-0 ${
                  showAdvancedFilters || selectedCategory !== 'all' || selectedTagFilter !== '' || dateRange !== 'all' || sortMode !== 'latest'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                }`}
                title="Filtres avancés"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtres</span>
                {(selectedCategory !== 'all' || selectedTagFilter !== '' || dateRange !== 'all') && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 ml-0.5" />
                )}
              </button>

              {onClose && (
                <button
                  id="search-close-page-btn"
                  onClick={onClose}
                  className="p-3 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Instant suggestions & Recent searches dropdown */}
            {showSuggestionsDropdown && (query.trim() || recentSearches.length > 0) && (
              <div
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 max-h-96 overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()} // Keep focus
              >
                {/* Suggestions by entities */}
                {suggestions && (
                  <div className="p-3 border-b border-stone-100 divide-y divide-stone-100">
                    {/* Articles suggestions */}
                    {suggestions.articles.length > 0 && (
                      <div className="pb-2">
                        <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 px-2">
                          Articles
                        </div>
                        {suggestions.articles.map((art) => (
                          <button
                            key={art.id}
                            id={`suggest-art-${art.id}`}
                            onClick={() => {
                              setShowSuggestionsDropdown(false);
                              api.getArticle(art.id).then((res) => onOpenArticle(res.article));
                            }}
                            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-emerald-50 text-left transition-colors group"
                          >
                            <img
                              src={art.coverImage}
                              alt=""
                              className="w-8 h-8 rounded-md object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-900 truncate group-hover:text-emerald-700">
                                {art.title}
                              </p>
                              <p className="text-[11px] text-stone-500 truncate">
                                {art.categoryName} • {art.authorName}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Journalists & Media suggestions */}
                    {(suggestions.journalists.length > 0 || suggestions.media.length > 0) && (
                      <div className="py-2">
                        <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 px-2">
                          Journalistes & Rédactions
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {suggestions.journalists.map((j) => (
                            <button
                              key={j.id}
                              id={`suggest-j-${j.id}`}
                              onClick={() => {
                                setShowSuggestionsDropdown(false);
                                onOpenProfile(j.id);
                              }}
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-stone-50 text-left transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                                {j.avatar ? (
                                  <img src={j.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  j.name.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-stone-900 truncate flex items-center gap-1">
                                  {j.name}
                                  {j.isVerified && <VerifiedBadge size="xs" type="journalist" />}
                                </p>
                                <p className="text-[10px] text-stone-500 truncate">{j.mediaName || 'Journaliste'}</p>
                              </div>
                            </button>
                          ))}
                          {suggestions.media.map((m) => (
                            <button
                              key={m.id}
                              id={`suggest-m-${m.id}`}
                              onClick={() => {
                                setShowSuggestionsDropdown(false);
                                onOpenProfile(m.id);
                              }}
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-stone-50 text-left transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                                {m.logo ? (
                                  <img src={m.logo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Building2 className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-stone-900 truncate flex items-center gap-1">
                                  {m.name}
                                  {m.isVerified && <VerifiedBadge size="xs" type="media" />}
                                </p>
                                <p className="text-[10px] text-stone-500">Média certifié</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags suggestions */}
                    {suggestions.tags.length > 0 && (
                      <div className="pt-2">
                        <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 px-2">
                          Sujets & Tags
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-2">
                          {suggestions.tags.map((t) => (
                            <button
                              key={t.tag}
                              id={`suggest-tag-${t.tag}`}
                              onClick={() => {
                                setQuery(t.tag);
                                setSelectedTagFilter(t.tag);
                                setShowSuggestionsDropdown(false);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 transition-colors"
                            >
                              <Hash className="w-3 h-3 text-emerald-600" />
                              <span>{t.tag}</span>
                              <span className="text-[10px] text-stone-400">({t.count})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent search history */}
                {recentSearches.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Recherches récentes
                      </span>
                      <button
                        onClick={handleClearAllHistory}
                        className="text-[11px] font-medium text-stone-400 hover:text-red-600 transition-colors"
                      >
                        Effacer l'historique
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          onClick={() => handleSelectRecent(term)}
                          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition-colors"
                        >
                          <span>{term}</span>
                          <button
                            onClick={(e) => handleRemoveRecent(term, e)}
                            className="p-0.5 text-stone-400 hover:text-stone-700 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced filters expansion panel */}
          {showAdvancedFilters && (
            <div className="mt-3.5 pt-3.5 border-t border-stone-200 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Category filter */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Rubrique
                  </label>
                  <select
                    id="filter-category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="all">Toutes les rubriques</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name} {c.articleCount ? `(${c.articleCount})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range filter */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Date de publication
                  </label>
                  <select
                    id="filter-date-select"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="all">Toutes les dates</option>
                    <option value="today">Dernières 24 heures</option>
                    <option value="week">Cette semaine (7 jours)</option>
                    <option value="month">Ce mois-ci</option>
                    <option value="year">Cette année</option>
                  </select>
                </div>

                {/* Sort order filter */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Trier par
                  </label>
                  <select
                    id="filter-sort-select"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="latest">Plus récents d'abord</option>
                    <option value="popular">Plus populaires (Engagement)</option>
                    <option value="views">Plus lus (Nombre de vues)</option>
                    <option value="likes">Plus aimés (Likes)</option>
                  </select>
                </div>

                {/* Reset filters action */}
                <div className="flex items-end">
                  <button
                    id="filter-reset-btn"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedTagFilter('');
                      setDateRange('all');
                      setSortMode('latest');
                    }}
                    className="w-full py-2 px-3 text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Réinitialiser les filtres</span>
                  </button>
                </div>
              </div>

              {/* Active tag indicator if filtered */}
              {selectedTagFilter && (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-stone-600">
                  <span>Filtré par tag :</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    #{selectedTagFilter}
                    <button
                      onClick={() => setSelectedTagFilter('')}
                      className="p-0.5 hover:text-emerald-950"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Type Navigation Tabs (Tous, Articles, Journalistes, Médias, Catégories, Tags) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 mt-1 scroll-smooth">
            <button
              id="search-tab-all"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tous</span>
            </button>

            <button
              id="search-tab-articles"
              onClick={() => setActiveTab('articles')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'articles'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>Articles</span>
              {isSearchActive && articlesTotal > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'articles' ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 text-stone-600'
                }`}>
                  {articlesTotal}
                </span>
              )}
            </button>

            <button
              id="search-tab-journalists"
              onClick={() => setActiveTab('journalists')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'journalists'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Journalistes</span>
              {isSearchActive && journalistsTotal > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'journalists' ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 text-stone-600'
                }`}>
                  {journalistsTotal}
                </span>
              )}
            </button>

            <button
              id="search-tab-media"
              onClick={() => setActiveTab('media')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'media'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Médias</span>
              {isSearchActive && mediaTotal > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'media' ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 text-stone-600'
                }`}>
                  {mediaTotal}
                </span>
              )}
            </button>

            <button
              id="search-tab-categories"
              onClick={() => setActiveTab('categories')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rubriques</span>
              {isSearchActive && categoryTotal > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'categories' ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 text-stone-600'
                }`}>
                  {categoryTotal}
                </span>
              )}
            </button>

            <button
              id="search-tab-tags"
              onClick={() => setActiveTab('tags')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'tags'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Tags</span>
              {isSearchActive && tagsTotal > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'tags' ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 text-stone-600'
                }`}>
                  {tagsTotal}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Recherche en cours dans la base d'actualités...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-stone-200 p-4 animate-pulse space-y-3">
                  <div className="w-full h-44 bg-stone-200 rounded-xl" />
                  <div className="h-4 bg-stone-200 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-6 text-center max-w-lg mx-auto">
            <p className="font-bold mb-1">Erreur lors de la recherche</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => executeSearch(query, activeTab, selectedCategory, selectedTagFilter, dateRange, sortMode, 1, false)}
              className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCENARIO A: SEARCH IS ACTIVE WITH RESULTS                     */}
        {/* ------------------------------------------------------------- */}
        {!loading && !error && isSearchActive && (
          <div className="space-y-8">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
              <div>
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  {query ? (
                    <>
                      Résultats pour <span className="text-emerald-700">« {query} »</span>
                    </>
                  ) : (
                    'Résultats filtrés'
                  )}
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  {articlesTotal} article{articlesTotal > 1 ? 's' : ''} • {journalistsTotal} journaliste{journalistsTotal > 1 ? 's' : ''} • {mediaTotal} média{mediaTotal > 1 ? 's' : ''}
                </p>
              </div>

              {/* Active sorting indicator */}
              <div className="text-xs font-medium text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                Tri : <span className="font-semibold text-stone-800">
                  {sortMode === 'latest' && 'Plus récents'}
                  {sortMode === 'popular' && 'Plus populaires'}
                  {sortMode === 'views' && 'Plus lus'}
                  {sortMode === 'likes' && 'Plus aimés'}
                </span>
              </div>
            </div>

            {/* If No results across everything */}
            {articlesTotal === 0 && journalistsTotal === 0 && mediaTotal === 0 && categoryTotal === 0 && tagsTotal === 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-lg mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">Aucun résultat trouvé</h3>
                <p className="text-sm text-stone-500 mb-6">
                  Nous n'avons trouvé aucun contenu correspondant à vos critères. Essayez avec d'autres mots-clés ou supprimez vos filtres.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setQuery('');
                      setSelectedCategory('all');
                      setSelectedTagFilter('');
                      setDateRange('all');
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors"
                  >
                    Effacer tous les critères
                  </button>
                </div>
              </div>
            )}

            {/* TAB: TOUS (MIXED HIGHLIGHTS VIEW) */}
            {activeTab === 'all' && (
              <div className="space-y-10">
                {/* Highlight Articles */}
                {articles.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                        <span>Articles ({articlesTotal})</span>
                      </h2>
                      {articlesTotal > 6 && (
                        <button
                          onClick={() => setActiveTab('articles')}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                        >
                          Voir tous les articles <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {articles.slice(0, 6).map((art) => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          onOpenArticle={onOpenArticle}
                          onOpenProfile={onOpenProfile}
                          onOpenAuth={onOpenAuth}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlight Journalists */}
                {journalists.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>Journalistes correspondants ({journalistsTotal})</span>
                      </h2>
                      {journalistsTotal > 3 && (
                        <button
                          onClick={() => setActiveTab('journalists')}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                        >
                          Voir tous <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {journalists.slice(0, 3).map((j) => (
                        <div
                          key={j.id}
                          id={`search-journalist-card-${j.id}`}
                          className="bg-white rounded-2xl border border-stone-200 p-4.5 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              onClick={() => onOpenProfile(j.id)}
                              className="w-13 h-13 rounded-full bg-emerald-100 text-emerald-800 font-bold text-base flex items-center justify-center shrink-0 overflow-hidden cursor-pointer ring-2 ring-emerald-600/10"
                            >
                              {j.avatar ? (
                                <img src={j.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                j.name.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                onClick={() => onOpenProfile(j.id)}
                                className="font-bold text-stone-900 hover:text-emerald-700 cursor-pointer flex items-center gap-1.5 truncate text-sm sm:text-base"
                              >
                                <span>{j.name}</span>
                                {j.isVerified && <VerifiedBadge size="sm" type="journalist" />}
                              </div>
                              <p className="text-xs text-stone-500 font-medium truncate">
                                {j.mediaName || 'Journaliste d’investigation'}
                              </p>
                              {j.bio && (
                                <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                                  {j.bio}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-xs text-stone-500 font-medium">
                              {j.followersCount || 0} abonné{(j.followersCount || 0) > 1 ? 's' : ''} • {j.articlesCount || 0} art.
                            </span>
                            <button
                              id={`follow-journalist-${j.id}`}
                              onClick={() => handleFollowToggle(j.id, false)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                                j.isFollowing
                                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {j.isFollowing ? 'Abonné' : 'Suivre'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlight Media */}
                {mediaList.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <span>Rédactions & Médias ({mediaTotal})</span>
                      </h2>
                      {mediaTotal > 3 && (
                        <button
                          onClick={() => setActiveTab('media')}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                        >
                          Voir tous <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mediaList.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          id={`search-media-card-${m.id}`}
                          className="bg-white rounded-2xl border border-stone-200 p-4.5 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              onClick={() => onOpenProfile(m.id)}
                              className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-900 font-bold text-base flex items-center justify-center shrink-0 overflow-hidden cursor-pointer ring-2 ring-amber-600/10"
                            >
                              {m.logo ? (
                                <img src={m.logo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Building2 className="w-6 h-6" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                onClick={() => onOpenProfile(m.id)}
                                className="font-bold text-stone-900 hover:text-emerald-700 cursor-pointer flex items-center gap-1.5 truncate text-sm sm:text-base"
                              >
                                <span>{m.name}</span>
                                {m.isVerified && <VerifiedBadge size="sm" type="media" />}
                              </div>
                              <p className="text-xs text-amber-800 font-medium">Média certifié</p>
                              {m.bio && (
                                <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                                  {m.bio}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-xs text-stone-500 font-medium">
                              {m.articlesCount} article{m.articlesCount > 1 ? 's' : ''} • {m.followersCount} abonnés
                            </span>
                            <button
                              id={`follow-media-${m.id}`}
                              onClick={() => handleFollowToggle(m.id, true)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                                m.isFollowing
                                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {m.isFollowing ? 'Abonné' : 'Suivre'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlight Categories & Tags */}
                {(categoryResults.length > 0 || tagResults.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rubriques */}
                    {categoryResults.length > 0 && (
                      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-emerald-600" />
                          <span>Rubriques correspondantes ({categoryTotal})</span>
                        </h3>
                        <div className="space-y-2.5">
                          {categoryResults.slice(0, 4).map((cat) => (
                            <div
                              key={cat.id}
                              onClick={() => {
                                onSelectCategory(cat.slug);
                                if (onClose) onClose();
                              }}
                              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 border border-stone-100 cursor-pointer transition-colors group"
                            >
                              <div>
                                <h4 className="text-sm font-bold text-stone-900 group-hover:text-emerald-700">
                                  {cat.name}
                                </h4>
                                <p className="text-xs text-stone-500 line-clamp-1">{cat.description}</p>
                              </div>
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-stone-100 text-stone-700 shrink-0">
                                {cat.articleCount} art.
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {tagResults.length > 0 && (
                      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Hash className="w-4 h-4 text-emerald-600" />
                          <span>Sujets & Tags associés ({tagsTotal})</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {tagResults.slice(0, 15).map((t) => (
                            <button
                              key={t.tag}
                              id={`search-tag-chip-${t.tag}`}
                              onClick={() => {
                                onSelectTag(t.tag);
                                if (onClose) onClose();
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-stone-100 hover:bg-emerald-100 text-stone-800 hover:text-emerald-900 transition-colors"
                            >
                              <Hash className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{t.tag}</span>
                              <span className="text-[10px] bg-stone-200/80 px-1.5 py-0.2 rounded-full text-stone-600">
                                {t.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ARTICLES ONLY */}
            {activeTab === 'articles' && (
              <div className="space-y-6">
                {articles.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
                    Aucun article ne correspond à ces filtres.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {articles.map((art) => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          onOpenArticle={onOpenArticle}
                          onOpenProfile={onOpenProfile}
                          onOpenAuth={onOpenAuth}
                        />
                      ))}
                    </div>

                    {/* Pagination button */}
                    {articlesHasMore && (
                      <div className="text-center pt-6">
                        <button
                          id="search-load-more-articles-btn"
                          onClick={handleLoadMoreArticles}
                          disabled={loadingMore}
                          className="px-6 py-3 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-sm font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
                        >
                          {loadingMore ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                              <span>Chargement des articles...</span>
                            </>
                          ) : (
                            <>
                              <span>Afficher plus d'articles</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB: JOURNALISTS ONLY */}
            {activeTab === 'journalists' && (
              <div className="space-y-6">
                {journalists.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
                    Aucun journaliste trouvé pour « {query} ».
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {journalists.map((j) => (
                      <div
                        key={j.id}
                        id={`search-journalist-full-${j.id}`}
                        className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            onClick={() => onOpenProfile(j.id)}
                            className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-bold text-base flex items-center justify-center shrink-0 overflow-hidden cursor-pointer ring-2 ring-emerald-600/20"
                          >
                            {j.avatar ? (
                              <img src={j.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              j.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              onClick={() => onOpenProfile(j.id)}
                              className="font-bold text-stone-900 hover:text-emerald-700 cursor-pointer flex items-center gap-1.5 truncate text-base"
                            >
                              <span>{j.name}</span>
                              {j.isVerified && <VerifiedBadge size="sm" type="journalist" />}
                            </div>
                            <p className="text-xs text-stone-500 font-medium truncate">
                              {j.mediaName || 'Journaliste accrédité'}
                            </p>
                            {j.bio && (
                              <p className="text-xs text-stone-600 mt-2 line-clamp-3">
                                {j.bio}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-xs text-stone-500 font-medium">
                            {j.followersCount || 0} abonnés • {j.articlesCount || 0} publications
                          </span>
                          <button
                            id={`follow-journalist-full-${j.id}`}
                            onClick={() => handleFollowToggle(j.id, false)}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              j.isFollowing
                                ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {j.isFollowing ? 'Abonné' : 'Suivre'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MEDIA ONLY */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                {mediaList.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
                    Aucun média ou organe de presse trouvé pour « {query} ».
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mediaList.map((m) => (
                      <div
                        key={m.id}
                        id={`search-media-full-${m.id}`}
                        className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            onClick={() => onOpenProfile(m.id)}
                            className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 font-bold text-base flex items-center justify-center shrink-0 overflow-hidden cursor-pointer ring-2 ring-amber-600/20"
                          >
                            {m.logo ? (
                              <img src={m.logo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-7 h-7" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              onClick={() => onOpenProfile(m.id)}
                              className="font-bold text-stone-900 hover:text-emerald-700 cursor-pointer flex items-center gap-1.5 truncate text-base"
                            >
                              <span>{m.name}</span>
                              {m.isVerified && <VerifiedBadge size="sm" type="media" />}
                            </div>
                            <p className="text-xs text-amber-800 font-medium">Rédaction burkinabè</p>
                            {m.bio && (
                              <p className="text-xs text-stone-600 mt-2 line-clamp-3">
                                {m.bio}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-xs text-stone-500 font-medium">
                            {m.articlesCount} articles • {m.followersCount} abonnés
                          </span>
                          <button
                            id={`follow-media-full-${m.id}`}
                            onClick={() => handleFollowToggle(m.id, true)}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              m.isFollowing
                                ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {m.isFollowing ? 'Abonné' : 'Suivre'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: CATEGORIES ONLY */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryResults.map((cat) => (
                  <div
                    key={cat.id}
                    id={`search-category-full-${cat.id}`}
                    onClick={() => {
                      onSelectCategory(cat.slug);
                      if (onClose) onClose();
                    }}
                    className="bg-white rounded-2xl border border-stone-200 p-5 hover:border-emerald-600 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                          <Layers className="w-5 h-5" />
                        </span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                          {cat.articleCount} article{cat.articleCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                        {cat.description || 'Découvrez tous les reportages et analyses de cette rubrique.'}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                      <span>Explorer la rubrique</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: TAGS ONLY */}
            {activeTab === 'tags' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 text-stone-900 font-bold">
                  <Hash className="w-5 h-5 text-emerald-600" />
                  <span>Tous les tags et sujets indexés ({tagsTotal})</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {tagResults.map((t) => (
                    <button
                      key={t.tag}
                      id={`search-tag-full-${t.tag}`}
                      onClick={() => {
                        onSelectTag(t.tag);
                        if (onClose) onClose();
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-stone-100 hover:bg-emerald-100 text-stone-800 hover:text-emerald-900 transition-colors"
                    >
                      <Hash className="w-4 h-4 text-emerald-600" />
                      <span>{t.tag}</span>
                      <span className="text-[11px] bg-stone-200 px-2 py-0.5 rounded-full font-bold text-stone-600">
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCENARIO B: DISCOVERY HUB (QUERY IS EMPTY)                     */}
        {/* ------------------------------------------------------------- */}
        {!loading && !isSearchActive && (
          <div className="space-y-12 animate-in fade-in">
            {/* Discovery Welcome Banner */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
              <div className="max-w-2xl relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Espace Découverte & Exploration</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase">
                  EXPLORE L'ACTUALITÉ VÉRIFIÉE DE LA PURGE DANS TOUT CES ASPECTS
                </h2>
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                  Accédez aux analyses des rédactions professionnelles, suivez vos journalistes favoris et naviguez au cœur des grands débats de société.
                </p>
              </div>
            </div>

            {/* 1. Trending Popular Tags */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span>Sujets & Tendances du moment</span>
                </h3>
              </div>
              {discoveryData && discoveryData.popularTags && discoveryData.popularTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {discoveryData.popularTags.map((t) => (
                    <button
                      key={t.tag}
                      id={`discovery-tag-${t.tag}`}
                      onClick={() => {
                        setQuery(t.tag);
                        setSelectedTagFilter(t.tag);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-emerald-50 border border-stone-200 text-stone-800 hover:text-emerald-800 hover:border-emerald-300 shadow-2xs transition-all"
                    >
                      <Hash className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.tag}</span>
                      <span className="text-[11px] text-stone-400 font-normal">({t.count})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white border border-dashed border-stone-200 text-stone-500 text-xs sm:text-sm flex items-center gap-2.5">
                  <Hash className="w-4 h-4 text-emerald-600/70 shrink-0" />
                  <span>Les sujets et tendances du moment s'afficheront ici automatiquement au fil des publications des journalistes.</span>
                </div>
              )}
            </div>

            {/* 2. Popular Articles */}
            {discoveryData && discoveryData.popularArticles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Articles les plus populaires</span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {discoveryData.popularArticles.map((art) => (
                    <ArticleCard
                      key={art.id}
                      article={art}
                      onOpenArticle={onOpenArticle}
                      onOpenProfile={onOpenProfile}
                      onOpenAuth={onOpenAuth}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 3. Verified Journalists & Media to follow */}
            {discoveryData && (discoveryData.popularJournalists.length > 0 || discoveryData.popularMedia.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <span>Journalistes et Rédactions certifiées à suivre</span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {discoveryData.popularMedia.map((m) => (
                    <div
                      key={m.id}
                      id={`discovery-media-${m.id}`}
                      className="bg-white rounded-2xl border border-stone-200 p-4.5 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          onClick={() => onOpenProfile(m.id)}
                          className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
                        >
                          {m.logo ? (
                            <img src={m.logo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            onClick={() => onOpenProfile(m.id)}
                            className="font-bold text-stone-900 hover:text-emerald-700 cursor-pointer flex items-center gap-1.5 truncate text-sm"
                          >
                            <span>{m.name}</span>
                            {m.isVerified && <VerifiedBadge size="xs" type="media" />}
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-1">{m.bio}</p>
                        </div>
                      </div>
                      <div className="mt-3.5 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-xs text-stone-500 font-medium">{m.followersCount} abonnés</span>
                        <button
                          id={`disc-follow-m-${m.id}`}
                          onClick={() => handleFollowToggle(m.id, true)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                            m.isFollowing
                              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {m.isFollowing ? 'Abonné' : 'Suivre'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {discoveryData.popularJournalists.map((j) => (
                    <div
                      key={j.id}
                      id={`discovery-journalist-${j.id}`}
                      className="bg-white rounded-2xl border border-stone-200 p-4.5 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          onClick={() => onOpenProfile(j.id)}
                          className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
                        >
                          {j.avatar ? (
                            <img src={j.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            j.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            onClick={() => onOpenProfile(j.id)}
                            className="font-bold text-stone-900 hover:text-emerald-700 cursor-pointer flex items-center gap-1.5 truncate text-sm"
                          >
                            <span>{j.name}</span>
                            {j.isVerified && <VerifiedBadge size="xs" type="journalist" />}
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-1">{j.mediaName || 'Journaliste'}</p>
                        </div>
                      </div>
                      <div className="mt-3.5 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-xs text-stone-500 font-medium">
                          {j.followersCount || 0} abonnés • {j.articlesCount || 0} art.
                        </span>
                        <button
                          id={`disc-follow-j-${j.id}`}
                          onClick={() => handleFollowToggle(j.id, false)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                            j.isFollowing
                              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {j.isFollowing ? 'Abonné' : 'Suivre'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
