import React from 'react';
import { Home, Search, Compass, ArrowLeft, Layers } from 'lucide-react';
import { Category } from '../types';

interface NotFoundPageProps {
  onGoHome: () => void;
  onOpenSearch?: () => void;
  categories?: Category[];
  onSelectCategory?: (slug: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onGoHome,
  onOpenSearch,
  categories = [],
  onSelectCategory,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center">
        {/* Visual 404 Badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm mb-6">
          <span className="font-editorial text-3xl font-black tracking-tighter">404</span>
        </div>

        <h1 className="font-editorial text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Page ou contenu introuvable
        </h1>

        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-md mx-auto">
          L'article, la rubrique ou la page que vous recherchez n'existe pas, a été déplacé ou est temporairement inaccessible.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            id="not-found-home-btn"
            onClick={onGoHome}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Retour au fil d'actualités</span>
          </button>

          {onOpenSearch && (
            <button
              id="not-found-search-btn"
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-semibold transition-all active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span>Explorer & Rechercher</span>
            </button>
          )}
        </div>

        {/* Popular Categories Shortcut */}
        {categories.length > 0 && onSelectCategory && (
          <div className="mt-10 pt-8 border-t border-stone-200/80 dark:border-stone-800">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
              Découvrir les rubriques populaires
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.slug)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 transition-colors shadow-2xs"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
