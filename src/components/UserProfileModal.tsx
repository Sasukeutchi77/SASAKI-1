import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  Shield,
  Clock,
  Calendar,
  Mail,
  User as UserIcon,
  Phone,
  Edit3,
  Save,
  FileCheck,
  AlertCircle,
  LogOut,
  UploadCloud,
  Check,
  Building2,
  FileText,
  BadgeAlert,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getOptimizedImageUrl, validateMediaFile } from '../services/cloudinary';
import { VerifiedBadge } from './VerifiedBadge';

interface UserProfileModalProps {
  onClose: () => void;
  onOpenAuth?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const {
    user,
    logout,
    updateUserProfile,
    uploadAvatar,
    uploadCover,
    removeAvatar,
    removeCover,
    requestJournalistVerification,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const cardDocInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [saveLoading, setSaveLoading] = useState(false);

  // Avatar Upload State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Cover Image State
  const [coverUploading, setCoverUploading] = useState(false);

  // Journalist Accreditation Request Modal / Form
  const [showAccreditationForm, setShowAccreditationForm] = useState(false);
  const [mediaName, setMediaName] = useState(user?.mediaName || '');
  const [pressCardNumber, setPressCardNumber] = useState('');
  const [motivation, setMotivation] = useState('');
  const [cardDocFile, setCardDocFile] = useState<File | null>(null);
  const [cardDocUploading, setCardDocUploading] = useState(false);
  const [accreditationLoading, setAccreditationLoading] = useState(false);

  // Feedback Messages
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!user) return null;

  // Handle avatar file selection
  const handleSelectAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(file, 'image');
    if (!validation.isValid) {
      setFeedback({ type: 'error', message: validation.error || 'Fichier image invalide.' });
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setFeedback(null);
  };

