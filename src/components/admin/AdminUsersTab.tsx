import React, { useState } from 'react';
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  Ban,
  RotateCcw,
  Edit2,
  Calendar,
  FileText,
  Filter,
  Crown,
  UserCheck,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { api } from '../../services/api';
import { AdminConfirmDialog } from './AdminConfirmDialog';

const MASTER_ACCOUNTS = ['astaimperial45t@gmail.com', 'direction.purge@gmail.com'];

interface AdminUsersTabProps {
  users: (User & { articlesCount: number })[];
  onRefresh: () => void;
  onFlash: (msg: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onRefresh,
  onFlash,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'reader' | 'journalist' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Confirmation dialog state
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<'status' | 'role' | 'verify' | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('reader');
  const [actionReason, setActionReason] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all') {
      if (roleFilter === 'reader' && u.role !== 'reader' && u.role !== 'user') return false;
      if (roleFilter !== 'reader' && u.role !== roleFilter) return false;
    }
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.mediaName && u.mediaName.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenStatusDialog = (user: User) => {
    setTargetUser(user);
    setDialogType('status');
    setActionReason('');
  };

  const handleOpenRoleDialog = (user: User) => {
    setTargetUser(user);
    setDialogType('role');
    setSelectedRole(user.role);
    setActionReason('');
  };

  const handleOpenVerifyDialog = (user: User) => {
    setTargetUser(user);
    setDialogType('verify');
    setActionReason('');
  };

