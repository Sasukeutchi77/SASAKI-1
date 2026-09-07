import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  Filter,
  FileCheck,
  Check,
  X,
  AlertCircle,
  Building2,
  UserCheck,
} from 'lucide-react';
import { VerificationRequest, User } from '../../types';
import { api } from '../../services/api';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminJournalistsTabProps {
  requests: VerificationRequest[];
  users: (User & { articlesCount: number })[];
  onRefresh: () => void;
  onFlash: (msg: string) => void;
}

export const AdminJournalistsTab: React.FC<AdminJournalistsTabProps> = ({
  requests,
  users,
  onRefresh,
  onFlash,
}) => {
  const [subTab, setSubTab] = useState<'requests' | 'directory'>('requests');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  // Selected request for review
  const [activeRequest, setActiveRequest] = useState<VerificationRequest | null>(null);
  const [actionDecision, setActionDecision] = useState<'approved' | 'rejected' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.mediaName.toLowerCase().includes(q) ||
        r.pressCardNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const journalistsList = users.filter((u) => u.role === 'journalist' || u.isVerified);

  const handleOpenReview = (request: VerificationRequest, decision: 'approved' | 'rejected') => {
    setActiveRequest(request);
    setActionDecision(decision);
    setAdminNotes(
      decision === 'approved'
        ? 'Carte de presse authentifiée conforme auprès des registres du CSC.'
        : 'Dossier incomplet ou numéro de carte non vérifiable.'
    );
  };

  const handleConfirmDecision = async () => {
    if (!activeRequest || !actionDecision) return;
    setLoadingAction(true);
    try {
      await api.processAdminVerification(activeRequest.id, actionDecision, adminNotes);
      onFlash(
        `La demande de ${activeRequest.userName} a été ${
          actionDecision === 'approved' ? 'approuvée (badge officiel accordé)' : 'rejetée'
        }.`
      );
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingAction(false);
      setActiveRequest(null);
      setActionDecision(null);
    }
  };

  const handleToggleJournalistBadge = async (user: User) => {
    try {
      const next = !user.isVerified;
      await api.toggleAdminUserVerification(user.id, next);
      onFlash(`Badge officiel ${next ? 'attribué à' : 'retiré de'} ${user.name}`);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub tabs switcher */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              subTab === 'requests'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Demandes d’accréditation ({requests.filter((r) => r.status === 'pending').length} en attente)
          </button>
          <button
            onClick={() => setSubTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              subTab === 'directory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Annuaire des Journalistes ({journalistsList.length})
          </button>
        </div>
      </div>

      {subTab === 'requests' ? (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par journaliste, carte, média..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Statut :</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Toutes les demandes</option>
                <option value="pending">En attente d’examen</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Rejetées</option>
              </select>
            </div>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
              Aucune demande d’accréditation correspondant aux critères.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'pending';
                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between ${
                      isPending
                        ? 'border-amber-200 shadow-xs ring-1 ring-amber-100'
                        : req.status === 'approved'
                        ? 'border-emerald-100'
                        : 'border-gray-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-base">{req.userName}</h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                req.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : req.status === 'rejected'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700 animate-pulse'
                              }`}
                            >
                              {req.status === 'approved'
                                ? 'Approuvée'
                                : req.status === 'rejected'
                                ? 'Rejetée'
                                : 'En attente'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{req.userEmail}</p>
                        </div>

                        <span className="text-[11px] text-gray-400">
                          {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>

                      <div className="space-y-2 py-3 border-y border-gray-50 text-xs">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500">Média de rattachement :</span>
                          <strong className="text-gray-900 font-semibold">{req.mediaName}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-gray-500">Carte de presse :</span>
                          <code className="font-mono bg-gray-100 px-2 py-0.5 rounded font-bold text-emerald-800">
                            {req.pressCardNumber}
                          </code>
                        </div>
                        <div className="mt-2 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="font-bold text-gray-700 block mb-1">Motivation professionnelle :</span>
                          <p className="italic text-xs leading-relaxed">"{req.motivation}"</p>
                        </div>

                        {req.adminNotes && (
                          <div className="mt-2 text-xs bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl text-amber-900">
                            <strong className="block text-amber-800 font-bold mb-0.5">Note administrative :</strong>
                            {req.adminNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 flex items-center justify-end gap-2">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleOpenReview(req, 'rejected')}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            Rejeter
                          </button>
                          <button
                            onClick={() => handleOpenReview(req, 'approved')}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Valider l’accréditation
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Traité le{' '}
                          {req.reviewedAt
                            ? new Date(req.reviewedAt).toLocaleDateString('fr-FR')
                            : 'récemment'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Journalists Directory */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="py-3 px-4">Journaliste</th>
                  <th className="py-3 px-4">Média</th>
                  <th className="py-3 px-4">Badge Officiel</th>
                  <th className="py-3 px-4">Articles</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {journalistsList.map((j) => (
                  <tr key={j.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            j.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(j.name)}&background=059669&color=fff`
                          }
                          alt={j.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                            {j.name}
                            {j.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="text-xs text-gray-500">{j.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs font-semibold text-gray-800">
                      {j.mediaName || 'Indépendant'}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          j.isVerified ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {j.isVerified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs font-bold text-gray-900">
                      {j.articlesCount || 0}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleJournalistBadge(j)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                          j.isVerified
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        {j.isVerified ? 'Révoquer le badge' : 'Accorder le badge'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accreditation Review Dialog */}
      <AdminConfirmDialog
        isOpen={!!activeRequest && !!actionDecision}
        title={
          actionDecision === 'approved'
            ? `Valider l’accréditation de ${activeRequest?.userName} ?`
            : `Rejeter la demande de ${activeRequest?.userName} ?`
        }
        message={
          actionDecision === 'approved'
            ? `Cette action attribue immédiatement le rôle JOURNALISTE et le badge officiel de vérification CSC à cet utilisateur.`
            : `Cette action notifiera l'utilisateur du refus. Vous pouvez préciser le motif ci-dessous.`
        }
        confirmLabel={loadingAction ? 'Enregistrement...' : 'Confirmer la décision'}
        isDestructive={actionDecision === 'rejected'}
        onConfirm={handleConfirmDecision}
        onCancel={() => {
          setActiveRequest(null);
          setActionDecision(null);
        }}
      >
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Note / Justification administrative :
          </label>
          <textarea
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            placeholder="Ex: Numéro CSC authentifié auprès de la commission."
          />
        </div>
      </AdminConfirmDialog>
    </div>
  );
};
