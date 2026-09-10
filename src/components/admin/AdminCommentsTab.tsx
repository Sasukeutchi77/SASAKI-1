import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Ban,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Heart,
  FileText,
} from 'lucide-react';
import { Comment } from '../../types';
import { api } from '../../services/api';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminCommentsTabProps {
  onFlash: (msg: string) => void;
}

export const AdminCommentsTab: React.FC<AdminCommentsTabProps> = ({ onFlash }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [reportedOnly, setReportedOnly] = useState(false);

  // Dialog state
  const [targetComment, setTargetComment] = useState<Comment | null>(null);
  const [dialogAction, setDialogAction] = useState<'hide' | 'restore' | 'delete' | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminComments({
        q: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        reportedOnly: reportedOnly || undefined,
      });
      setComments(res.comments);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [statusFilter, reportedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComments();
  };

  const handleOpenAction = (comment: Comment, action: 'hide' | 'restore' | 'delete') => {
    setTargetComment(comment);
    setDialogAction(action);
    setReason('');
  };

  const handleConfirmAction = async () => {
    if (!targetComment || !dialogAction) return;
    setActionLoading(true);
    try {
      if (dialogAction === 'hide') {
        await api.setAdminCommentStatus(targetComment.id, 'hidden', reason || 'Propos inappropriés');
        onFlash('Le commentaire a été masqué.');
      } else if (dialogAction === 'restore') {
        await api.setAdminCommentStatus(targetComment.id, 'active');
        onFlash('Le commentaire a été rétabli.');
      } else if (dialogAction === 'delete') {
        await api.deleteAdminComment(targetComment.id);
        onFlash('Le commentaire a été définitivement supprimé.');
      }
      fetchComments();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setActionLoading(false);
      setTargetComment(null);
      setDialogAction(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher dans les commentaires..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-gray-500">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous les commentaires</option>
              <option value="active">Actifs</option>
              <option value="hidden">Masqués (Modérés)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 shrink-0 transition">
            <input
              type="checkbox"
              checked={reportedOnly}
              onChange={(e) => setReportedOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-red-600 rounded border-gray-300 focus:ring-red-500"
            />
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Signalés uniquement
          </label>
        </div>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Affichage de <strong className="text-gray-900">{comments.length}</strong> commentaire(s)
        </span>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          Chargement des commentaires...
        </div>
      ) : comments.length === 0 ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          Aucun commentaire trouvé avec ces filtres.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isHidden = c.status === 'hidden';
            const displayName = c.authorName || c.userName || 'Utilisateur';
            const displayAvatar = c.authorAvatar || c.userAvatar;
            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isHidden ? 'bg-red-50/20 border-red-200' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <img
                    src={
                      displayAvatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=059669&color=fff`
                    }
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">{displayName}</span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isHidden && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700">
                          Masqué
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed break-words bg-gray-50/60 p-2.5 rounded-xl border border-gray-100">
                      {c.content}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {c.likesCount || 0}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[11px] text-gray-400">Article ID : {c.articleId}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                  {isHidden ? (
                    <button
                      onClick={() => handleOpenAction(c, 'restore')}
                      title="Rétablir le commentaire"
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAction(c, 'hide')}
                      title="Masquer le commentaire"
                      className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenAction(c, 'delete')}
                    title="Supprimer définitivement"
                    className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!dialogAction && !!targetComment}
        title={
          dialogAction === 'hide'
            ? 'Masquer ce commentaire ?'
            : dialogAction === 'restore'
            ? 'Rétablir ce commentaire ?'
            : 'Supprimer définitivement ce commentaire ?'
        }
        message={
          dialogAction === 'hide'
            ? 'Le commentaire ne sera plus visible sur l’article mais restera archivé.'
            : dialogAction === 'restore'
            ? 'Le commentaire sera à nouveau affiché publiquement sur l’article.'
            : 'Attention : cette action est irréversible et supprimera le commentaire ainsi que ses réponses éventuelles.'
        }
        confirmLabel={actionLoading ? 'Traitement...' : 'Confirmer'}
        isDestructive={dialogAction !== 'restore'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setTargetComment(null);
          setDialogAction(null);
        }}
      >
        {dialogAction === 'hide' && (
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Motif de modération :</label>
            <input
              type="text"
              placeholder="Ex: Propos haineux, spam, etc."
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