  const handleConfirmAction = async () => {
    if (!targetUser || !dialogType) return;
    setLoadingAction(true);
    try {
      if (dialogType === 'status') {
        const nextStatus = targetUser.status === 'active' ? 'suspended' : 'active';
        await api.setAdminUserStatus(targetUser.id, nextStatus, actionReason);
        onFlash(`Le compte de ${targetUser.name} est désormais ${nextStatus === 'suspended' ? 'suspendu' : 'actif'}.`);
      } else if (dialogType === 'role') {
        await api.setAdminUserRole(targetUser.id, selectedRole);
        onFlash(`Le rôle de ${targetUser.name} a été changé en "${selectedRole}".`);
      } else if (dialogType === 'verify') {
        const nextVerify = !targetUser.isVerified;
        await api.toggleAdminUserVerification(targetUser.id, nextVerify);
        onFlash(`Badge de vérification ${nextVerify ? 'attribué à' : 'retiré de'} ${targetUser.name}.`);
      }
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingAction(false);
      setTargetUser(null);
      setDialogType(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, média..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">Rôle :</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous les rôles</option>
              <option value="reader">Lecteurs / Utilisateurs</option>
              <option value="journalist">Journalistes</option>
              <option value="admin">Administrateurs</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-gray-500">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Count Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Affichage de <strong className="text-gray-900">{filteredUsers.length}</strong> utilisateur(s) sur{' '}
          {users.length}
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Utilisateur</th>
                <th className="py-3.5 px-4">Rôle</th>
                <th className="py-3.5 px-4">Média / Organe</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Articles</th>
                <th className="py-3.5 px-4">Inscription</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => {
                const isSuspended = u.status === 'suspended';
                return (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=059669&color=fff`
                          }
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                            <span className="truncate">{u.name}</span>
                            {u.isVerified && (
                              <CheckCircle2
                                className="w-4 h-4 text-blue-500 shrink-0"
                                title="Badge officiel CSC / Vérifié"
                              />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{u.email}</div>
                          {u.phone && <div className="text-[11px] text-gray-400">{u.phone}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {MASTER_ACCOUNTS.includes(u.email?.toLowerCase()) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          <Crown className="w-3 h-3 text-amber-600" />
                          Compte Principal
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : u.role === 'journalist'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {u.role === 'admin' ? 'Admin' : u.role === 'journalist' ? 'Journaliste' : 'Lecteur'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-gray-600">
                      {u.mediaName ? (
                        <span className="font-semibold text-gray-800">{u.mediaName}</span>
                      ) : (
                        <span className="text-gray-400 italic">Indépendant</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isSuspended ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-red-500' : 'bg-emerald-500'}`}
                        />
                        {isSuspended ? 'Suspendu' : 'Actif'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs font-semibold text-gray-700">
                      {u.articlesCount || 0}
                    </td>

                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {MASTER_ACCOUNTS.includes(u.email?.toLowerCase()) ? (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                          Accès Super Admin Protégé
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Accreditation Button for Readers */}
                          {u.role !== 'journalist' && u.role !== 'admin' && (
                            <button
                              onClick={() => {
                                setTargetUser(u);
                                setSelectedRole('journalist');
                                setDialogType('role');
                                setActionReason('Accréditation officielle selon le protocole anti-désinformation');
                              }}
                              title="Accréditer comme Journaliste officiel"
                              className="px-2 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-300 text-xs font-bold flex items-center gap-1 transition shadow-xs"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Accréditer</span>
                            </button>
                          )}

                          {/* Toggle Verification Badge */}
                          <button
                            onClick={() => handleOpenVerifyDialog(u)}
                            title={u.isVerified ? 'Révoquer le badge officiel' : 'Attribuer le badge officiel'}
                            className={`p-1.5 rounded-lg border transition ${
                              u.isVerified
                                ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          {/* Change Role Button */}
                          <button
                            onClick={() => handleOpenRoleDialog(u)}
                            title="Modifier le rôle"
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition"
                          >
                            <Shield className="w-4 h-4" />
                          </button>

                          {/* Suspend / Reactivate Button */}
                          <button
                            onClick={() => handleOpenStatusDialog(u)}
                            title={isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                            className={`p-1.5 rounded-lg border transition ${
                              isSuspended
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {isSuspended ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
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
        isOpen={!!dialogType && !!targetUser}
        title={
          dialogType === 'status'
            ? targetUser?.status === 'active'
              ? 'Suspendre ce compte ?'
              : 'Réactiver ce compte ?'
            : dialogType === 'role'
            ? 'Modifier les permissions et le rôle'
            : targetUser?.isVerified
            ? 'Révoquer le badge de vérification ?'
            : 'Accorder le badge de vérification ?'
        }
        message={
          dialogType === 'status'
            ? targetUser?.status === 'active'
              ? `Le compte de ${targetUser?.name} ne pourra plus se connecter, publier ou commenter jusqu’à réactivation.`
              : `Le compte de ${targetUser?.name} retrouvera immédiatement ses accès.`
            : dialogType === 'role'
            ? `Sélectionnez le niveau d’accès pour ${targetUser?.name}. Cette action sera consignée dans le journal d’audit.`
            : targetUser?.isVerified
            ? `Êtes-vous sûr de vouloir retirer le badge de certification CSC pour ${targetUser?.name} ?`
            : `Confirmez l'attribution du badge officiel de journaliste certifié pour ${targetUser?.name}.`
        }
        confirmLabel={loadingAction ? 'Traitement...' : 'Confirmer l’action'}
        isDestructive={
          dialogType === 'status'
            ? targetUser?.status === 'active'
            : dialogType === 'verify'
            ? !!targetUser?.isVerified
            : false
        }
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setTargetUser(null);
          setDialogType(null);
        }}
      >
        {dialogType === 'role' && (
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-gray-700">Nouveau rôle :</label>
            <div className="grid grid-cols-3 gap-2">
              {(['reader', 'journalist', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition border ${
                    selectedRole === r
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {r === 'reader' ? 'Lecteur' : r === 'journalist' ? 'Journaliste' : 'Admin'}
                </button>
              ))}
            </div>

            {selectedRole === 'journalist' && (
              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-900 leading-relaxed">
                <strong>Protocole Anti-Désinformation :</strong> En accréditant ce compte au statut de Journaliste, vous lui donnez l'autorisation de fonder ou d'intégrer une Maison de Journalistes (quota strict de 5 journalistes maximum par maison).
              </div>
            )}
          </div>
        )}

        {dialogType === 'status' && targetUser?.status === 'active' && (
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Motif de suspension (optionnel) :</label>
            <input
              type="text"
              placeholder="Ex: Non-respect de la charte éditoriale"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        )}
      </AdminConfirmDialog>
    </div>
  );
};