  // Confirm upload to Cloudinary & update Firestore
  const handleConfirmAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true);
    setFeedback(null);

    try {
      const media = await uploadAvatar(avatarFile);
      setAvatarPreview(null);
      setAvatarFile(null);
      setFeedback({
        type: 'success',
        message: 'Photo de profil mise à jour et optimisée avec succès sur Cloudinary !',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Échec de l’envoi de la photo vers Cloudinary.',
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Cancel selected avatar
  const handleCancelAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove avatar entirely
  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar();
      setFeedback({ type: 'success', message: 'Photo de profil réinitialisée avec succès.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Impossible de supprimer la photo.' });
    }
  };

  // Select and upload cover image (banner)
  const handleSelectCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(file, 'image');
    if (!validation.isValid) {
      setFeedback({ type: 'error', message: validation.error || 'Image de couverture invalide.' });
      return;
    }

    setCoverUploading(true);
    setFeedback(null);
    try {
      await uploadCover(file);
      setFeedback({ type: 'success', message: 'Image de couverture mise à jour avec succès sur Cloudinary !' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Échec du téléversement de la bannière.' });
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Remove cover image
  const handleRemoveCover = async () => {
    try {
      await removeCover();
      setFeedback({ type: 'success', message: 'Bannière de profil supprimée.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Impossible de supprimer la bannière.' });
    }
  };

  // Save editable profile fields
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setFeedback(null);

    try {
      await updateUserProfile({
        name: editName.trim(),
        username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        bio: editBio.trim(),
        phone: editPhone.trim(),
      });
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Vos informations de profil ont été enregistrées.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erreur lors de la mise à jour.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Submit Journalist Accreditation Request
  const handleSubmitAccreditation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pressCardNumber.trim() || !motivation.trim()) {
      setFeedback({
        type: 'error',
        message: 'Le numéro de carte de presse et votre motivation sont obligatoires.',
      });
      return;
    }

    setAccreditationLoading(true);
    setFeedback(null);

    try {
      let documentUrl: string | undefined;

      // If document attached, upload to Cloudinary
      if (cardDocFile) {
        setCardDocUploading(true);
        const { uploadMediaToCloudinary } = await import('../services/cloudinary');
        const media = await uploadMediaToCloudinary(cardDocFile, {
          type: 'image',
          folder: 'purge_info/press_cards',
        });
        documentUrl = media.url;
        setCardDocUploading(false);
      }

      await requestJournalistVerification({
        mediaName: mediaName.trim(),
        pressCardNumber: pressCardNumber.trim(),
        motivation: motivation.trim(),
        documentUrl,
      });

      setShowAccreditationForm(false);
      setFeedback({
        type: 'success',
        message:
          'Votre dossier d’accréditation a bien été transmis aux administrateurs pour vérification officielle.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erreur lors de la soumission de l’accréditation.',
      });
    } finally {
      setAccreditationLoading(false);
      setCardDocUploading(false);
    }
  };

  // Display user role label
  const roleLabel =
    user.role === 'admin'
      ? 'Administrateur Central'
      : user.role === 'journalist'
      ? 'Journaliste / Rédaction de Presse'
      : 'Lecteur Citoyen';

  const roleBadgeColor =
    user.role === 'admin'
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
      : user.role === 'journalist'
      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
      : 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/40 shadow-[0_0_10px_rgba(217,70,239,0.2)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-mono text-slate-100">
      <div className="relative w-full max-w-2xl bg-[#0b0e1a] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,243,255,0.25)] overflow-hidden flex flex-col my-4 max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="bg-[#101428] border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold tracking-wider uppercase text-white">Mon Profil Utilisateur</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-cyan-400/60 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`px-6 py-3 text-xs flex items-center gap-2 font-semibold border-b ${
              feedback.type === 'success'
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40'
                : 'bg-red-950/70 text-red-300 border-red-500/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Profile Header Block: Cover Banner + Overlapping Avatar */}
          <div className="rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#101428] transition-colors">
            {/* Cover Banner */}
            <div className="relative w-full h-36 sm:h-44 bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101428] overflow-hidden group">
              {user.coverImage ? (
                <img
                  src={user.coverImage}
                  alt="Bannière de profil"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-cyan-400/40 text-xs font-mono">
                  Bannière de profil personnalisée
                </div>
              )}

              {/* Cover input & actions */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSelectCover}
                className="hidden"
              />

              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="px-2.5 py-1.5 bg-[#0b0e1a]/80 hover:bg-[#0b0e1a] border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {coverUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>Téléversement...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{user.coverImage ? 'Changer la bannière' : 'Ajouter une bannière'}</span>
                    </>
                  )}
                </button>

                {user.coverImage && !coverUploading && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="p-1.5 bg-red-950/80 border border-red-500/40 hover:bg-red-900/80 text-red-300 rounded-lg text-xs transition cursor-pointer"
                    title="Supprimer la bannière"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Avatar & User Meta Section */}
            <div className="p-4 sm:p-5 pt-0 sm:pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-14 mb-3">
                {/* Overlapping Avatar */}
                <div className="relative shrink-0 group">
                  <img
                    src={
                      avatarPreview ||
                      getOptimizedImageUrl(user.avatar, { width: 240, height: 240, crop: 'fill', gravity: 'face' }) ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[#0b0e1a] shadow-[0_0_20px_rgba(0,243,255,0.3)] bg-[#141933]"
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleSelectAvatar}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    title="Changer de photo via Cloudinary"
                    className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black rounded-full shadow-[0_0_10px_rgba(0,243,255,0.4)] border-2 border-[#0b0e1a] transition-all cursor-pointer hover:brightness-110"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* User Info Header */}
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-bold text-white">{user.name}</h3>
                    {user.isVerified && (
                      <VerifiedBadge size="sm" type={user.role === 'admin' ? 'admin' : 'journalist'} />
                    )}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${roleBadgeColor}`}>
                      {roleLabel}
                    </span>
                  </div>

                  <p className="text-xs text-cyan-400/60 font-mono">
                    @{user.username || user.email.split('@')[0]} • UID: {user.uid || user.id.slice(0, 14)}...
                  </p>
                </div>

                {user.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-[11px] text-cyan-400/60 hover:text-red-400 transition cursor-pointer"
                  >
                    Réinitialiser l'avatar
                  </button>
                )}
              </div>

              {/* User contact details */}
              <div className="text-xs text-cyan-400/70 flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 border-t border-cyan-500/20">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    {user.phone}
                  </span>
                )}
              </div>

              {/* Cloudinary Avatar Upload Action Confirmation */}
              {avatarFile && (
                <div className="mt-3 p-2.5 bg-[#141933] border border-cyan-500/40 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-xs text-cyan-300 font-medium truncate">
                    Nouvelle photo sélectionnée : {avatarFile.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleConfirmAvatarUpload}
                      disabled={avatarUploading}
                      className="px-2.5 py-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {avatarUploading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Upload Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Confirmer</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAvatar}
                      disabled={avatarUploading}
                      className="px-2 py-1 bg-[#101428] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Security & Non-Tampering Notice */}
          <div className="p-3.5 bg-[#101428] border border-cyan-500/30 rounded-xl flex items-start gap-3 text-xs text-slate-300">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-cyan-300">Sécurité & Contrôle d'Accès Côté Serveur (RBAC)</p>
              <p className="text-[11px] text-cyan-400/60 mt-0.5">
                Les privilèges administratifs et de rédaction presse sont strictement vérifiés par le serveur et Firestore Security Rules. Un utilisateur ne peut pas modifier son propre rôle depuis le client.
              </p>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="border border-cyan-500/30 rounded-2xl p-5 bg-[#101428] space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Informations Personnelles
              </h4>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-[#141933] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-cyan-400/60 hover:text-cyan-200 font-medium cursor-pointer"
                >
                  Annuler
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
                      Nom complet / Signature
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#141933] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
                      Nom d'utilisateur (@)
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#141933] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+226 XX XX XX XX"
                    className="w-full px-3 py-2 text-xs bg-[#141933] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
                    Biographie
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Présentez-vous brièvement..."
                    className="w-full px-3 py-2 text-xs bg-[#141933] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 resize-none shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saveLoading ? 'Enregistrement...' : 'Sauvegarder les modifications'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-cyan-400/60 block font-bold uppercase text-[10px]">Biographie</span>
                  <p className="text-slate-200 mt-0.5">{user.bio || 'Aucune biographie rédigée.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-cyan-500/20">
                  <div>
                    <span className="text-cyan-400/60 block font-bold uppercase text-[10px]">Date d’inscription</span>
                    <span className="text-slate-200 font-medium">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-cyan-400/60 block font-bold uppercase text-[10px]">Statut du compte</span>
                    <span className="inline-flex items-center gap-1 text-cyan-300 font-bold">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f3ff]"></span>
                      Actif & Vérifié
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Statut Badge Bleu & Certification (Journalistes & Administrateurs) */}
          {(user.role === 'journalist' || user.role === 'admin') && (
            <div className="border border-cyan-500/30 bg-[#101428] rounded-2xl p-5 space-y-3 shadow-[0_0_20px_rgba(0,243,255,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <VerifiedBadge size="md" type={user.role === 'admin' ? 'admin' : 'journalist'} />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                      <span>Certification Officielle (Badge Bleu)</span>
                      {user.isVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                          Actif
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-cyan-400/70 mt-0.5">
                      {user.isVerified
                        ? 'Votre compte dispose du badge bleu officiel de certification. Ce badge vous distingue auprès des lecteurs et médias.'
                        : 'Atteignez 50 abonnés pour être certifié automatiquement avec le badge bleu (style TikTok), ou recevez une accréditation directe par l’administration.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#141933] border border-cyan-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-stone-300">Audience abonnés :</span>
                  <span className="text-cyan-300 font-bold">
                    {user.followersCount || 0} / 50 abonnés
                  </span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((user.followersCount || 0) / 50) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span>
                    {user.isVerified
                      ? '✓ Compte certifié'
                      : (user.followersCount || 0) >= 50
                      ? '✓ Seuil de 50 abonnés atteint'
                      : `Encore ${Math.max(0, 50 - (user.followersCount || 0))} abonnés requis`}
                  </span>
                  <span className="text-cyan-400/70 text-[10px]">
                    Validation manuelle admin possible à tout moment
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section Demande d'Accréditation Journaliste (si Lecteur / USER) */}
          {user.role === 'user' || user.role === 'reader' ? (
            <div className="border border-cyan-500/30 bg-[#101428] rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <FileCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Devenir Journaliste Professionnel / Organe de Presse
                    </h4>
                    <p className="text-xs text-cyan-400/70 mt-0.5">
                      purge-info offre un espace de publication exclusif aux journalistes titulaires d'une carte de presse reconnue par le Conseil Supérieur de la Communication.
                    </p>
                  </div>
                </div>
              </div>

              {user.verificationStatus === 'pending' ? (
                <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl flex items-center gap-2 text-xs text-amber-200 font-bold">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Votre dossier d’accréditation est actuellement en cours d’examen par l’administration.</span>
                </div>
              ) : user.verificationStatus === 'approved' ? (
                <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-xl flex items-center gap-2 text-xs text-cyan-200 font-bold">
                  <VerifiedBadge size="xs" type="journalist" />
                  <span>Votre compte a été vérifié avec succès par l'administration.</span>
                </div>
              ) : !showAccreditationForm ? (
                <button
                  type="button"
                  onClick={() => setShowAccreditationForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:brightness-110 transition-all cursor-pointer"
                >
                  Déposer une demande d’accréditation
                </button>
              ) : (
                <form onSubmit={handleSubmitAccreditation} className="p-4 bg-[#141933] rounded-xl border border-cyan-500/40 space-y-3">
                  <h5 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Formulaire d’accréditation presse
                  </h5>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
                      Nom de votre Organe de presse / Rédaction *
                    </label>
                    <input
                      type="text"
                      required
                      value={mediaName}
                      onChange={(e) => setMediaName(e.target.value)}
                      placeholder="Ex: Le Quotidien de Ouaga"
                      className="w-full px-3 py-2 text-xs bg-[#101428] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
                      Numéro officiel de Carte de Presse *
                    </label>
                    <input
                      type="text"
                      required
                      value={pressCardNumber}
                      onChange={(e) => setPressCardNumber(e.target.value)}
                      placeholder="Ex: CSC-BF-2024-8849"
                      className="w-full px-3 py-2 text-xs bg-[#101428] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
                      Motivation & Sujets couverts *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                      placeholder="Décrivez brièvement votre expérience journalistique et les rubriques que vous souhaitez couvrir sur purge-info..."
                      className="w-full px-3 py-2 text-xs bg-[#101428] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 resize-none shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
                      Photo ou scan de la carte de presse (Cloudinary)
                    </label>
                    <input
                      ref={cardDocInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setCardDocFile(e.target.files?.[0] || null)}
                      className="text-xs text-cyan-400/70 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#101428] file:border file:border-cyan-500/40 file:text-cyan-300 hover:file:bg-[#182042] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-cyan-500/20">
                    <button
                      type="button"
                      onClick={() => setShowAccreditationForm(false)}
                      className="px-3 py-1.5 text-cyan-400/70 hover:text-cyan-200 text-xs font-semibold cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={accreditationLoading || cardDocUploading}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {accreditationLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Transmission...</span>
                        </>
                      ) : (
                        <span>Soumettre ma demande d’accréditation</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}

          {/* Logout Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="px-4 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            >
              <LogOut className="w-4 h-4" />
              <span>Se déconnecter de purge-info</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
