import React, { useState, useRef } from 'react';
import {
  X,
  Building2,
  Crown,
  Sparkles,
  Shield,
  Upload,
  Image as ImageIcon,
  Tag,
  Phone,
  Mail,
  MapPin,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  HelpCircle,
} from 'lucide-react';
import { MediaHouse, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { uploadMediaToCloudinary } from '../services/cloudinary';

const LOGO_PRESETS = [
  { name: 'Investigation', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=200&auto=format&fit=crop&q=80' },
  { name: 'Économie', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&auto=format&fit=crop&q=80' },
  { name: 'Tech & IA', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80' },
  { name: 'Culture & Société', url: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=200&auto=format&fit=crop&q=80' },
  { name: 'Monde & Régions', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=200&auto=format&fit=crop&q=80' },
];

const COVER_PRESETS = [
  { name: 'Rédaction Moderne', url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Studio News', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Plateau Média', url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80' },
];

const HOUSE_NAME_SUGGESTIONS = [
  'L\'Observatoire Indépendant',
  'Le Courrier des Citoyens',
  'La Sentinelle Républicaine',
  'Tribune d\'Investigation',
  'Le Flambeau de la Vérité',
  'L\'Éclair Mondial',
  'Écho & Démocratie',
];

const SPECIALTY_OPTIONS = [
  'Investigation',
  'Politique & Pouvoir',
  'Économie & Finance',
  'Société & Citoyenneté',
  'Sécurité & Défense',
  'Droits Humains',
  'Environnement & Climat',
  'Fact-Checking & Vérité',
  'Culture & Médias',
];

interface CreateHouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newHouse: MediaHouse) => void;
  onOpenAuth?: () => void;
}

export const CreateHouseModal: React.FC<CreateHouseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenAuth,
}) => {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState<string>('');
  const [motto, setMotto] = useState<string>('L\'information vérifiée, sans concession.');
  const [description, setDescription] = useState<string>('');
  const [specialties, setSpecialties] = useState<string[]>(['Investigation', 'Société & Citoyenneté']);
  const [customSpecialty, setCustomSpecialty] = useState<string>('');
  const [logo, setLogo] = useState<string>(LOGO_PRESETS[0].url);
  const [coverImage, setCoverImage] = useState<string>(COVER_PRESETS[0].url);
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [address, setAddress] = useState<string>('Bureau Éditorial Central');
  const [website, setWebsite] = useState<string>('');

  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [uploadingCover, setUploadingCover] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const toggleSpecialty = (spec: string) => {
    if (specialties.includes(spec)) {
      if (specialties.length > 1) {
        setSpecialties(specialties.filter((s) => s !== spec));
      }
    } else {
      setSpecialties([...specialties, spec]);
    }
  };

  const handleAddCustomSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSpecialty.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties([...specialties, trimmed]);
      setCustomSpecialty('');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      // First try Cloudinary upload
      try {
        const media = await uploadMediaToCloudinary(file, { folder: 'media-houses/logos' });
        if (media?.url) {
          setLogo(media.url);
          return;
        }
      } catch (cloudErr) {
        console.warn('Cloudinary upload fallback to base64/data URI:', cloudErr);
      }

      // Fallback to local Data URI
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogo(String(event.target.result));
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec du téléversement du logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      try {
        const media = await uploadMediaToCloudinary(file, { folder: 'media-houses/covers' });
        if (media?.url) {
          setCoverImage(media.url);
          return;
        }
      } catch (cloudErr) {
        console.warn('Cloudinary cover upload fallback to base64:', cloudErr);
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverImage(String(event.target.result));
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec du téléversement de la couverture');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage('Vous devez être connecté pour fonder une maison de presse.');
      return;
    }

    if (!name.trim() || name.trim().length < 3) {
      setErrorMessage('Le nom de la maison de presse doit comporter au moins 3 caractères.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage('Veuillez préciser une ligne éditoriale détaillée (au moins 10 caractères).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createMediaHouse({
        name: name.trim(),
        motto: motto.trim(),
        description: description.trim(),
        specialties,
        logo: logo.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        website: website.trim() || undefined,
      });

      // Refresh current user session so mediaId, mediaName and journalist role apply immediately
      await refreshUser();

      if (onSuccess) {
        onSuccess(res.house);
      }
      onClose();
    } catch (err: any) {
      console.error('Error creating media house:', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de la fondation de la maison.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="create-house-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-house-modal-title"
    >
      <div
        id="create-house-modal-container"
        className="relative w-full max-w-2xl bg-stone-900 border border-cyan-500/30 rounded-2xl sm:rounded-3xl shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn"
      >
        {/* Modal Top Header Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-stone-950 via-cyan-950/40 to-stone-900 border-b border-cyan-500/20 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-amber-400 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 id="create-house-modal-title" className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Fonder une Maison de Presse
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Chef de Rédaction
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Créez votre rédaction officielle, signez vos enquêtes et fédérez jusqu'à 4 confrères.
              </p>
            </div>
          </div>

          <button
            id="create-house-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800/80 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div
              id="create-house-error-banner"
              className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Not signed in warning */}
          {!user ? (
            <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-center space-y-4">
              <Shield className="w-10 h-10 text-amber-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-white">Connexion requise</h3>
                <p className="text-xs text-stone-300 mt-1 max-w-md mx-auto">
                  Pour fonder une Maison de Presse et diriger votre propre rédaction accréditée, vous devez vous connecter à votre compte citoyen ou journaliste.
                </p>
              </div>
              {onOpenAuth && (
                <button
                  id="create-house-login-btn"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-amber-400 hover:brightness-110 text-black font-black text-xs transition cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  Se connecter / Créer un compte
                </button>
              )}
            </div>
          ) : (
            <form id="create-house-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Executive Notice */}
              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-xs text-cyan-200/90 leading-relaxed">
                  En fondant cette maison de presse, vous serez officiellement enregistré comme <strong>Chef de Rédaction</strong>. Vous bénéficierez des droits de publication immédiats et pourrez inviter jusqu'à 4 confrères accrédités.
                </p>
              </div>

              {/* 1. House Name & Slogan */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="house-name-input" className="block text-xs font-bold text-stone-200 mb-1.5 flex items-center justify-between">
                    <span>Nom de la Maison de Presse <span className="text-red-400">*</span></span>
                    <span className="text-[11px] text-stone-500 font-normal">Min. 3 caractères</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="house-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: L'Observatoire Citoyen, La Sentinelle..."
                      className="w-full pl-9 pr-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 rounded-xl text-sm text-white placeholder-stone-600 transition"
                    />
                  </div>

                  {/* Name Suggestions Chips */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-stone-500 mr-1">Suggestions :</span>
                    {HOUSE_NAME_SUGGESTIONS.slice(0, 4).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setName(sug)}
                        className="px-2 py-0.5 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-[11px] text-cyan-300/80 hover:text-cyan-200 transition cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="house-motto-input" className="block text-xs font-bold text-stone-200 mb-1.5">
                    Devise & Slogan Éditorial
                  </label>
                  <input
                    id="house-motto-input"
                    type="text"
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="Ex: L'information vérifiée, sans concession."
                    className="w-full px-4 py-2 bg-stone-950 border border-stone-800 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-stone-600 transition"
                  />
                </div>
              </div>

              {/* 2. Editorial Description */}
              <div>
                <label htmlFor="house-description-input" className="block text-xs font-bold text-stone-200 mb-1.5 flex items-center justify-between">
                  <span>Ligne Éditoriale & Manifeste <span className="text-red-400">*</span></span>
                  <span className="text-[11px] text-stone-500 font-normal">Min. 10 caractères</span>
                </label>
                <textarea
                  id="house-description-input"
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez les principes fondamentaux de votre organe de presse, votre angle d'investigation et vos engagements de vérification des faits..."
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 rounded-xl text-xs text-white placeholder-stone-600 transition resize-none"
                />
              </div>

              {/* 3. Specialties / Themes */}
              <div>
                <label className="block text-xs font-bold text-stone-200 mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Domaines d'enquête & Rubriques prioritaires</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SPECIALTY_OPTIONS.map((spec) => {
                    const active = specialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-sm shadow-cyan-500/10'
                            : 'bg-stone-950 text-stone-400 border border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {active && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                        <span>{spec}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom specialty input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    placeholder="Ajouter une rubrique personnalisée..."
                    className="flex-1 px-3 py-1.5 bg-stone-950 border border-stone-800 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-stone-600 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSpecialty}
                    disabled={!customSpecialty.trim()}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
              </div>

              {/* 4. Visual Identity (Logo & Cover) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo Section */}
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Logo Officiel
                    </span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <span>Téléverser</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={logo}
                      alt="Aperçu logo"
                      className="w-14 h-14 rounded-xl object-cover border border-cyan-500/40 bg-black shrink-0"
                    />
                    <div className="flex-1">
                      <div className="text-[10px] text-stone-500 mb-1.5">Présélections :</div>
                      <div className="flex items-center gap-1.5">
                        {LOGO_PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLogo(p.url)}
                            className={`w-7 h-7 rounded-lg overflow-hidden border transition cursor-pointer ${
                              logo === p.url ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-stone-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cover Section */}
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      Image de Couverture
                    </span>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <span>Téléverser</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={coverImage}
                      alt="Aperçu couverture"
                      className="w-20 h-14 rounded-xl object-cover border border-amber-500/40 bg-black shrink-0"
                    />
                    <div className="flex-1">
                      <div className="text-[10px] text-stone-500 mb-1.5">Présélections :</div>
                      <div className="flex items-center gap-1.5">
                        {COVER_PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCoverImage(p.url)}
                            className={`h-7 w-12 rounded-lg overflow-hidden border transition cursor-pointer ${
                              coverImage === p.url ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-stone-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Contact Details */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Coordonnées & Siège de la Rédaction</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="house-email-input" className="block text-[11px] text-stone-400 mb-1">
                      Email officiel
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="house-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="redaction@votremédia.com"
                        className="w-full pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-stone-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="house-phone-input" className="block text-[11px] text-stone-400 mb-1">
                      Téléphone / Ligne directe
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="house-phone-input"
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+33 1 00 00 00 00"
                        className="w-full pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-stone-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="house-address-input" className="block text-[11px] text-stone-400 mb-1">
                      Siège & Bureau Central
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="house-address-input"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Bureau Éditorial Central"
                        className="w-full pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-stone-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="house-website-input" className="block text-[11px] text-stone-400 mb-1">
                      Site Web Officiel (optionnel)
                    </label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="house-website-input"
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://mon-organe-presse.org"
                        className="w-full pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-stone-600 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Footer */}
              <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  id="create-house-cancel-btn"
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-stone-800 hover:bg-stone-800 text-stone-300 text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  id="create-house-submit-btn"
                  type="submit"
                  disabled={loading || !name.trim() || name.trim().length < 3}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-cyan-400 to-blue-500 hover:brightness-110 disabled:opacity-50 text-black text-xs font-black transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fondation en cours...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      <span>Fonder la Maison de Presse (Chef)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
