import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Search,
  Plus,
  Edit2,
  Ban,
  RotateCcw,
  Globe,
  Mail,
  Phone,
  MapPin,
  Users,
  FileText,
  Trash2,
} from 'lucide-react';
import { MediaHouse } from '../../types';
import { api } from '../../services/api';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminMediaTabProps {
  mediaHouses: MediaHouse[];
  onRefresh: () => void;
  onFlash: (msg: string) => void;
}

export const AdminMediaTab: React.FC<AdminMediaTabProps> = ({
  mediaHouses,
  onRefresh,
  onFlash,
}) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaHouse | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [logo, setLogo] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  // Suspension confirmation
  const [targetMedia, setTargetMedia] = useState<MediaHouse | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Deletion of media house
  const [mediaToDelete, setMediaToDelete] = useState<MediaHouse | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);

  const filteredMedia = mediaHouses.filter((m) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        (m.ownerName && m.ownerName.toLowerCase().includes(q)) ||
        (m.licenseNumber && m.licenseNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingMedia(null);
    setName('');
    setSlug('');
    setDescription('');
    setOwnerName('');
    setLogo('');
    setCoverImage('');
    setWebsite('');
    setEmail('');
    setPhone('');
    setAddress('');
    setLicenseNumber('');
    setIsVerified(false);
    setShowModal(true);
  };

  const openEditModal = (m: MediaHouse) => {
    setEditingMedia(m);
    setName(m.name);
    setSlug(m.slug);
    setDescription(m.description || '');
    setOwnerName(m.ownerName || '');
    setLogo(m.logo || '');
    setCoverImage(m.coverImage || '');
    setWebsite(m.website || '');
    setEmail(m.email || '');
    setPhone(m.phone || '');
    setAddress(m.address || '');
    setLicenseNumber(m.licenseNumber || '');
    setIsVerified(m.isVerified);
    setShowModal(true);
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onFlash('Le nom du média est obligatoire.');
      return;
    }
    setLoadingAction(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: description.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        logo: logo.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        website: website.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        isVerified,
      };

      if (editingMedia) {
        await api.updateAdminMedia(editingMedia.id, payload);
        onFlash(`Maison de presse "${name}" mise à jour avec succès.`);
      } else {
        await api.createAdminMedia(payload);
        onFlash(`Maison de presse "${name}" créée avec succès.`);
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleVerification = async (m: MediaHouse) => {
    try {
      const next = !m.isVerified;
      await api.toggleAdminMediaVerification(m.id, next);
      onFlash(`Badge officiel ${next ? 'attribué à' : 'retiré de'} "${m.name}".`);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    }
  };

  const handleConfirmSuspension = async () => {
    if (!targetMedia) return;
    setLoadingAction(true);
    try {
      const nextStatus = targetMedia.status === 'active' ? 'suspended' : 'active';
      await api.setAdminMediaStatus(targetMedia.id, nextStatus, suspendReason);
      onFlash(`Le média "${targetMedia.name}" est désormais ${nextStatus === 'suspended' ? 'suspendu' : 'actif'}.`);
      setTargetMedia(null);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    setLoadingDelete(true);
    try {
      await api.deleteAdminMedia(mediaToDelete.id, deleteReason);
      onFlash(`La maison de journalistes "${mediaToDelete.name}" a été définitivement supprimée.`);
      setMediaToDelete(null);
      setDeleteReason('');
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une rédaction, agrément..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Enregistrer un Média / Rédaction
        </button>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMedia.map((m) => {
          const isSuspended = m.status === 'suspended';
          return (
            <div
              key={m.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition flex flex-col justify-between ${
                isSuspended ? 'border-red-200 bg-red-50/20' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        m.logo ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=7C3AED&color=fff`
                      }
                      alt={m.name}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                        {m.name}
                        {m.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                      </h4>
                      <p className="text-xs text-gray-500">@{m.slug}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isSuspended ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isSuspended ? 'Suspendu' : 'Actif'}
                  </span>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                  {m.description || 'Organe de presse indépendant certifié sur purge-info.'}
                </p>

                <div className="space-y-1.5 pt-3 border-t border-gray-50 text-xs text-gray-500">
                  {m.ownerName && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Directeur :</span>
                      <strong className="text-gray-800 font-medium">{m.ownerName}</strong>
                    </div>
                  )}
                  {m.licenseNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Agrément CSC :</span>
                      <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
                        {m.licenseNumber}
                      </code>
                    </div>
                  )}
                  {m.website && (
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <a
                        href={m.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline truncate"
                      >
                        {m.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Counters */}
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <span className="block text-gray-400 text-[11px]">Journalistes</span>
                    <strong className="text-gray-900 font-bold">{m.journalistsCount || 0}</strong>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <span className="block text-gray-400 text-[11px]">Articles</span>
                    <strong className="text-gray-900 font-bold">{m.articlesCount || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleToggleVerification(m)}
                  title={m.isVerified ? 'Révoquer le badge officiel' : 'Attribuer le badge officiel'}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                    m.isVerified
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:text-blue-600'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {m.isVerified ? 'Certifié' : 'Certifier'}
                </button>

                <button
                  onClick={() => openEditModal(m)}
                  title="Modifier"
                  className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setTargetMedia(m);
                    setSuspendReason('');
                  }}
                  title={isSuspended ? 'Réactiver le média' : 'Suspendre le média'}
                  className={`p-1.5 rounded-lg border transition ${
                    isSuspended
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {isSuspended ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => {
                    setMediaToDelete(m);
                    setDeleteReason('Suppression administrative par le compte principal.');
                  }}
                  title="Supprimer définitivement la maison de journalistes"
                  className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">
                  {editingMedia ? 'Modifier la rédaction' : 'Nouvelle maison de presse'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMedia} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nom du média *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Le Faso Quotidien"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Identifiant (slug)</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="Ex: le-faso-quotidien"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Description / Ligne éditoriale</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Présentation générale du média..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Directeur de publication</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Nom du responsable"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">N° Agrément CSC</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="Ex: CSC/REC-2024-009"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">URL du Logo</label>
                    <input
                      type="url"
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">URL Image de couverture</label>
                    <input
                      type="url"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Site Web</label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Rédaction</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+226 ..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="mediaVerified"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="mediaVerified" className="text-xs font-semibold text-gray-700">
                    Attribuer d'emblée le badge officiel certifié CSC
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loadingAction}
                    className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
                  >
                    {loadingAction ? 'Enregistrement...' : editingMedia ? 'Mettre à jour' : 'Créer le média'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Suspension Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!targetMedia}
        title={targetMedia?.status === 'active' ? 'Suspendre ce média ?' : 'Réactiver ce média ?'}
        message={
          targetMedia?.status === 'active'
            ? `La suspension du média "${targetMedia?.name}" désactivera sa visibilité publique et empêchera la parution de nouveaux articles sous cette enseigne.`
            : `La réactivation du média "${targetMedia?.name}" rétablira ses parutions et son affiliation.`
        }
        confirmLabel={loadingAction ? 'Traitement...' : 'Confirmer le changement de statut'}
        isDestructive={targetMedia?.status === 'active'}
        onConfirm={handleConfirmSuspension}
        onCancel={() => setTargetMedia(null)}
      >
        {targetMedia?.status === 'active' && (
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Motif de suspension :</label>
            <input
              type="text"
              placeholder="Ex: Sanction CSC ou notification officielle"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        )}
      </AdminConfirmDialog>

      {/* Deletion Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!mediaToDelete}
        title={`Supprimer la maison de journalistes "${mediaToDelete?.name}" ?`}
        message={`Cette action est irréversible : la maison de presse sera immédiatement détruite et supprimée de l'annuaire. Tous ses journalistes membres (${mediaToDelete?.journalistsCount || 0} membres) seront détachés et recevront une notification officielle.`}
        confirmLabel={loadingDelete ? 'Suppression...' : 'Confirmer la suppression définitive'}
        isDestructive={true}
        onConfirm={handleConfirmDeleteMedia}
        onCancel={() => {
          setMediaToDelete(null);
          setDeleteReason('');
        }}
      >
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Motif de la suppression (notifié aux membres et consigné dans l'audit) :
          </label>
          <input
            type="text"
            placeholder="Ex: Dissolution administrative pour non-conformité éditoriale..."
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>
      </AdminConfirmDialog>
    </div>
  );
};
