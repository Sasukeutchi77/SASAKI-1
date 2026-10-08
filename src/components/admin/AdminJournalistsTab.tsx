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
  UserMinus,
  ShieldAlert,
  Eye,
  Award,
} from 'lucide-react';
import { VerificationRequest, User } from '../../types';
import { api } from '../../services/api';
import { VerifiedBadge } from '../VerifiedBadge';
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'journalist' | 'citizen' | 'media'>('all');
  const [search, setSearch] = useState('');

  // Selected request for review
  const [activeRequest, setActiveRequest] = useState<VerificationRequest | null>(null);
  const [actionDecision, setActionDecision] = useState<'approved' | 'rejected' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Revocation of certification / journalist title
  const [revokeTarget, setRevokeTarget] = useState<User | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [loadingRevoke, setLoadingRevoke] = useState(false);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all') {
      const cat = r.category || 'journalist';
      if (cat !== categoryFilter) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        (r.mediaName && r.mediaName.toLowerCase().includes(q)) ||
        (r.pressCardNumber && r.pressCardNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const verifiedAccountsList = users.filter((u) => u.isVerified || u.role === 'journalist');

  const handleOpenReview = (request: VerificationRequest, decision: 'approved' | 'rejected') => {
    setActiveRequest(request);
    setActionDecision(decision);
    const isCitizen = request.category === 'citizen';
    setAdminNotes(
      decision === 'approved'
        ? isCitizen
          ? 'Identité citoyenne authentifiée conforme aux registres civiques PURGE.'
          : 'Carte de presse authentifiée conforme auprès des registres du CSC.'
        : isCitizen
        ? 'Dossier citoyen incomplet ou pièce justificative non vérifiable.'
        : 'Dossier incomplet ou références professionnelles non vérifiables.'
    );
  };

  const handleConfirmDecision = async () => {
    if (!activeRequest || !actionDecision) return;
    setLoadingAction(true);
    try {
      await api.processAdminVerification(activeRequest.id, actionDecision, adminNotes);
      const isCitizen = activeRequest.category === 'citizen';
      onFlash(
        `La demande de ${activeRequest.userName} (${isCitizen ? 'Citoyen Vérifié' : 'Journaliste de Presse'}) a été ${
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

  const handleToggleBadge = async (user: User) => {
    try {
      const next = !user.isVerified;
      const targetCategory = user.role === 'journalist' ? 'journalist' : 'citizen';
      await api.toggleAdminUserVerification(user.id, next, targetCategory);
      onFlash(`Badge officiel ${next ? 'attribué à' : 'retiré de'} ${user.name}`);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    }
  };

  const handleConfirmRevokeJournalist = async () => {
    if (!revokeTarget) return;
    setLoadingRevoke(true);
    try {
      await api.revokeJournalistRole(revokeTarget.id, revokeReason);
      onFlash(`Le titre de journaliste a été retiré avec succès à "${revokeTarget.name}".`);
      setRevokeTarget(null);
      setRevokeReason('');
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingRevoke(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub tabs switcher */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer font-mono ${
              subTab === 'requests'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(0,243,255,0.3)]'
                : 'bg-[#141933] text-cyan-400/70 hover:text-white border border-cyan-500/30'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Demandes de certification ({requests.filter((r) => r.status === 'pending').length} en attente)
          </button>
          <button
            onClick={() => setSubTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer font-mono ${
              subTab === 'directory'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(0,243,255,0.3)]'
                : 'bg-[#141933] text-cyan-400/70 hover:text-white border border-cyan-500/30'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Répertoire des Comptes Certifiés ({verifiedAccountsList.length})
          </button>
        </div>
      </div>

      {subTab === 'requests' ? (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-[#101428] p-4 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,243,255,0.05)] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-cyan-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par candidat, email, média..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#141933] border border-cyan-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-semibold text-cyan-400/70 font-mono">Catégorie :</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="bg-[#141933] border border-cyan-500/40 text-xs rounded-xl px-3 py-1.5 text-cyan-200 font-medium focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">Toutes les catégories</option>
                  <option value="journalist">✍️ Journalistes (Presse)</option>
                  <option value="citizen">🛡️ Citoyens Vérifiés</option>
                  <option value="media">🏛️ Maisons de Presse</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-semibold text-cyan-400/70 font-mono">Statut :</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[#141933] border border-cyan-500/40 text-xs rounded-xl px-3 py-1.5 text-cyan-200 font-medium focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente d’examen</option>
                  <option value="approved">Approuvées</option>
                  <option value="rejected">Rejetées</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center bg-[#101428] rounded-2xl border border-cyan-500/30 text-cyan-400/60 text-sm font-mono">
              Aucune demande de certification correspondant aux critères.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isCitizen = req.category === 'citizen';
                return (
                  <div
                    key={req.id}
                    className={`bg-[#101428] rounded-2xl border p-5 transition flex flex-col justify-between ${
                      isPending
                        ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                        : req.status === 'approved'
                        ? 'border-emerald-500/40'
                        : 'border-cyan-500/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-base">{req.userName}</h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
                                isCitizen
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                  : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                              }`}
                            >
                              {isCitizen ? '🛡️ Citoyen Vérifié' : '✍️ Presse / Journaliste'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                  : req.status === 'rejected'
                                  ? 'bg-red-500/20 text-red-300 border border-red-400/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse'
                              }`}
                            >
                              {req.status === 'approved'
                                ? 'Approuvée'
                                : req.status === 'rejected'
                                ? 'Rejetée'
                                : 'En attente'}
                            </span>
                          </div>
                          <p className="text-xs text-cyan-400/60 mt-0.5">{req.userEmail}</p>
                        </div>

                        <span className="text-[11px] text-cyan-400/60 font-mono">
                          {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>

                      <div className="space-y-2 py-3 border-y border-cyan-500/20 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-cyan-400/60">{isCitizen ? 'Statut civique :' : 'Média de rattachement :'}</span>
                          <strong className="text-white font-semibold">{req.mediaName || (isCitizen ? 'Citoyen Indépendant' : 'Indépendant')}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-cyan-400/60">{isCitizen ? 'Référence :' : 'Carte de presse :'}</span>
                          <code className="font-mono bg-[#141933] border border-cyan-500/30 px-2 py-0.5 rounded text-cyan-300 font-bold">
                            {req.pressCardNumber}
                          </code>
                        </div>
                        <div className="mt-2 text-slate-200 bg-[#141933] p-3 rounded-xl border border-cyan-500/20">
                          <span className="font-bold text-cyan-300 block mb-1">Motivation & Engagement :</span>
                          <p className="italic text-xs leading-relaxed">"{req.motivation}"</p>
                        </div>

                        {req.documentUrl ? (
                          <div className="flex items-center gap-2 pt-1">
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <a
                              href={req.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-cyan-300 underline truncate hover:text-cyan-200"
                            >
                              Justificatif : {req.documentUrl}
                            </a>
                          </div>
                        ) : null}

                        {req.adminNotes && (
                          <div className="mt-2 text-xs bg-amber-950/50 border border-amber-500/30 p-2.5 rounded-xl text-amber-200">
                            <strong className="block text-amber-300 font-bold mb-0.5 font-mono">Note administrative :</strong>
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
                            className="px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-950/60 border border-red-500/40 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-mono"
                          >
                            <X className="w-3.5 h-3.5" />
                            Rejeter
                          </button>
                          <button
                            onClick={() => handleOpenReview(req, 'approved')}
                            className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,243,255,0.25)] cursor-pointer font-mono ${
                              isCitizen
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isCitizen ? 'Valider la Certification Citoyenne' : 'Valider l’Accréditation Presse'}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-cyan-400/60 italic font-mono">
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
        /* Verified Accounts Directory */
        <div className="bg-[#101428] rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,243,255,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#141933] border-b border-cyan-500/20 text-xs font-mono text-cyan-300 uppercase">
                <tr>
                  <th className="py-3.5 px-4">Titulaire</th>
                  <th className="py-3.5 px-4">Catégorie</th>
                  <th className="py-3.5 px-4">Affiliation / Statut</th>
                  <th className="py-3.5 px-4">Abonnés</th>
                  <th className="py-3.5 px-4">Badge Actif</th>
                  <th className="py-3.5 px-4">Enquêtes</th>
                  <th className="py-3.5 px-4 text-right">Actions Administrateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {verifiedAccountsList.map((j) => {
                  const isCitizen = j.verificationCategory === 'citizen' || (j.isVerified && j.role !== 'journalist' && j.role !== 'admin');
                  const isJournalist = j.role === 'journalist' || j.verificationCategory === 'journalist';
                  return (
                    <tr key={j.id} className="hover:bg-[#141933]/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              j.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(j.name)}&background=06b6d4&color=fff`
                            }
                            alt={j.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-cyan-500/40 shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{j.name}</span>
                              {j.isVerified && (
                                <VerifiedBadge
                                  size="xs"
                                  type={isCitizen ? 'citizen' : isJournalist ? 'journalist' : 'admin'}
                                />
                              )}
                            </div>
                            <div className="text-xs text-cyan-400/60">{j.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border ${
                            j.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                              : isCitizen
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                          }`}
                        >
                          {j.role === 'admin'
                            ? 'Admin Officiel'
                            : isCitizen
                            ? '🛡️ Citoyen Vérifié'
                            : '✍️ Journaliste Titulaire'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs font-semibold text-slate-300">
                        {j.mediaName || (isCitizen ? 'Citoyen Indépendant' : 'Indépendant')}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-xs font-mono font-bold text-white">
                          {j.followersCount || 0} abonnés
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            j.isVerified
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {j.isVerified ? (
                            <>
                              <VerifiedBadge
                                size="xs"
                                type={isCitizen ? 'citizen' : 'journalist'}
                              />
                              <span>Certifié</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Non vérifié</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs font-mono font-bold text-white">
                        {j.articlesCount || 0}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleBadge(j)}
                            title="L'administrateur peut accorder ou révoquer la certification officielle"
                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer font-mono ${
                              j.isVerified
                                ? 'bg-red-950/60 text-red-300 border-red-500/40 hover:bg-red-900/60'
                                : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/60'
                            }`}
                          >
                            {j.isVerified ? 'Révoquer le badge' : 'Accorder le badge'}
                          </button>

                          {j.role === 'journalist' && (
                            <button
                              onClick={() => {
                                setRevokeTarget(j);
                                setRevokeReason('Décision administrative ou non-respect de la charte déontologique.');
                              }}
                              title="Rétrograder au statut de simple citoyen"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-500/40 bg-red-950/60 text-red-300 hover:bg-red-900/60 flex items-center gap-1 transition cursor-pointer font-mono"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Rétrograder</span>
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
      )}

      {/* Certification Review Dialog */}
      <AdminConfirmDialog
        isOpen={!!activeRequest && !!actionDecision}
        title={
          actionDecision === 'approved'
            ? `Valider la certification de ${activeRequest?.userName} ?`
            : `Rejeter la demande de ${activeRequest?.userName} ?`
        }
        message={
          actionDecision === 'approved'
            ? activeRequest?.category === 'citizen'
              ? `Cette action valide l'identité citoyenne officielle de ${activeRequest?.userName} et lui attribue le badge vert officiel de Citoyen Vérifié.`
              : `Cette action attribue immédiatement le rôle JOURNALISTE et le badge officiel de vérification de presse à cet utilisateur, lui permettant de publier des articles.`
            : `Cette action notifiera l'utilisateur du refus de sa candidature. Vous pouvez préciser le motif d'ajournement ci-dessous.`
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
          <label className="block text-xs font-bold text-cyan-300 mb-1 font-mono">
            Note / Justification administrative officielle :
          </label>
          <textarea
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-3 py-2 bg-[#141933] border border-cyan-500/40 rounded-xl text-xs text-white focus:border-cyan-400 focus:outline-none resize-none font-mono"
            placeholder="Ex: Identité et justificatifs authentifiés auprès des registres officiels."
          />
        </div>
      </AdminConfirmDialog>

      {/* Revoke Journalist Title Dialog */}
      <AdminConfirmDialog
        isOpen={!!revokeTarget}
        title={`Retirer le titre de journaliste à ${revokeTarget?.name} ?`}
        message={`Cette action rétrograde immédiatement l'utilisateur au rang de citoyen. Il perdra le badge de presse officiel, sera retiré de sa maison de journalistes et n'aura plus les permissions de rédiger des articles officiels.`}
        confirmLabel={loadingRevoke ? 'Révocation...' : 'Confirmer le retrait du titre'}
        isDestructive={true}
        onConfirm={handleConfirmRevokeJournalist}
        onCancel={() => {
          setRevokeTarget(null);
          setRevokeReason('');
        }}
      >
        <div className="pt-2">
          <label className="block text-xs font-bold text-cyan-300 mb-1 font-mono">
            Motif de la rétrogradation (notifié à l'utilisateur) :
          </label>
          <textarea
            rows={3}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            className="w-full px-3 py-2 bg-[#141933] border border-red-500/40 rounded-xl text-xs text-white focus:border-red-400 focus:outline-none resize-none font-mono"
            placeholder="Ex: Non-respect de la charte de vérification des faits..."
          />
        </div>
      </AdminConfirmDialog>
    </div>
  );
};
