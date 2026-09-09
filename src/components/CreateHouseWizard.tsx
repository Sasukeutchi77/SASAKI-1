import React, { useState } from 'react';
import {
  Building2,
  Crown,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Tag,
  Shield,
  Phone,
  Mail,
  MapPin,
  Globe,
  Plus,
} from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

const HOUSE_NAME_SUGGESTIONS = [
  'Le Courrier International',
  'L\'Éclair Mondial',
  'La Sentinelle des Peuples',
  'Vérité & Démocratie',
  'Global News Tribune',
  'Le Flambeau Citoyen',
  'Investigation Directe',
  'L\'Observatoire Indépendant',
];

const SPECIALTY_OPTIONS = [
  'Investigation',
  'Politique & Diplomatie',
  'Société & Droits',
  'Économie & Finance',
  'Géopolitique',
  'Culture & Arts',
  'Technologies & IA',
  'Environnement & Climat',
  'Fact-Checking & Vérité',
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

interface CreateHouseWizardProps {
  user: User;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  showMsg: (type: 'success' | 'error', message: string) => void;
}

export const CreateHouseWizard: React.FC<CreateHouseWizardProps> = ({
  user,
  onSuccess,
  onCancel,
  showMsg,
}) => {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [motto, setMotto] = useState<string>('L\'information vérifiée, sans concession.');
  const [description, setDescription] = useState<string>('');
  const [specialties, setSpecialties] = useState<string[]>(['Investigation', 'Économie & Finance', 'Société']);
  const [logo, setLogo] = useState<string>(LOGO_PRESETS[0].url);
  const [cover, setCover] = useState<string>(COVER_PRESETS[0].url);
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('Bureau Éditorial Central');
  const [creating, setCreating] = useState<boolean>(false);

  const toggleSpecialty = (spec: string) => {
    if (specialties.includes(spec)) {
      setSpecialties(specialties.filter((s) => s !== spec));
    } else {
      setSpecialties([...specialties, spec]);
    }
  };

  const handleFinish = async () => {
    if (!name.trim() || name.trim().length < 3) {
      showMsg('error', 'Le nom de la maison doit comporter au moins 3 caractères.');
      setStep(1);
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      showMsg('error', 'Veuillez préciser une ligne éditoriale détaillée (au moins 10 caractères).');
      setStep(2);
      return;
    }

    setCreating(true);
    try {
      const res = await api.createMediaHouse({
        name: name.trim(),
        motto: motto.trim(),
        description: description.trim(),
        specialties,
        logo: logo.trim() || undefined,
        coverImage: cover.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });

      showMsg('success', res.message || 'Maison de journalistes fondée avec succès !');
      await onSuccess();
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la création de la maison.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Wizard Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-stone-900 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Fondation d'une Nouvelle Maison de Journalistes
          </h3>
          <p className="text-xs text-stone-300 mt-0.5">
            Vous deviendrez le Chef de Rédaction et pourrez recruter jusqu'à 4 confrères accrédités.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition ${
                step === s
                  ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,243,255,0.4)]'
                  : step > s
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-stone-800 text-stone-500'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Step Forms */}
        <div className="lg:col-span-7 space-y-4">
          {/* STEP 1: Name & Devise */}
          {step === 1 && (
            <div className="p-5 rounded-2xl bg-stone-900 border border-cyan-500/30 space-y-4 animate-fadeIn">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" /> Étape 1 • Identité & Devise de la Rédaction
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Nom de la Maison de Journalistes *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Le Courrier International, La Tribune Citoyenne..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />

                {/* Suggestions pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-stone-400 py-0.5">Idées :</span>
                  {HOUSE_NAME_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setName(sug)}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-stone-950 border border-stone-800 text-stone-400 hover:text-cyan-300 transition cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Devise / Slogan déontologique
                </label>
                <input
                  type="text"
                  placeholder="Ex: L'information vérifiée, sans concession."
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Chef de Rédaction (Fondateur)
                </label>
                <div className="p-2.5 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-300 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <strong>{user.name}</strong> ({user.email})
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Ligne éditoriale & Spécialités */}
          {step === 2 && (
            <div className="p-5 rounded-2xl bg-stone-900 border border-cyan-500/30 space-y-4 animate-fadeIn">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" /> Étape 2 • Ligne Éditoriale & Domaines d'Enquête
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Ligne éditoriale détaillée *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Expliquez la mission de votre maison, vos engagements déontologiques, vos angles d'investigation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-300">
                  Thématiques & Domaines d'expertise
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map((spec) => {
                    const isSelected = specialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                        }`}
                      >
                        #{spec}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Visuels */}
          {step === 3 && (
            <div className="p-5 rounded-2xl bg-stone-900 border border-cyan-500/30 space-y-4 animate-fadeIn">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Étape 3 • Identité Visuelle de Presse
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Logo officiel (URL)
                </label>
                <input
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {LOGO_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setLogo(p.url)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] border transition cursor-pointer ${
                        logo === p.url
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                          : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Bannière de couverture (URL)
                </label>
                <input
                  type="url"
                  value={cover}
                  onChange={(e) => setCover(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {COVER_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setCover(p.url)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] border transition cursor-pointer ${
                        cover === p.url
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                          : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Coordonnées de presse */}
          {step === 4 && (
            <div className="p-5 rounded-2xl bg-stone-900 border border-cyan-500/30 space-y-4 animate-fadeIn">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" /> Étape 4 • Coordonnées du Siège de Presse
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Téléphone / WhatsApp Rédaction
                  </label>
                  <input
                    type="text"
                    placeholder="+226 XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Email de Presse
                  </label>
                  <input
                    type="email"
                    placeholder="redaction@..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Adresse officielle du siège
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Charter Confirmation */}
              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200/90 leading-relaxed">
                En fondant cette maison, vous vous engagez à respecter la charte déontologique de PURGE-INFO, à n'intégrer que des confrères certifiés (5 maximum) et à vérifier rigoureusement vos sources avant publication.
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={step === 1 ? onCancel : () => setStep(step - 1)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {step === 1 ? 'Annuler' : 'Étape précédente'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!name.trim() || name.trim().length < 3)) {
                    showMsg('error', 'Le nom doit comporter au moins 3 caractères.');
                    return;
                  }
                  setStep(step + 1);
                }}
                className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,243,255,0.3)] cursor-pointer"
              >
                <span>Suivant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={creating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black text-xs font-black transition flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.4)] disabled:opacity-50 cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                {creating ? 'Fondation en cours...' : 'Fonder la Maison et Devenir Chef'}
              </button>
            )}
          </div>
        </div>

        {/* Right column: Live Accreditation Card Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            Aperçu en Direct • Carte d'Accréditation
          </div>

          <div className="rounded-2xl overflow-hidden border border-cyan-500/40 bg-[#0c101a] shadow-xl">
            {/* Banner preview */}
            <div className="h-28 w-full overflow-hidden relative">
              <img
                src={cover || COVER_PRESETS[0].url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c101a] to-transparent" />
            </div>

            {/* Profile overlay */}
            <div className="p-4 -mt-8 relative z-10 space-y-3">
              <div className="flex items-end gap-3">
                <img
                  src={logo || LOGO_PRESETS[0].url}
                  alt="Logo"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-cyan-400 bg-black shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-base font-black text-white truncate">
                    {name || 'Nom de la Maison'}
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Chef : <strong className="text-amber-300">{user.name}</strong>
                  </p>
                </div>
              </div>

              {motto && (
                <div className="text-xs italic text-cyan-300/90 font-serif border-l-2 border-cyan-400 pl-2">
                  « {motto} »
                </div>
              )}

              <p className="text-xs text-stone-300 line-clamp-3">
                {description || 'Ligne éditoriale de la maison...'}
              </p>

              {/* Specialties */}
              <div className="flex flex-wrap gap-1 pt-1">
                {specialties.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded text-[9px] bg-stone-900 text-stone-300 border border-stone-800"
                  >
                    #{s}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                <span>Quota initial : 1 / 5 Journalistes</span>
                <span className="text-emerald-400">Accréditée</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
