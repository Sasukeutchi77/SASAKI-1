import React, { useState, useEffect } from 'react';
import { X, Bookmark, Trash2, Clock, Eye, Heart, MessageSquare } from 'lucide-react';
import { Article } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface BookmarksModalProps {
  onClose: () => void;
  onOpenArticle: (article: Article) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({ onClose, onOpenArticle }) => {
  const { refreshUser } = useAuth();
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const res = await api.getBookmarks();
      setBookmarks(res.bookmarks);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemove = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleBookmarkArticle(articleId);
      setBookmarks((prev) => prev.filter((b) => b.id !== articleId));
      refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[85vh] transition-colors">
        {/* Header */}
        <div className="bg-stone-50 dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-emerald-700 dark:text-emerald-400 fill-emerald-700 dark:fill-emerald-400" />
            <h2 className="text-base font-black text-stone-900 dark:text-stone-100">Articles Enregistrés</h2>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-semibold">({bookmarks.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-stone-400 dark:text-stone-500">Chargement de vos signets...</div>
          ) : bookmarks.length === 0 ? (
            <div className="p-12 text-center text-stone-400 dark:text-stone-500">
              <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-stone-700 dark:text-stone-300">Aucun article enregistré pour l'instant</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Cliquez sur l'icône signet sur n'importe quel article pour le lire plus tard.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((art) => (
                <div
                  key={art.id}
                  onClick={() => {
                    onOpenArticle(art);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-850 hover:bg-stone-100/80 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-750 flex items-center justify-between gap-4 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={art.coverImage}
                      alt={art.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded">
                        {art.categoryName}
                      </span>
                      <h4 className="mt-1 font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                        {art.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {art.mediaName || art.authorName} • {new Date(art.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleRemove(art.id, e)}
                    className="p-2 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="Retirer des signets"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
