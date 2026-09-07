import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Heart,
  MessageSquare,
  Ban,
  RotateCcw,
  Trash2,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Article, Category } from '../../types';
import { api } from '../../services/api';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminArticlesTabProps {
  articles: Article[];
  categories: Category[];
  onRefresh: () => void;
  onFlash: (msg: string) => void;
  onPreviewArticle?: (article: Article) => void;
}

export const AdminArticlesTab: React.FC<AdminArticlesTabProps> = ({
  articles,
  categories,
  onRefresh,
  onFlash,
  onPreviewArticle,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'hidden' | 'deleted'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Confirmation dialog
  const [targetArticle, setTargetArticle] = useState<Article | null>(null);
  const [dialogAction, setDialogAction] = useState<'hide' | 'restore' | 'soft_delete' | 'hard_delete' | null>(null);
  const [reason, setReason] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const filteredArticles = articles.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && a.categoryId !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q) ||
        (a.mediaName && a.mediaName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAction = (article: Article, action: 'hide' | 'restore' | 'soft_delete' | 'hard_delete') => {
    setTargetArticle(article);
    setDialogAction(action);
    setReason('');
  };

  const handleConfirmAction = async () => {
    if (!targetArticle || !dialogAction) return;
    setLoadingAction(true);
    try {
      if (dialogAction === 'hide') {
        await api.setAdminArticleStatus(targetArticle.id, 'hidden', reason || 'Contenu modéré par l’administration');
        onFlash(`L’article "${targetArticle.title}" a été masqué.`);
      } else if (dialogAction === 'restore') {
        await api.setAdminArticleStatus(targetArticle.id, 'published');
        onFlash(`L’article "${targetArticle.title}" est maintenant rétabli en ligne.`);
      } else if (dialogAction === 'soft_delete') {
        await api.setAdminArticleStatus(targetArticle.id, 'deleted', reason || 'Supprimé par l’administration');
        onFlash(`L’article "${targetArticle.title}" a été placé dans la corbeille.`);
      } else if (dialogAction === 'hard_delete') {
        await api.deleteAdminArticle(targetArticle.id, true);
        onFlash(`L’article "${targetArticle.title}" a été définitivement supprimé.`);
      }
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingAction(false);
      setTargetArticle(null);
      setDialogAction(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre, auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
              <option value="hidden">Masqués (Modérés)</option>
              <option value="deleted">Corbeille</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-gray-500">Rubrique :</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Toutes les rubriques</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Affichage de <strong className="text-gray-900">{filteredArticles.length}</strong> article(s)
        </span>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">
              <tr>
                <th className="py-3.5 px-4">Article</th>
                <th className="py-3.5 px-4">Rubrique</th>
                <th className="py-3.5 px-4">Auteur / Média</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-center">Interactions</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredArticles.map((a) => {
                const isHidden = a.status === 'hidden';
                const isDeleted = a.status === 'deleted';
                return (
                  <tr key={a.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        {a.coverImage ? (
                          <img
                            src={a.coverImage}
                            alt=""
                            className="w-12 h-10 rounded-lg object-cover shrink-0 border border-gray-100"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4
                            onClick={() => onPreviewArticle && onPreviewArticle(a)}
                            className="font-bold text-gray-900 text-sm hover:text-emerald-600 cursor-pointer line-clamp-1"
                            title={a.title}
                          >
                            {a.title}
                          </h4>
                          <span className="text-[11px] text-gray-400 line-clamp-1">
                            {a.summary || a.content.substring(0, 50)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {a.categoryName}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs">
                      <div className="font-semibold text-gray-800">{a.authorName}</div>
                      {a.mediaName && <div className="text-[11px] text-gray-500">{a.mediaName}</div>}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          a.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : a.status === 'draft'
                            ? 'bg-amber-50 text-amber-700'
                            : a.status === 'hidden'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {a.status === 'published'
                          ? 'Publié'
                          : a.status === 'draft'
                          ? 'Brouillon'
                          : a.status === 'hidden'
                          ? 'Masqué'
                          : 'Corbeille'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1" title="Lectures">
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                          {a.viewsCount || 0}
                        </span>
                        <span className="flex items-center gap-1" title="J'aime">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          {a.likesCount || 0}
                        </span>
                        <span className="flex items-center gap-1" title="Commentaires">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          {a.commentsCount || 0}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(a.publishedAt || a.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* Preview button */}
                        {onPreviewArticle && (
                          <button
                            onClick={() => onPreviewArticle(a)}
                            title="Aperçu de l’article"
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}

                        {/* Hide or Restore Button */}
                        {isHidden ? (
                          <button
                            onClick={() => handleOpenAction(a, 'restore')}
                            title="Rétablir l’article en ligne"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenAction(a, 'hide')}
                            title="Masquer l’article (modération)"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        {/* Soft delete / Hard delete */}
                        {isDeleted ? (
                          <button
                            onClick={() => handleOpenAction(a, 'hard_delete')}
                            title="Supprimer définitivement"
                            className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenAction(a, 'soft_delete')}
                            title="Mettre à la corbeille"
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!dialogAction && !!targetArticle}
        title={
          dialogAction === 'hide'
            ? 'Masquer cet article ?'
            : dialogAction === 'restore'
            ? 'Rétablir cet article en ligne ?'
            : dialogAction === 'soft_delete'
            ? 'Placer cet article dans la corbeille ?'
            : 'Supprimer définitivement cet article ?'
        }
        message={
          dialogAction === 'hide'
            ? `L’article "${targetArticle?.title}" ne sera plus visible du public ni des moteurs de recherche.`
            : dialogAction === 'restore'
            ? `L’article "${targetArticle?.title}" sera republié et accessible aux lecteurs.`
            : dialogAction === 'soft_delete'
            ? `L’article sera archivé dans la corbeille et masqué du flux d'actualités.`
            : `Attention : cette action est irréversible. L’article "${targetArticle?.title}", ainsi que tous ses commentaires et réactions, seront définitivement effacés.`
        }
        confirmLabel={loadingAction ? 'Traitement...' : 'Confirmer'}
        isDestructive={dialogAction !== 'restore'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setTargetArticle(null);
          setDialogAction(null);
        }}
      >
        {dialogAction === 'hide' && (
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Motif de modération (inscrit dans le journal d'audit) :
            </label>
            <input
              type="text"
              placeholder="Ex: Propos diffamatoires ou non vérifiés"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        )}
      </AdminConfirmDialog>
    </div>
  );
};
