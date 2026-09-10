import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  ArrowLeft,
  Search,
  Trash2,
  Clock,
  Eye,
  Heart,
  Share2,
  SlidersHorizontal,
  ExternalLink,
  Sparkles,
  Layers,
  BookOpen,
  Check,
} from 'lucide-react';
import { Article } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sfx } from '../services/soundEffects';

interface BookmarksPageProps {
  onBack: () => void;
  onOpenArticle: (article: Article) => void;
  onOpenProfile: (userId: string) => void;
  onExploreMore: () => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({
  onBack,
  onOpenArticle,
  onOpenProfile,
  onExploreMore,
}) => {
  const { refreshUser } = useAuth();
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const res = await api.getBookmarks();
      setBookmarks(res.bookmarks || []);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleRemove = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.playMechanicalClick();
    try {
      await api.toggleBookmarkArticle(articleId);
      setBookmarks((prev) => prev.filter((b) => b.id !== articleId));
      refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = (article: Article, e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.playClick();
    const url = `${window.location.origin}/#article-${article.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(article.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Categories extracted from loaded bookmarks
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    bookmarks.forEach((b) => {
      const cat = b.category || b.categoryName;
      if (cat) cats.add(cat);
    });
    return Array.from(cats);
  }, [bookmarks]);

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((art) => {
      const summaryText = art.excerpt || art.summary || '';
      const catName = art.category || art.categoryName || '';
      const matchesSearch =
        !searchQuery.trim() ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summaryText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.authorName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' ||
        catName.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [bookmarks, searchQuery, selectedCategory]);

  return (
    <div className="w-full max-w-full min-h-screen bg-[#07080f] text-slate-100 font-sans pb-28 md:pb-16 animate-fadeIn overflow-x-clip">
      {/* Top Header / Breadcrumb Bar */}
      <div className="sticky top-16 z-30 bg-[#040817]/90 backdrop-blur-xl border-b border-blue-500/20 px-4 sm:px-8 py-3.5 transition-all w-full max-w-full">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 min-w-0">
          <button
            id="bookmarks-page-back-btn"
            onClick={() => {
              sfx.playClick();
              onBack();
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-950/50 hover:bg-blue-600/25 text-cyan-300 hover:text-cyan-200 border border-blue-500/30 hover:border-cyan-400/50 text-xs font-bold transition-all cursor-pointer touch-target interactive-pop shrink-0"
            title="Revenir à l'accueil"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap font-bold">
              <span className="hidden sm:inline">Retour à l'accueil</span>
              <span className="sm:hidden">Accueil</span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-blue-950/60 text-cyan-300 border border-cyan-500/30">
              <Bookmark className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/30" />
              {bookmarks.length} {bookmarks.length > 1 ? 'articles enregistrés' : 'article enregistré'}
            </span>
            <div className="flex items-center bg-[#0b142c] p-1 rounded-xl border border-blue-500/30">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(29,104,255,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vue en grille"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(29,104,255,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vue en liste compacte"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8">
        {/* Main Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0b142c] via-[#040817] to-[#0b142c] border border-blue-500/30 p-6 sm:p-8 mb-8 shadow-[0_0_50px_rgba(29,104,255,0.15)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-[0_0_15px_rgba(0,210,255,0.5)]">
                  <Bookmark className="w-5 h-5 fill-white" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  Espace Personnel • Bibliothèque Hors-ligne
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Mes Articles Favoris
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Retrouvez l'intégralité de vos enquêtes, analyses et dépêches sauvegardées pour une lecture sereine et approfondie.
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-[#040817]/80 border border-blue-500/30 text-center">
                <span className="block text-xl font-black font-mono text-cyan-300">
                  {bookmarks.length}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Favoris</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-[#040817]/80 border border-blue-500/30 text-center">
                <span className="block text-xl font-black font-mono text-yellow-400">
                  {availableCategories.length}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Rubriques</span>
              </div>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="relative z-10 mt-6 pt-6 border-t border-blue-500/20 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="bookmarks-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans mes favoris par titre, sujet ou auteur..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040817]/90 border border-blue-500/40 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/10"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Category Filter Dropdown / Pills on mobile */}
            {availableCategories.length > 0 && (
              <div className="w-full max-w-full min-w-0 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer touch-target ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(29,104,255,0.4)]'
                      : 'bg-blue-950/40 text-slate-300 hover:text-white border border-blue-500/30'
                  }`}
                >
                  Tous ({bookmarks.length})
                </button>
                {availableCategories.map((cat) => {
                  const count = bookmarks.filter((b) => (b.category || b.categoryName) === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer capitalize touch-target ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(29,104,255,0.4)]'
                          : 'bg-blue-950/40 text-slate-300 hover:text-white border border-blue-500/30'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Content list / grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-mono text-cyan-300/80">Chargement de votre bibliothèque...</p>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-[#040817]/60 border border-blue-500/20 p-8 max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Bookmark className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Aucun article enregistré pour l'instant
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Enregistrez vos articles préférés en appuyant sur l'icône de marque-page pour les lire tranquillement plus tard, même sans connexion stable.
            </p>
            <button
              id="bookmarks-empty-explore-btn"
              onClick={() => {
                sfx.playClick();
                onExploreMore();
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(29,104,255,0.5)] hover:from-blue-500 hover:to-cyan-400 transition cursor-pointer interactive-pop"
            >
              Explorer les articles récents
            </button>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-[#040817]/40 border border-blue-500/20 p-6">
            <p className="text-sm text-slate-300 font-medium">
              Aucun article ne correspond à votre recherche "{searchQuery}"
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-3 text-xs text-cyan-400 hover:underline font-mono"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBookmarks.map((article) => (
              <div
                key={article.id}
                onClick={() => {
                  sfx.playClick();
                  onOpenArticle(article);
                }}
                className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#0b142c]/90 to-[#040817]/95 border border-blue-500/25 hover:border-cyan-400/50 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_30px_rgba(0,210,255,0.2)] flex flex-col cursor-pointer"
              >
                {/* Media Image / Thumbnail */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                  {(article.imageUrl || article.coverImage) ? (
                    <img
                      src={article.imageUrl || article.coverImage}
                      alt={article.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-950 to-[#040817] text-cyan-400/30">
                      <BookOpen className="w-12 h-12" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#040817] via-transparent to-transparent opacity-80" />

                  {/* Category Badge */}
                  {(article.category || article.categoryName) && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-600/90 text-white backdrop-blur-md shadow-md border border-white/20">
                      {article.category || article.categoryName}
                    </span>
                  )}

                  {/* Quick Remove & Share Actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleShare(article, e)}
                      title="Partager"
                      className="p-2 rounded-full bg-black/60 hover:bg-cyan-500/30 text-white backdrop-blur-md transition cursor-pointer touch-target"
                    >
                      {copiedId === article.id ? (
                        <Check className="w-3.5 h-3.5 text-cyan-300" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleRemove(article.id, e)}
                      title="Retirer des favoris"
                      className="p-2 rounded-full bg-black/60 hover:bg-red-500/30 text-red-300 hover:text-red-200 backdrop-blur-md transition cursor-pointer touch-target"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Publication date & reading time */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {new Date(article.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {article.viewsCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-blue-400" />
                          {article.viewsCount}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-white line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
                      {article.title}
                    </h2>

                    {/* Excerpt / Summary */}
                    {(article.excerpt || article.summary) && (
                      <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                        {article.excerpt || article.summary}
                      </p>
                    )}
                  </div>

                  {/* Author / House Footer */}
                  <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-slate-300 truncate">
                        {article.authorName}
                      </span>
                      {article.mediaName && (
                        <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 truncate">
                          {article.mediaName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-cyan-300 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                      Lire →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View (Compact) */
          <div className="space-y-3">
            {filteredBookmarks.map((article) => (
              <div
                key={article.id}
                onClick={() => {
                  sfx.playClick();
                  onOpenArticle(article);
                }}
                className="group p-4 rounded-2xl bg-[#0b142c]/80 hover:bg-[#0b142c] border border-blue-500/20 hover:border-cyan-400/50 transition-all flex items-center gap-4 cursor-pointer"
              >
                {(article.imageUrl || article.coverImage) && (
                  <img
                    src={article.imageUrl || article.coverImage}
                    alt={article.title}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 border border-blue-500/30"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mb-1">
                    {(article.category || article.categoryName) && (
                      <span className="px-2 py-0.5 rounded bg-blue-600/30 text-cyan-300 border border-blue-400/30 uppercase text-[9px] font-bold">
                        {article.category || article.categoryName}
                      </span>
                    )}
                    <span>{new Date(article.createdAt).toLocaleDateString('fr-FR')}</span>
                    <span>•</span>
                    <span className="truncate">{article.authorName}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                    {article.title}
                  </h2>
                  {(article.excerpt || article.summary) && (
                    <p className="text-xs text-slate-300 line-clamp-1 mt-1 hidden sm:block">
                      {article.excerpt || article.summary}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleShare(article, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-blue-600/20 transition cursor-pointer"
                    title="Partager"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleRemove(article.id, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-500/20 transition cursor-pointer"
                    title="Retirer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
