import React, { useState, useEffect } from 'react';
import {
  Building2,
  Crown,
  Shield,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Users,
  FileText,
  Upload,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { MediaHouse, User, Article } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MyHouseDashboard } from './MyHouseDashboard';
import { uploadMediaToCloudinary } from '../services/cloudinary';

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

interface JournalistHouseTabProps {
  onOpenArticle?: (article: Article) => void;
  onOpenCreateArticle?: () => void;
  onHouseChanged?: (house: MediaHouse | null) => void;
}

export const JournalistHouseTab: React.FC<JournalistHouseTabProps> = ({
  onOpenArticle,
  onOpenCreateArticle,
  onHouseChanged,
}) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myHouse, setMyHouse] = useState<MediaHouse | null>(null);
  const [isChef, setIsChef] = useState(false);
  const [houseArticles, setHouseArticles] = useState<Article[]>([]);
  const [houseStats, setHouseStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalArticles: 0,
  });
  const [availableJournalists, setAvailableJournalists] = useState<
    (User & { isAvailable: boolean; currentHouseName?: string })[]
  >([]);

  // Creation form state
  const [name, setName] = useState('');
  const [motto, setMotto] = useState("L'information vérifiée, sans concession.");
  const [description, setDescription] = useState('');
  const [specialties, setSpecialties] = useState<string[]>(['Investigation', 'Société & Citoyenneté']);
  const [logo, setLogo] = useState(LOGO_PRESETS[0].url);
  const [coverImage, setCoverImage] = useState(COVER_PRESETS[0].url);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('Bureau Éditorial Central');
  const [website, setWebsite] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Global feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showMsg = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((current) => (current?.message === message ? null : current));
    }, 6000);
  };

  const loadHouseData = async () => {
    setLoading(true);
    try {
      const res = await api.getMyMediaHouse();
      if (res.house) {
        setMyHouse(res.house);
        setIsChef(!!res.isChef);
        setHouseArticles(res.articles || []);
        if (res.stats) {
          setHouseStats(res.stats);
        }
        if (onHouseChanged) onHouseChanged(res.house);
      } else {
        setMyHouse(null);
        setIsChef(false);
        setHouseArticles([]);
        if (onHouseChanged) onHouseChanged(null);
      }

      // Load available journalists for recruitment if chef
      if (res.isChef) {
        try {
          const journoRes = await api.getAvailableJournalists();
          setAvailableJournalists(journoRes.journalists || []);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      console.error('Error loading my house in JournalistHouseTab:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHouseData();
  }, [user?.id]);

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

  const handleCreateHouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    // Enforcement: Journalist already has a house
    if (myHouse && user?.role !== 'admin') {
      setCreateError(
        `Chaque compte de journaliste ne peut créer qu'une seule maison de presse. Vous êtes déjà affilié(e) à « ${myHouse.name} ».`
      );
      return;
    }

    if (!name.trim() || name.trim().length < 3) {
      setCreateError('Le nom de la maison de presse doit comporter au moins 3 caractères.');
      return;
    }

    setSubmittingCreate(true);
    try {
      const res = await api.createMediaHouse({
        name: name.trim(),
        motto: motto.trim() || undefined,
        description: description.trim() || undefined,
        specialties,
        logo: logo.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        website: website.trim() || undefined,
      });

      setCreateSuccess(res.message);
      showMsg('success', res.message);
      await refreshUser();
      await loadHouseData();
    } catch (err: any) {
      setCreateError(err.message || 'Une erreur est survenue lors de la fondation de la maison.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleDeleteHouse = async (houseId: string, houseName: string) => {
    if (
      !window.confirm(
        `Êtes-vous certain de vouloir dissoudre définitivement la Maison de Presse « ${houseName} » ? Cette action est irréversible.`
      )
    ) {
      return;
    }

    try {
      await api.deleteMediaHouse(houseId);
      showMsg('success', `La maison de presse « ${houseName} » a été dissoute.`);
      setMyHouse(null);
      await refreshUser();
      await loadHouseData();
    } catch (err: any) {
      showMsg('error', err.message || 'Impossible de dissoudre la maison.');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-cyan-400 font-mono space-y-3">
        <Building2 className="w-10 h-10 mx-auto animate-pulse text-cyan-400 opacity-60" />
        <p className="text-sm">Synchronisation des registres de la Maison de Journaliste...</p>
      </div>
    );
  }

  // CASE 1: The journalist already belongs to or owns a Media House
  if (myHouse && user) {
    return (
      <div className="space-y-4">
        {/* Anti-Duplicate 1-House Rule Callout */}
        <div className="p-3.5 rounded-xl bg-[#081028] border border-cyan-500/30 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-cyan-200">
              <strong className="text-white">Règle d'affiliation exclusive :</strong> Chaque compte de journaliste est
              strictement limité à <strong>une seule maison de presse</strong>. Vous êtes actuellement{' '}
              <span className="text-cyan-400 font-bold">{isChef ? 'Chef de Rédaction (Fondateur)' : 'Journaliste Membre'}</span>{' '}
              de « {myHouse.name} ».
            </span>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
            {myHouse.members?.length || 1}/5 Membres
          </span>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-950/80 text-red-300 border border-red-500/30'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Embedded Full House Management Dashboard */}
        <MyHouseDashboard
          myHouse={myHouse}
          isChef={isChef}
          currentUser={user}
          houseArticles={houseArticles}
          houseStats={houseStats}
          availableJournalists={availableJournalists}
          onOpenArticle={onOpenArticle}
          onOpenCreateArticle={onOpenCreateArticle}
          onRefreshHouse={loadHouseData}
          onDeleteHouse={handleDeleteHouse}
          showMsg={showMsg}
        />
      </div>
    );
  }

  // CASE 2: The journalist has NOT yet founded or joined a Media House
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Editorial Rule Notice */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-[#0a122e] to-cyan-950/60 border border-cyan-500/40 shadow-xl space-y-3 font-mono">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Fonder votre Maison de Journalistes
            </h3>
            <p className="text-xs text-cyan-300/80">Accréditation & Direction Éditoriale Officielle</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#060b1c] border border-cyan-500/20 text-xs text-slate-300 leading-relaxed space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Règle Déontologique PURGE : 1 seule maison par journaliste</span>
          </div>
          <p>
            Chaque compte de journaliste ne peut créer qu'<strong>une seule et unique maison de presse</strong>.
            En la fondant, vous en devenez automatiquement le <strong>Chef de Rédaction</strong> officiel. Vous pourrez
            ensuite recruter jusqu'à <strong>4 confrères journalistes accrédités</strong> (quota maximal de 5 membres)
            pour former votre collectif d'investigation.
          </p>
        </div>
      </div>

      {createError && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs font-mono flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{createError}</span>
        </div>
      )}

      {createSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{createSuccess}</span>
        </div>
      )}

      {/* Creation Form */}
      <form onSubmit={handleCreateHouseSubmit} className="space-y-6 font-mono">
        <div className="p-6 rounded-2xl bg-[#0a0f24] border border-cyan-500/30 space-y-5">
          <div className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-2 border-b border-cyan-500/20 pb-3">
            <Building2 className="w-4 h-4" />
            <span>1. Identité & Devise de la Rédaction</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Nom de la Maison de Journalistes *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Le Canard Libre, L'Observatoire Citoyen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#060b1c] border border-cyan-500/30 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[10px] text-cyan-400/60 mt-1 block">
                Ce nom sera apposé comme autorité éditoriale sur vos enquêtes.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Devise / Slogan Éditorial</label>
              <input
                type="text"
                placeholder="Ex: L'information vérifiée, sans concession."
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#060b1c] border border-cyan-500/30 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Ligne Éditoriale & Charte d'Investigation
            </label>
            <textarea
              rows={3}
              placeholder="Décrivez les valeurs, la méthode d'investigation et l'engagement de votre maison..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#060b1c] border border-cyan-500/30 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Specialties selection */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-2">
              Spécialités Thématiques ({specialties.length} sélectionnée{specialties.length > 1 ? 's' : ''})
            </label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map((spec) => {
                const isSelected = specialties.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialty(spec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                        : 'bg-[#060b1c] text-slate-400 border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    {spec}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Branding (Logo & Cover) */}
        <div className="p-6 rounded-2xl bg-[#0a0f24] border border-cyan-500/30 space-y-5">
          <div className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-2 border-b border-cyan-500/20 pb-3">
            <Sparkles className="w-4 h-4" />
            <span>2. Identité Visuelle (Logo & Bannière de Presse)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Logo */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-200">Logo de la Rédaction</label>
              <div className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="Aperçu Logo"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover border border-cyan-500/40 bg-black"
                />
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="URL de l'image du logo"
                    className="w-full px-3 py-1.5 bg-[#060b1c] border border-cyan-500/30 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    {LOGO_PRESETS.slice(0, 4).map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLogo(p.url)}
                        className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 cursor-pointer"
                      >
                        Style {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cover */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-200">Image de Couverture</label>
              <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 h-16 bg-black">
                <img
                  src={coverImage}
                  alt="Aperçu Couverture"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                  <div className="flex items-center gap-1.5">
                    {COVER_PRESETS.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCoverImage(c.url)}
                        className="text-[10px] px-2 py-0.5 rounded bg-black/70 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/20 cursor-pointer"
                      >
                        Thème {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="p-6 rounded-2xl bg-[#0a0f24] border border-cyan-500/30 space-y-4">
          <div className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-2 border-b border-cyan-500/20 pb-3">
            <Users className="w-4 h-4" />
            <span>3. Coordonnées de Contact & Bureau</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Email de la Rédaction</label>
              <input
                type="email"
                placeholder="contact@redaction.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#060b1c] border border-cyan-500/30 rounded-lg text-white text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Téléphone de Presse</label>
              <input
                type="tel"
                placeholder="+33 1 23 45 67 89"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#060b1c] border border-cyan-500/30 rounded-lg text-white text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Bureau / Siège</label>
              <input
                type="text"
                placeholder="Bureau Éditorial Central"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-[#060b1c] border border-cyan-500/30 rounded-lg text-white text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-cyan-400/80 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Action unique : vous serez enregistré comme Chef de Rédaction officiel.</span>
          </div>

          <button
            type="submit"
            disabled={submittingCreate}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-amber-400 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Crown className="w-4 h-4" />
            <span>{submittingCreate ? 'Fondation en cours...' : '🏛️ Fonder ma Maison de Presse'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
