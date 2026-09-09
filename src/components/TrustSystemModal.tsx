import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Building2,
  UserCheck,
  FileCheck2,
  Scale,
  SearchCheck,
  AlertTriangle,
  Lock,
  Award,
  Users,
  Bell,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { sfx } from '../services/soundEffects';

interface TrustSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  onOpenMediaHouses?: () => void;
}

export const TrustSystemModal: React.FC<TrustSystemModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onOpenMediaHouses,
}) => {
  const [activeTab, setActiveTab] = useState<'levels' | 'charter' | 'moderation' | 'difference'>('levels');

  if (!isOpen) return null;

  const handleClose = () => {
    sfx.playMechanicalClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#070913] border border-cyan-500/40 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,243,255,0.2)] text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-[#0a0f24] to-emerald-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-emerald-500/20 to-cyan-400/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                  Système de Confiance & Vérification
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  Déontologie Certifiée
                </span>
              </div>
              <p className="text-xs text-cyan-400/70 font-mono mt-0.5">
                Comprendre d’où vient l’information et comment nous garantissons sa crédibilité
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-cyan-400/60 hover:text-white hover:bg-cyan-500/20 transition-all cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-cyan-500/15 bg-[#090d1f] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => {
              sfx.playMechanicalClick();
              setActiveTab('levels');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'levels'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_12px_rgba(0,243,255,0.4)]'
                : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3 Niveaux de Vérification</span>
          </button>

          <button
            onClick={() => {
              sfx.playMechanicalClick();
              setActiveTab('difference');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'difference'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-black shadow-[0_0_12px_rgba(0,255,157,0.4)]'
                : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/10'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Différence avec les Réseaux Sociaux</span>
          </button>

          <button
            onClick={() => {
              sfx.playMechanicalClick();
              setActiveTab('moderation');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'moderation'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Modération & Signalements</span>
          </button>

          <button
            onClick={() => {
              sfx.playMechanicalClick();
              setActiveTab('charter');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'charter'
                ? 'bg-gradient-to-r from-blue-700 to-cyan-400 text-white shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/10'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Charte Déontologique</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm leading-relaxed">
          {/* TAB 1: 3 LEVELS OF VERIFICATION */}
          {activeTab === 'levels' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 leading-relaxed">
                <span className="font-bold text-cyan-300">Principe fondamental :</span> Sur notre plateforme, nous n'affichons jamais un badge « vérifié » sans transparence. Le lecteur dispose de trois repères explicites pour évaluer la source et le contenu d'un article.
              </div>

              {/* LEVEL 1: JOURNALISTE VÉRIFIÉ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1226] border border-cyan-500/40 shadow-[0_0_20px_rgba(0,243,255,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-white text-base">1. Journaliste Vérifié</h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        Badge Bleu
                      </span>
                    </div>
                    <p className="text-xs text-cyan-300/80 font-mono mt-0.5">Identité et statut professionnel vérifiés</p>

                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                      Ce badge certifie que la personne qui publie est un(e) véritable journaliste professionnel(le) dont l'identité civile, le numéro de carte de presse officielle et la légitimité professionnelle ont été examinés et validés par l'administration de la plateforme.
                    </p>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#070913] border border-cyan-500/20 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Carte de presse vérifiée</span>
                          <span className="text-[11px] text-cyan-400/70">Conformité aux registres des organes de régulation.</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#070913] border border-cyan-500/20 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Responsabilité éditoriale</span>
                          <span className="text-[11px] text-cyan-400/70">Articles signés et soumis au droit de la presse.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LEVEL 2: MAISON DE PRESSE VÉRIFIÉE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1226] border border-emerald-500/40 shadow-[0_0_20px_rgba(0,255,157,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-white text-base">2. Maison de Presse Vérifiée</h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Badge Émeraude
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300/80 font-mono mt-0.5">Organisation officiellement identifiée et agréée</p>

                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                      Ce badge atteste que l'organe de presse ou la rédaction est une organisation médiatique reconnue (journal, radio, télévision, agence de presse ou média numérique officiel). Elle dispose d'une ligne éditoriale claire et d'une équipe de journalistes rattachés.
                    </p>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#070913] border border-emerald-500/20 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Collectif de journalistes</span>
                          <span className="text-[11px] text-emerald-400/70">Rédaction constituée avec chef de rédaction identifié.</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#070913] border border-emerald-500/20 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Agrément légal & siège</span>
                          <span className="text-[11px] text-emerald-400/70">Immatriculation média et transparence de gouvernance.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LEVEL 3: ARTICLE VÉRIFIÉ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1226] border border-cyan-500/40 shadow-[0_0_20px_rgba(0,243,255,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-white text-base">3. Article Vérifié</h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                        Protocole Fact-Checking
                      </span>
                    </div>
                    <p className="text-xs text-cyan-300/80 font-mono mt-0.5">Article publié par une source identifiée et vérifiée</p>

                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                      L'article a été rédigé par un journaliste ou une maison de presse accréditée. Il cite expressément ses sources documentaires, témoins ou procès-verbaux officiels, et bénéficie d'une traçabilité de modifications transparente.
                    </p>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#070913] border border-cyan-500/20 flex items-start gap-2">
                        <SearchCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Recoupement croisé</span>
                          <span className="text-[11px] text-cyan-400/70">Sources institutionnelles, archives ou constat de terrain.</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#070913] border border-cyan-500/20 flex items-start gap-2">
                        <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Sceau d’intégrité numérique</span>
                          <span className="text-[11px] text-cyan-400/70">Empreinte SHA-256 et horodatage certifié.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIFFERENCE WITH SOCIAL MEDIA */}
          {activeTab === 'difference' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#0a1228] to-emerald-950/40 border border-cyan-500/30">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-cyan-400" />
                  <span>La différence avec Facebook, TikTok ou WhatsApp</span>
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Sur les réseaux sociaux traditionnels, n'importe quel utilisateur peut créer une page en quelques secondes, s'auto-proclamer « journaliste » et diffuser des rumeurs incontrôlées pour accumuler des clics et des partages.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Social networks box */}
                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider font-mono">
                    <X className="w-4 h-4" />
                    <span>Réseaux Sociaux Classiques</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">•</span>
                      <span>Publication ouverte à tous sans contrôle d'identité ni qualification.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">•</span>
                      <span>Algorithmes favorisant le clash, le sensationnalisme et l'émotion brute.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">•</span>
                      <span>Diffusion virale de fake news impossible à stopper avant des heures.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 font-bold">•</span>
                      <span>Difficulté totale pour le citoyen de distinguer le vrai du faux.</span>
                    </li>
                  </ul>
                </div>

                {/* Our platform box */}
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider font-mono">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Notre Espace Journalistique</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Publication d'articles strictement réservée aux professionnels accrédités.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Sources, citations et pièces justificatives obligatoires et consultables.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Responsabilité directe des journalistes et des rédactions (Maisons de presse).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Communauté de lecteurs active : commentaires courtois, veille et signalement citoyen.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0d1226] border border-cyan-500/20 text-xs text-slate-300">
                <span className="font-bold text-white block mb-1">Une « Maison Numérique du Journalisme »</span>
                Notre objectif n'est pas de concurrencer les réseaux sociaux sur le buzz, mais de construire une référence solide, un repère de confiance où les citoyens viennent s'informer sereinement avec la certitude de la véracité des faits.
              </div>
            </div>
          )}

          {/* TAB 3: MODERATION & REPORTING */}
          {activeTab === 'moderation' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/40 text-xs text-slate-200 leading-relaxed">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Règles Impératives de Modération</span>
                </div>
                Pour maintenir la crédibilité absolue de la plateforme, aucun article ne peut contenir d'informations mensongères ou abusives. Notre équipe applique une politique stricte conformément au droit de l'information.
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
                  Motifs d'intervention immédiate de l'équipe de modération :
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-[#0d1226] border border-cyan-500/20">
                    <span className="font-bold text-red-300 block">1. Fausses informations volontaires</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Propagation délibérée d'infox (fake news) ou de rumeurs non vérifiées.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0d1226] border border-cyan-500/20">
                    <span className="font-bold text-red-300 block">2. Propos diffamatoires</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Attaques injustifiées, atteintes à l'honneur ou injures publiques.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0d1226] border border-cyan-500/20">
                    <span className="font-bold text-red-300 block">3. Contenus illégaux</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Incitation à la haine, discrimination, violence ou apologie de crimes.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0d1226] border border-cyan-500/20">
                    <span className="font-bold text-red-300 block">4. Hors-sujet journalistique</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Publicités déguisées, spam, clickbait ou buzz personnel sans intérêt public.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0d1226] border border-cyan-500/20">
                    <span className="font-bold text-red-300 block">5. Usurpation d'identité</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Tentative de se faire passer pour un journaliste ou un média sans accréditation.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0d1226] border border-cyan-500/20">
                    <span className="font-bold text-red-300 block">6. Plagiat & Violation de droits</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Copie intégrale sans citation ni accord de l'auteur original.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white block mb-0.5">Le signalement citoyen en 1 clic</span>
                  Sur chaque article et chaque commentaire, un bouton « Signaler » permet à n'importe quel lecteur d'alerter instantanément nos modérateurs avec motif et explications. Les contenus signalés font l'objet d'un examen contradictoire.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEONTOLOGY CHARTER */}
          {activeTab === 'charter' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0d1226] border border-cyan-500/30 text-xs text-slate-300 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Award className="w-4 h-4" />
                  <span>La Charte Déontologique des Journalistes Accrédités</span>
                </div>
                <p className="leading-relaxed">
                  Tout journaliste publiant sur notre plateforme s'engage solennellement à respecter les principes fondamentaux de la profession, tels que stipulés par la Déclaration de Munich et les chartes nationales de la presse :
                </p>

                <div className="space-y-2 pt-2 border-t border-cyan-500/15">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-mono font-bold">01.</span>
                    <span><strong>Respect de la vérité :</strong> Défendre la vérité des faits quelles qu'en soient les conséquences.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-mono font-bold">02.</span>
                    <span><strong>Vérification obligatoire :</strong> Ne publier que des informations dont l'origine est connue et vérifiée.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-mono font-bold">03.</span>
                    <span><strong>Droit de rectification :</strong> Rectifier publiquement toute information diffusée qui se révélerait inexacte.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-mono font-bold">04.</span>
                    <span><strong>Secret professionnel :</strong> Garder le secret professionnel et protéger la confidentialité des sources.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-mono font-bold">05.</span>
                    <span><strong>Indépendance :</strong> Refuser toute pression, rétribution occulte ou conflit d'intérêts incompatible avec la mission d'informer.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-cyan-500/20 bg-[#070a16] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-cyan-400/70 font-mono">
            <span>SASAKI COMPAGNIE</span>
            <span>•</span>
            <span>Garantie d'intégrité journalistique</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onOpenMediaHouses && (
              <button
                onClick={() => {
                  handleClose();
                  onOpenMediaHouses();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 transition-all cursor-pointer"
              >
                Explorer les Maisons de Presse
              </button>
            )}

            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-xl text-xs font-bold font-mono text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
