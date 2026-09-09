import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Shield,
  Clock,
  Calendar,
  Mail,
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
  Sparkles,
  Award,
  Layers,
  Share2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getOptimizedImageUrl, validateMediaFile } from '../services/cloudinary';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { sfx } from '../services/soundEffects';

interface UserProfilePageProps {
  onBack: () => void;
  onOpenAuth: () => void;
  onOpenMyHouse?: () => void;
  onOpenBookmarks?: () => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  onBack,
  onOpenAuth,
  onOpenMyHouse,
  onOpenBookmarks,
}) => {
  const {
    user,
    isAuthenticated,
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

  // Active section tab
  const [activeTab, setActiveTab] = useState<'profile' | 'accreditation' | 'security'>('profile');

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

  // Journalist Accreditation Request Form
  const [mediaName, setMediaName] = useState(user?.mediaName || '');
  const [pressCardNumber, setPressCardNumber] = useState('');
  const [motivation, setMotivation] = useState('');
  const [cardDocFile, setCardDocFile] = useState<File | null>(null);
  const [cardDocUploading, setCardDocUploading] = useState(false);
  const [accreditationLoading, setAccreditationLoading] = useState(false);

  // Feedback Messages
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (user) {
      setEditName(user.name || '');
      setEditUsername(user.username || '');
      setEditBio(user.bio || '');
      setEditPhone(user.phone || '');
      setMediaName(user.mediaName || '');
    }
  }, [user]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#07080f] text-slate-100 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-cyan-400 mb-4">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connexion requise</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Veuillez vous connecter pour accéder à votre compte, gérer votre profil et vos accréditations journalistiques.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-xl bg-blue-950/40 border border-blue-500/30 cursor-pointer"
          >
            Retour
          </button>
          <button
            onClick={onOpenAuth}
            className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_15px_rgba(29,104,255,0.4)] cursor-pointer"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

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

  // Confirm upload to Cloudinary & update profile
  const handleConfirmAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true);
    setFeedback(null);

    try {
      await uploadAvatar(avatarFile);
      setAvatarPreview(null);
      setAvatarFile(null);
      setFeedback({
        type: 'success',
        message: 'Photo de profil mise à jour et optimisée avec succès !',
      });
      sfx.playNotificationDing();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Échec de l’envoi de la photo.',
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
      sfx.playMechanicalClick();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Impossible de supprimer la photo.' });
    }
  };

  // Select and upload cover image
  const handleSelectCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(file, 'image');
    if (!validation.isValid) {
      setFeedback({ type: 'error', message: validation.error || 'Format image non valide.' });
      return;
    }

    setCoverUploading(true);
    setFeedback(null);

    try {
      await uploadCover(file);
      setFeedback({
        type: 'success',
        message: 'Bannière de profil mise à jour avec succès !',
      });
      sfx.playNotificationDing();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Échec du téléchargement de la bannière.',
      });
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Save profile text info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setFeedback(null);

    try {
      await updateUserProfile({
        name: editName.trim(),
        username: editUsername.trim(),
        bio: editBio.trim(),
        phone: editPhone.trim(),
      });
      setIsEditing(false);
      setFeedback({
        type: 'success',
        message: 'Vos informations de profil ont été enregistrées avec succès.',
      });
      sfx.playNotificationDing();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erreur lors de la mise à jour du profil.',
      });
    } finally {
      setSaveLoading(false);
    }
  };

  // Submit journalist accreditation dossier
  const handleSubmitAccreditation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pressCardNumber.trim() || !motivation.trim()) {
      setFeedback({
        type: 'error',
        message: 'Veuillez renseigner le numéro d’accréditation et votre motivation professionnelle.',
      });
      return;
    }

    setAccreditationLoading(true);
    setFeedback(null);

    try {
      let documentUrl: string | undefined;

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

      setFeedback({
        type: 'success',
        message: 'Votre dossier d’accréditation a bien été transmis aux administrateurs pour vérification officielle.',
      });
      sfx.playNotificationDing();
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
    <div className="w-full min-h-screen bg-[#07080f] text-slate-100 font-sans pb-28 md:pb-16 animate-fadeIn">
      {/* Top Header / Breadcrumb Bar */}
      <div className="sticky top-16 z-30 bg-[#040817]/90 backdrop-blur-xl border-b border-blue-500/20 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            id="user-profile-back-btn"
            onClick={() => {
              sfx.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-600/20 text-cyan-300 hover:text-cyan-200 border border-blue-500/30 hover:border-cyan-400/50 text-xs font-bold transition-all cursor-pointer touch-target interactive-pop"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>

          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border uppercase tracking-wider ${roleBadgeColor}`}
            >
              {roleLabel}
            </span>

            <button
              onClick={() => {
                sfx.playMechanicalClick();
                logout();
                onBack();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition cursor-pointer touch-target"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl mb-6 text-xs flex items-center gap-3 font-semibold border ${
              feedback.type === 'success'
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40 shadow-[0_0_20px_rgba(0,210,255,0.2)]'
                : 'bg-red-950/70 text-red-300 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-cyan-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            )}
            <span className="flex-1 leading-relaxed">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-white/10"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Hero Card with Cover Banner + Overlapping Avatar */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b142c] to-[#040817] border border-blue-500/30 shadow-[0_0_50px_rgba(29,104,255,0.15)] mb-8">
          {/* Cover Banner */}
          <div className="relative w-full h-48 sm:h-64 bg-gradient-to-r from-blue-950 via-[#040817] to-cyan-950 overflow-hidden group">
            {user.coverImage ? (
              <img
                src={getOptimizedImageUrl(user.coverImage, { width: 1400, quality: 'auto' })}
                alt="Bannière de profil"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cyan-400/30 text-xs font-mono">
                Bannière de profil personnalisée
              </div>
            )}

            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors pointer-events-none" />

            {/* Change cover button */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleSelectCover}
              className="hidden"
            />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="px-3.5 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-cyan-300 border border-cyan-500/40 text-xs font-mono flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer touch-target shadow-lg"
              >
                {coverUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>{user.coverImage ? 'Modifier la bannière' : 'Ajouter une bannière'}</span>
              </button>

              {user.coverImage && (
                <button
                  onClick={removeCover}
                  className="p-1.5 rounded-xl bg-black/70 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition cursor-pointer"
                  title="Supprimer la bannière"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* User Meta Row (Avatar + Name + Actions) */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
              {/* Avatar with live Cloudinary preview */}
              <div className="relative group shrink-0">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-4 border-[#040817] shadow-[0_0_30px_rgba(0,210,255,0.4)] bg-slate-900 relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Aperçu"
                      className="w-full h-full object-cover ring-2 ring-yellow-400"
                    />
                  ) : user.avatar ? (
                    <img
                      src={getOptimizedImageUrl(user.avatar, { width: 300, quality: 'auto' })}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-950 text-cyan-400 font-black text-3xl">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Upload camera trigger button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSelectAvatar}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 rounded-xl bg-blue-600 hover:bg-cyan-500 text-white shadow-lg transition cursor-pointer border border-white/20 touch-target"
                  title="Changer la photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons: Edit profile, My House, Bookmarks */}
              <div className="flex items-center gap-2 flex-wrap sm:mb-2">
                {onOpenMyHouse && (user.role === 'journalist' || user.role === 'admin') && (
                  <button
                    onClick={() => {
                      sfx.playClick();
                      onOpenMyHouse();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer touch-target interactive-pop"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Ma Maison</span>
                  </button>
                )}

                {onOpenBookmarks && (
                  <button
                    onClick={() => {
                      sfx.playClick();
                      onOpenBookmarks();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer touch-target interactive-pop"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Mes Favoris</span>
                  </button>
                )}

                {!isEditing ? (
                  <button
                    onClick={() => {
                      sfx.playMechanicalClick();
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-[0_0_20px_rgba(29,104,255,0.4)] transition cursor-pointer touch-target interactive-pop"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Modifier mes infos</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>

            {/* Avatar Pending Confirmation Controls */}
            {avatarPreview && (
              <div className="mb-4 p-3 rounded-xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-between gap-3 text-xs">
                <span className="text-cyan-200">
                  Valider l'envoi de la nouvelle photo de profil vers Cloudinary ?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmAvatarUpload}
                    disabled={avatarUploading}
                    className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirmer
                  </button>
                  <button
                    onClick={handleCancelAvatar}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* User Details */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {user.name}
                </h1>
                <VerifiedBadge isVerified={user.isVerified} role={user.role} />
                {user.mediaName && (
                  <span className="flex items-center gap-1 text-xs text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/40">
                    <Building2 className="w-3 h-3 text-cyan-400" />
                    {user.mediaName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                <span>@{user.username || user.email.split('@')[0]}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-blue-400" />
                  {user.email}
                </span>
                {user.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      {user.phone}
                    </span>
                  </>
                )}
              </div>

              {user.bio && !isEditing && (
                <p className="text-sm text-slate-200 mt-3 max-w-2xl leading-relaxed">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-blue-500/20 mb-8 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('profile');
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer touch-target ${
              activeTab === 'profile'
                ? 'text-cyan-300 border-cyan-400 shadow-[0_4px_12px_rgba(0,210,255,0.2)]'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profil & Identité</span>
          </button>

          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('accreditation');
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer touch-target ${
              activeTab === 'accreditation'
                ? 'text-cyan-300 border-cyan-400 shadow-[0_4px_12px_rgba(0,210,255,0.2)]'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Accréditation Presse & Certification</span>
            {user.role === 'journalist' && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('security');
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer touch-target ${
              activeTab === 'security'
                ? 'text-cyan-300 border-cyan-400 shadow-[0_4px_12px_rgba(0,210,255,0.2)]'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Sécurité & Déontologie</span>
          </button>
        </div>

        {/* TAB 1: Profile & Identity Information Form */}
        {activeTab === 'profile' && (
          <div className="bg-[#0b142c]/60 border border-blue-500/25 rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-cyan-400" />
              Informations du compte
            </h2>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nom complet / Signature journalistique *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#040817] border border-blue-500/40 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nom d'utilisateur (@identifiant)
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#040817] border border-blue-500/40 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Numéro de téléphone de contact
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+000 00 00 00 00"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#040817] border border-blue-500/40 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Biographie & Présentation professionnelle
                  </label>
                  <textarea
                    rows={4}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Présentez votre parcours, vos domaines d'investigation ou vos centres d'intérêt..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#040817] border border-blue-500/40 text-sm text-white focus:outline-none focus:border-cyan-400 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-blue-500/20">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(29,104,255,0.4)] cursor-pointer"
                  >
                    {saveLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Enregistrer les modifications</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded-2xl bg-[#040817]/60 border border-blue-500/20">
                  <span className="text-slate-400 block mb-1">Nom complet</span>
                  <span className="font-bold text-white text-sm">{user.name}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#040817]/60 border border-blue-500/20">
                  <span className="text-slate-400 block mb-1">Adresse électronique</span>
                  <span className="font-bold text-white text-sm">{user.email}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#040817]/60 border border-blue-500/20">
                  <span className="text-slate-400 block mb-1">Identifiant</span>
                  <span className="font-bold text-cyan-300 text-sm">
                    @{user.username || user.email.split('@')[0]}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-[#040817]/60 border border-blue-500/20">
                  <span className="text-slate-400 block mb-1">Téléphone</span>
                  <span className="font-bold text-white text-sm">{user.phone || 'Non renseigné'}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#040817]/60 border border-blue-500/20 md:col-span-2">
                  <span className="text-slate-400 block mb-1">Biographie</span>
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {user.bio || 'Aucune biographie rédigée pour le moment.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Accreditation & Press Verification */}
        {activeTab === 'accreditation' && (
          <div className="space-y-6">
            <div className="bg-[#0b142c]/60 border border-blue-500/25 rounded-3xl p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-cyan-400" />
                    Statut Journalistique & Accréditation
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Garantie d'intégrité éditoriale et attribution du badge bleu officiel
                  </p>
                </div>

                <VerifiedBadge isVerified={user.isVerified} role={user.role} />
              </div>

              {user.role === 'journalist' || user.role === 'admin' ? (
                <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-300 text-sm font-bold">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    <span>Compte Journaliste Actif & Accrédité</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Vous disposez des privilèges complets de rédaction, de soumission d'enquêtes et d'intégration d'une maison de presse (jusqu'à 5 journalistes par rédaction).
                  </p>
                  {user.mediaName && (
                    <div className="text-xs text-cyan-200 pt-2 border-t border-cyan-500/20">
                      Organe de rattachement : <strong>{user.mediaName}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-slate-300 leading-relaxed">
                    Vous êtes actuellement inscrit en tant que <strong>Lecteur Citoyen</strong>. Si vous êtes un journaliste professionnel, indépendant ou membre d'une rédaction, vous pouvez soumettre une demande d'accréditation avec vos justificatifs.
                  </div>

                  <form onSubmit={handleSubmitAccreditation} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Nom de votre Média / Organe de presse *
                      </label>
                      <input
                        type="text"
                        required
                        value={mediaName}
                        onChange={(e) => setMediaName(e.target.value)}
                        placeholder="Ex: Le Quotidien Indépendant, Focus News, etc."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#040817] border border-blue-500/40 text-sm text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Numéro de carte de presse ou récépissé légal *
                      </label>
                      <input
                        type="text"
                        required
                        value={pressCardNumber}
                        onChange={(e) => setPressCardNumber(e.target.value)}
                        placeholder="Ex: CP-2026-XXXXX"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#040817] border border-blue-500/40 text-sm text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Motivation professionnelle & domaines d'expertise *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        placeholder="Expliquez brièvement votre démarche journalistique..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#040817] border border-blue-500/40 text-sm text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Justificatif (Scan de carte de presse ou pièce d'accréditation)
                      </label>
                      <input
                        ref={cardDocInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setCardDocFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-2 rounded-xl bg-[#040817] border border-blue-500/40 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-cyan-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={accreditationLoading || cardDocUploading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(29,104,255,0.4)] flex items-center justify-center gap-2 cursor-pointer interactive-pop"
                    >
                      {accreditationLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileCheck className="w-4 h-4" />
                      )}
                      <span>Soumettre mon dossier d'accréditation</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Security & Deontology */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-[#0b142c]/60 border border-blue-500/25 rounded-3xl p-6 sm:p-8">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Score de Confiance & Déontologie
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Chaque compte dispose d'un indice d'intégrité calculé en fonction de ses vérifications factuelles et du respect de la charte.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-[#040817] border border-blue-500/30 text-center">
                  <span className="block text-2xl font-black font-mono text-cyan-300">100%</span>
                  <span className="text-[11px] text-slate-400 font-medium">Score d'intégrité</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#040817] border border-blue-500/30 text-center">
                  <span className="block text-2xl font-black font-mono text-yellow-400">0</span>
                  <span className="text-[11px] text-slate-400 font-medium">Signalements</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#040817] border border-blue-500/30 text-center">
                  <span className="block text-2xl font-black font-mono text-emerald-400">Actif</span>
                  <span className="text-[11px] text-slate-400 font-medium">Statut du compte</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Engagement Déontologique
                </div>
                <p className="leading-relaxed">
                  En utilisant la plateforme, vous vous engagez à respecter les principes d'indépendance, de vérification contradictoire des faits, et de refus de la manipulation médiatique.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
