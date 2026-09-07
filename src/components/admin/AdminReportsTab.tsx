import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  FileText,
  MessageSquare,
  User,
  Ban,
  Trash2,
  Eye,
} from 'lucide-react';
import { Report } from '../../types';
import { api } from '../../services/api';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminReportsTabProps {
  reports: Report[];
  onRefresh: () => void;
  onFlash: (msg: string) => void;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  reports,
  onRefresh,
  onFlash,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved' | 'dismissed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'article' | 'comment' | 'user'>('all');

  // Review Dialog State
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'dismissed' | 'reviewing'>('resolved');
  const [resolutionAction, setResolutionAction] = useState<'none' | 'hide_article' | 'delete_comment' | 'suspend_user'>('none');
  const [adminNotes, setAdminNotes] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.targetType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.reporterName.toLowerCase().includes(q) ||
        r.targetTitle.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openReviewModal = (report: Report) => {
    setActiveReport(report);
    setResolutionStatus('resolved');
    if (report.targetType === 'article') {
      setResolutionAction('hide_article');
    } else if (report.targetType === 'comment') {
      setResolutionAction('delete_comment');
    } else if (report.targetType === 'user') {
      setResolutionAction('suspend_user');
    } else {
      setResolutionAction('none');
    }
    setAdminNotes('');
  };

  const handleProcessReport = async () => {
    if (!activeReport) return;
    setLoadingAction(true);
    try {
      await api.processAdminReport(
        activeReport.id,
        resolutionStatus,
        resolutionAction === 'none' ? undefined : resolutionAction,
        adminNotes || undefined
      );
      onFlash(`Le signalement a été traité avec le statut: ${resolutionStatus}`);
      setActiveReport(null);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par motif, cible, auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-gray-500">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente ({reports.filter((r) => r.status === 'pending').length})</option>
              <option value="reviewing">En cours d'examen</option>
              <option value="resolved">Résolus (Sanctionnés)</option>
              <option value="dismissed">Rejetés / Sans suite</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-gray-500">Type :</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous les types</option>
              <option value="article">Articles</option>
              <option value="comment">Commentaires</option>
              <option value="user">Profils Utilisateur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          Aucun signalement ne correspond à vos filtres.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((r) => {
            const isPending = r.status === 'pending';
            const isResolved = r.status === 'resolved';
            const isDismissed = r.status === 'dismissed';

            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isPending
                    ? 'border-red-200 bg-red-50/10'
                    : isResolved
                    ? 'border-emerald-100'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      r.targetType === 'article'
                        ? 'bg-amber-100 text-amber-700'
                        : r.targetType === 'comment'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {r.targetType === 'article' ? (
                      <FileText className="w-5 h-5" />
                    ) : r.targetType === 'comment' ? (
                      <MessageSquare className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isPending
                            ? 'bg-red-100 text-red-700'
                            : isResolved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isPending ? 'En attente' : isResolved ? 'Résolu' : isDismissed ? 'Rejeté' : r.status}
                      </span>

                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        Signalé par <strong className="text-gray-800 font-semibold">{r.reporterName}</strong>
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 leading-snug">
                      Cible : {r.targetTitle}
                    </h4>

                    <div className="mt-2 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="font-bold text-red-700 block mb-0.5">Motif : {r.reason}</span>
                      {r.details && <p className="text-gray-600 italic leading-relaxed">"{r.details}"</p>}
                    </div>

                    {r.adminNotes && (
                      <p className="text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-lg mt-2 border border-emerald-100">
                        <strong>Action admin :</strong> {r.adminNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  <button
                    onClick={() => openReviewModal(r)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Examiner & Décider
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      {activeReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-gray-900">Modération du signalement</h3>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-500 block mb-1">Cible signalée :</span>
                <p className="font-semibold text-gray-900 text-sm mb-1">{activeReport.targetTitle}</p>
                <p className="text-red-700 font-bold">Motif : {activeReport.reason}</p>
                {activeReport.details && <p className="text-gray-600 mt-1 italic">"{activeReport.details}"</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Action immédiate à exécuter :</label>
                <div className="grid grid-cols-2 gap-2">
                  {activeReport.targetType === 'article' && (
                    <button
                      type="button"
                      onClick={() => setResolutionAction('hide_article')}
                      className={`p-2.5 rounded-xl text-left border transition ${
                        resolutionAction === 'hide_article'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Ban className="w-4 h-4 mb-1 text-amber-600" />
                      Masquer l'article
                    </button>
                  )}

                  {activeReport.targetType === 'comment' && (
                    <button
                      type="button"
                      onClick={() => setResolutionAction('delete_comment')}
                      className={`p-2.5 rounded-xl text-left border transition ${
                        resolutionAction === 'delete_comment'
                          ? 'border-red-500 bg-red-50 text-red-900 font-bold'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Trash2 className="w-4 h-4 mb-1 text-red-600" />
                      Supprimer le commentaire
                    </button>
                  )}

                  {activeReport.targetType === 'user' && (
                    <button
                      type="button"
                      onClick={() => setResolutionAction('suspend_user')}
                      className={`p-2.5 rounded-xl text-left border transition ${
                        resolutionAction === 'suspend_user'
                          ? 'border-red-500 bg-red-50 text-red-900 font-bold'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Ban className="w-4 h-4 mb-1 text-red-600" />
                      Suspendre le profil
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setResolutionAction('none')}
                    className={`p-2.5 rounded-xl text-left border transition ${
                      resolutionAction === 'none'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mb-1 text-emerald-600" />
                    Aucune action requise
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Statut final du dossier :</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('resolved')}
                    className={`py-2 text-center rounded-xl font-bold border transition ${
                      resolutionStatus === 'resolved'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    Résolu
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('dismissed')}
                    className={`py-2 text-center rounded-xl font-bold border transition ${
                      resolutionStatus === 'dismissed'
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    Rejeté (Sans suite)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('reviewing')}
                    className={`py-2 text-center rounded-xl font-bold border transition ${
                      resolutionStatus === 'reviewing'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    En cours
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Note administrative (visible dans l’audit) :
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ex: Contenu masqué suite à violation flagrante de l’article 12."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReport(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleProcessReport}
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-sm"
                >
                  {loadingAction ? 'Enregistrement...' : 'Enregistrer la décision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
