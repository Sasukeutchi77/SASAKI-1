import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Clock,
  Eye,
  Heart,
  SlidersHorizontal,
  RefreshCw,
  ArrowRight,
  Hash,
} from 'lucide-react';
import { Article, Category } from '../types';
import { api } from '../services/api';
import { ArticleCard } from '../components/ArticleCard';

interface CategoryPageProps {
  categorySlug: string;
  categories: Category[];
  onBack: () => void;
  onOpenArticle: (art: Article) => void;
  onOpenProfile: (userId: string) => void;
  onOpenAuth: () => void;
  onSelectTag: (tag: string) => void;
  onSelectOtherCategory: (slug: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({
  categorySlug,
  categories,
  onBack,
  onOpenArticle,
  onOpenProfile,
  onOpenAuth,
  onSelectTag,
  onSelectOtherCategory,
}) => {
  const currentCategory = categories.find(
    (c) => c.slug === categorySlug || c.id === categorySlug
  );

  const [articles, setArticles] = useState<Article[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & sorting
  const [sortMode, setSortMode] = useState<'latest' | 'popular' | 'views' | 'likes'>('latest');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Available tags in this category
  const [categoryTags, setCategoryTags] = useState<string[]>([]);

  useEffect(() => {
    loadCategoryArticles(1, false);
    loadPopularInCategory();
  }, [categorySlug, sortMode, dateRange]);

  const loadCategoryArticles = async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await api.getArticles({
        category: categorySlug,
        sort: sortMode,
        dateRange: dateRange !== 'all' ? (dateRange as any) : undefined,
        page: pageNum,
        limit: 12,
      });

      if (append) {
        setArticles((prev) => [...prev, ...res.articles]);
      } else {
        setArticles(res.articles);
      }

      setTotal(res.total);
      setPage(res.page);
      setHasMore(res.hasMore);

      // Extract distinct tags from the category's articles
      const tagsSet = new Set<string>();
      res.articles.forEach((a) => {
        if (a.tags) {
          a.tags.forEach((t) => tagsSet.add(t.replace(/^#/, '')));
        }
      });
      setCategoryTags(Array.from(tagsSet));
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les articles de cette rubrique.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadPopularInCategory = async () => {
    try {
      const res = await api.getArticles({
        category: categorySlug,
        sort: 'popular',
        page: 1,
        limit: 3,
      });
      setPopularArticles(res.articles);
    } catch (err) {
      // Ignored
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadCategoryArticles(page + 1, true);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Category Header Hero */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            id="category-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-emerald-700 mb-4 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Retour au fil principal</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Rubrique Officielle</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                {currentCategory?.name || categorySlug}
              </h1>
              <p className="text-sm sm:text-base text-stone-600 mt-2 max-w-2xl leading-relaxed">
                {currentCategory?.description ||
                  'Toutes les actualités, analyses et reportages vérifiés dans cette thématique.'}
              </p>
            </div>

            {/* Total count badge */}
            <div className="bg-stone-100 rounded-2xl p-4 border border-stone-200 shrink-0 text-center sm:text-left">
              <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {total}
              </span>
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Articles publiés
              </span>
            </div>
          </div>

          {/* Tags cloud in this category */}
          {categoryTags.length > 0 && (
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                Sujets clés :
              </span>
              {categoryTags.slice(0, 10).map((t) => (
                <button
                  key={t}
                  id={`cat-tag-${t}`}
                  onClick={() => onSelectTag(t)}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Popular in this Category spotlight */}
        {popularArticles.length > 0 && (
          <div className="bg-emerald-950/5 border border-emerald-900/10 rounded-3xl p-6 sm:p-8">
            <h2 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>À la une dans cette rubrique</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {popularArticles.map((art) => (
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

        {/* Filters and Sorting bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-400" />
            <span className="text-xs sm:text-sm font-bold text-stone-800">
              Tous les articles ({total})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date filter */}
            <select
              id="category-date-filter"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">Toutes dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>

            {/* Sort mode */}
            <select
              id="category-sort-filter"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="latest">Plus récents</option>
              <option value="popular">Plus populaires</option>
              <option value="views">Plus lus</option>
              <option value="likes">Plus aimés</option>
            </select>
          </div>
        </div>

        {/* Articles List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-stone-200 p-4 animate-pulse space-y-3">
                <div className="w-full h-44 bg-stone-200 rounded-xl" />
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center text-red-800">
            {error}
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
            Aucun article n'a été publié dans cette rubrique pour le moment.
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

            {/* Pagination Load More */}
            {hasMore && (
              <div className="text-center pt-6">
                <button
                  id="category-load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-sm font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Chargement...</span>
                    </>
                  ) : (
                    <>
                      <span>Charger plus d'articles</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Other categories navigation strip */}
        <div className="pt-10 border-t border-stone-200">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
            Autres rubriques à explorer
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories
              .filter((c) => c.slug !== categorySlug && c.id !== categorySlug)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectOtherCategory(c.slug)}
                  className="p-3 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-xl text-left transition-all group"
                >
                  <p className="text-xs font-bold text-stone-900 group-hover:text-emerald-700 truncate">
                    {c.name}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{c.articleCount || 0} articles</p>
                </button>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
};
