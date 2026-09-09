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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#040817] border border-blue-500/30 rounded-2xl shadow-[0_0_45px_rgba(29,104,255,0.25)] overflow-hidden flex flex-col my-4 max-h-[85vh] transition-all text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0b142c] to-[#040817] border-b border-blue-500/20 px-6 py-4 flex items-center justify-between shrink-0 transition-all">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-cyan-400 fill-cyan-400" />
            <h2 className="text-base font-black font-mono tracking-wide text-white">Articles Enregistrés</h2>
            <span className="text-xs text-blue-300/70 font-mono">({bookmarks.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-300/60 hover:text-cyan-200 hover:bg-blue-600/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-blue-300/60 font-mono">Chargement de vos signets...</div>
          ) : bookmarks.length === 0 ? (
            <div className="p-12 text-center text-blue-300/50">
              <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
              <p className="font-semibold text-slate-200">Aucun article enregistré pour l'instant</p>
              <p className="text-xs text-blue-300/60 font-mono mt-1">
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
                  className="p-3.5 rounded-xl bg-gradient-to-r from-[#0b142c] to-[#040817] hover:from-[#101d40] hover:to-[#081028] border border-blue-500/25 hover:border-cyan-400/60 flex items-center justify-between gap-4 cursor-pointer transition-all group shadow-[0_4px_15px_rgba(0,10,35,0.4)] hover:shadow-[0_4px_25px_rgba(29,104,255,0.3)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={art.coverImage}
                      alt={art.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-blue-500/30 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-cyan-300 bg-blue-600/20 border border-blue-400/40 px-2 py-0.5 rounded">
                        {art.categoryName}
                      </span>
                      <h4 className="mt-1 font-bold text-xs sm:text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                        {art.title}
                      </h4>
                      <p className="text-[11px] text-blue-300/60 font-mono truncate mt-0.5">
                        {art.mediaName || art.authorName} • {new Date(art.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleRemove(art.id, e)}
                    className="p-2 text-blue-300/60 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors shrink-0 cursor-pointer"
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
