import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  FileText,
  Eye,
  Heart,
  MessageSquare,
  Users,
  CheckCircle2,
  Edit2,
  Trash2,
  Send,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Video as VideoIcon,
  UploadCloud,
  Copy,
  Check,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { Article, User, MediaRecord, MediaHouse } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MediaUploader } from './media/MediaUploader';
import { getThumbnailUrl } from '../services/cloudinary';
import { VerifiedBadge } from './VerifiedBadge';

interface JournalistDashboardModalProps {
  onClose: () => void;
  onOpenCreateArticle: () => void;
  onOpenEditArticle: (article: Article) => void;
  onOpenArticle: (article: Article) => void;
  onOpenMediaHouses?: () => void;
}

export const JournalistDashboardModal: React.FC<JournalistDashboardModalProps> = ({
  onClose,
  onOpenCreateArticle,
  onOpenEditArticle,
  onOpenArticle,
  onOpenMediaHouses,
}) => {
  const { user, refreshUser } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articles' | 'verification' | 'media'>('articles');
  const [myHouse, setMyHouse] = useState<MediaHouse | null>(null);

  // Media library state
  const [mediaList, setMediaList] = useState<MediaRecord[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all');
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [mediaFeedback, setMediaFeedback] = useState<string | null>(null);

  // Verification form state
  const [pressCardNumber, setPressCardNumber] = useState('');
  const [motivation, setMotivation] = useState('');
  const [mediaNameInput, setMediaNameInput] = useState(user?.mediaName || '');
  const [submittingVerif, setSubmittingVerif] = useState(false);
  const [verifMessage, setVerifMessage] = useState<string | null>(null);

  const loadJournalistArticles = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getArticles({ authorId: user.id });
      setArticles(res.articles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getMyMediaHouse()
      .then((res) => {
        if (res.house) setMyHouse(res.house);
      })
      .catch(() => {});
  }, [user]);

  const loadMediaList = async () => {
    if (!user) return;
    setLoadingMedia(true);
    try {
      const res = await api.getMediaRecords({
        type: mediaFilter === 'all' ? undefined : mediaFilter,
      });
      setMediaList(res.mediaRecords || []);
    } catch (err: any) {
      console.error('Failed to load journalist media:', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    loadJournalistArticles();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'media') {
      loadMediaList();
    }
  }, [activeTab, mediaFilter, user]);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleDeleteMedia = async (record: MediaRecord) => {
    if (!confirm(`Supprimer le média "${record.altText || record.publicId}" ? Le serveur vérifiera qu'aucun article actif ne l'utilise.`)) {
      return;
    }
    try {
      await api.deleteMediaRecord(record.publicId);
      setMediaFeedback('Média supprimé avec succès.');
      setTimeout(() => setMediaFeedback(null), 3000);
      loadMediaList();
    } catch (err: any) {
      setMediaFeedback(`Erreur : ${err.message}`);
      setTimeout(() => setMediaFeedback(null), 4000);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Supprimer définitivement cet article ?')) return;
    try {
      await api.deleteArticle(id);
      loadJournalistArticles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pressCardNumber.trim() || !motivation.trim()) return;

    setSubmittingVerif(true);
    setVerifMessage(null);
    try {
      const res = await api.requestVerification({
        pressCardNumber: pressCardNumber.trim(),
        motivation: motivation.trim(),
        mediaName: mediaNameInput.trim() || undefined,
      });
      setVerifMessage(res.message);
      await refreshUser();
    } catch (err: any) {
      setVerifMessage(`Erreur: ${err.message}`);
    } finally {
      setSubmittingVerif(false);
    }
  };

  const totalViews = articles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
  const totalLikes = articles.reduce((sum, a) => sum + (a.likesCount || 0), 0);
  const totalComments = articles.reduce((sum, a) => sum + (a.commentsCount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b0e1a] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,243,255,0.25)] overflow-hidden flex flex-col my-4 max-h-[92vh] text-slate-100 transition-all">
        {/* Top Header */}
        <div className="bg-[#101428] border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between shrink-0 transition-all">
          <div className="flex items-center gap-2.5">
            <img
              src={user?.avatar}
              alt={user?.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.3)]"
            />
            <div>
              <h2 className="text-base font-black font-mono text-white flex items-center gap-1.5">
                <span>Espace Journaliste & Rédaction</span>
                {user?.isVerified && (
                  <VerifiedBadge size="sm" type="journalist" />
                )}
              </h2>
              <p className="text-xs text-cyan-400/70 font-mono">
                {user?.mediaName ? `${user.mediaName} • ` : ''}
                {user?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenCreateArticle();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white rounded-lg text-xs font-bold font-mono shadow-[0_0_15px_rgba(0,210,255,0.4)] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvel article</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-cyan-400/60 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 bg-[#0e1224] border-b border-cyan-500/30 shrink-0 transition-all space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3.5 rounded-xl bg-[#101428] border border-cyan-500/30 shadow-[0_0_10px_rgba(0,243,255,0.05)]">
              <div className="flex items-center gap-1.5 text-cyan-400/80 text-xs font-semibold">
                <FileText className="w-3.5 h-3.5 text-cyan-400" /> Articles
              </div>
              <div className="mt-1 text-xl font-black text-white">{articles.length}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#101428] border border-cyan-500/30 shadow-[0_0_10px_rgba(0,243,255,0.05)]">
              <div className="flex items-center gap-1.5 text-cyan-400/80 text-xs font-semibold">
                <Eye className="w-3.5 h-3.5 text-cyan-400" /> Lectures
              </div>
              <div className="mt-1 text-xl font-black text-white">{totalViews.toLocaleString()}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#101428] border border-cyan-500/30 shadow-[0_0_10px_rgba(0,243,255,0.05)]">
              <div className="flex items-center gap-1.5 text-cyan-400/80 text-xs font-semibold">
                <Heart className="w-3.5 h-3.5 text-cyan-400" /> Likes reçus
              </div>
              <div className="mt-1 text-xl font-black text-white">{totalLikes}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#101428] border border-cyan-500/30 shadow-[0_0_10px_rgba(0,243,255,0.05)]">
              <div className="flex items-center gap-1.5 text-cyan-400/80 text-xs font-semibold">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Abonnés
              </div>
              <div className="mt-1 text-xl font-black text-white">
                {(user?.followersCount || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Media House Affiliation Bar */}
          <div className="p-3.5 rounded-xl bg-[#101428] border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-[11px] text-cyan-400/70 uppercase font-bold tracking-wider">
                  Maison de Journalistes (Quota max 5)
                </div>
                {myHouse ? (
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>{myHouse.name}</span>
                    <span className="text-cyan-400 text-xs font-normal">
                      ({myHouse.members?.length || 1}/5 journalistes)
                    </span>
                    {myHouse.ownerId === user?.id ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-500/40">
                        Chef de Rédaction
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                        Membre
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-300 text-xs">
                    Non affilié — Vous publiez actuellement en tant que journaliste indépendant
                  </div>
                )}
              </div>
            </div>

            {onOpenMediaHouses && (
              <button
                type="button"
                onClick={onOpenMediaHouses}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{myHouse ? 'Gérer ma Maison' : 'Fonder / Rejoindre une Maison'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyan-500/30 px-6 bg-[#101428] shrink-0 font-mono transition-all">
          <button
            onClick={() => setActiveTab('articles')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'articles'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            Mes Articles ({articles.length})
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'verification'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Vérification & Badge officiel</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'media'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Médiathèque Cloud ({mediaList.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'articles' ? (
            loading ? (
              <div className="p-12 text-center text-cyan-400/60 font-mono">Chargement de vos publications...</div>
            ) : articles.length === 0 ? (
              <div className="p-12 text-center text-cyan-400/60 font-mono">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-cyan-400" />
                <p>Vous n'avez pas encore rédigé d'articles.</p>
                <button
                  onClick={() => {
                    onOpenCreateArticle();
                    onClose();
                  }}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white rounded-lg text-xs font-bold font-mono shadow-[0_0_15px_rgba(0,210,255,0.3)] cursor-pointer"
                >
                  Rédiger mon premier article
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((art) => (
                  <div
                    key={art.id}
                    className="p-4 rounded-xl bg-[#101428] border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-cyan-400/60"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-lg object-cover border border-cyan-500/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141933] border border-cyan-500/30 text-cyan-300">
                            {art.categoryName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              art.status === 'published'
                                ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-300'
                                : 'bg-blue-950/70 border border-blue-500/40 text-cyan-300'
                            }`}
                          >
                            {art.status === 'published' ? 'En ligne' : 'Brouillon'}
                          </span>
                        </div>
                        <h4
                          onClick={() => {
                            onOpenArticle(art);
                            onClose();
                          }}
                          className="mt-1 font-bold text-sm text-white hover:text-cyan-300 cursor-pointer truncate"
                        >
                          {art.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-3 text-xs text-cyan-400/60 font-mono">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {art.viewsCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-cyan-400" /> {art.likesCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> {art.commentsCount}
                          </span>
                          <span>•</span>
                          <span>{new Date(art.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onOpenEditArticle(art);
                          onClose();
                        }}
                        className="p-2 text-cyan-400 hover:text-cyan-200 hover:bg-[#141933] border border-cyan-500/30 rounded-lg cursor-pointer transition"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(art.id)}
                        className="p-2 text-red-400 hover:text-red-200 hover:bg-red-950/40 border border-red-500/30 rounded-lg cursor-pointer transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'verification' ? (
            /* TAB: VERIFICATION */
            <div className="max-w-xl space-y-6">
              {/* Audience & Auto-certification Progress Card */}
              <div className="p-5 rounded-2xl bg-[#101428] border border-cyan-500/40 space-y-3 shadow-[0_0_20px_rgba(0,243,255,0.1)]">
                <div className="flex items-start gap-3">
                  <VerifiedBadge size="md" type="journalist" />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Certification Officielle (Badge Bleu Style TikTok)</span>
                      {user?.isVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                          Actif
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-cyan-400/70 mt-0.5">
                      Règle de la plateforme : tout journaliste atteignant <strong>50 abonnés</strong> obtient automatiquement son badge de certification officiel. L'administrateur peut également accorder la certification directement à tout moment.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#141933] rounded-xl border border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300">Votre communauté :</span>
                    <span className="text-cyan-300 font-bold">{user?.followersCount || 0} / 50 abonnés</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round(((user?.followersCount || 0) / 50) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-cyan-400/80 flex items-center justify-between">
                    <span>
                      {user?.isVerified
                        ? '✓ Compte certifié'
                        : (user?.followersCount || 0) >= 50
                        ? '✓ Seuil de 50 abonnés atteint'
                        : `Plus que ${Math.max(0, 50 - (user?.followersCount || 0))} abonnés pour la certification automatique`}
                    </span>
                  </div>
                </div>
              </div>

              {user?.isVerified ? (
                <div className="p-6 rounded-2xl bg-[#101428] border border-cyan-500/40 text-cyan-300 shadow-[0_0_20px_rgba(0,243,255,0.15)]">
                  <div className="flex items-center gap-2 font-black font-mono text-lg text-white">
                    <VerifiedBadge size="md" type="journalist" />
                    <span>Compte Journaliste / Média Certifié</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed font-mono">
                    Votre statut professionnel est vérifié par le Conseil Supérieur de la Communication (CSC) et
                    l'administration de purge-info. Le badge bleu officiel est actif à côté de votre nom sur tous vos articles.
                  </p>
                </div>
              ) : user?.verificationStatus === 'pending' ? (
                <div className="p-6 rounded-2xl bg-[#101428] border border-blue-500/40 text-cyan-300">
                  <div className="flex items-center gap-2 font-bold font-mono text-base text-white">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <span>Demande de vérification en cours d’examen</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed font-mono">
                    Vos documents ont été transmis à l’équipe de modération. Vous recevrez une notification dès que
                    l'administration aura validé votre carte de presse.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendVerification} className="space-y-4 font-mono">
                  <div>
                    <h3 className="text-sm font-bold text-white">Demander le badge de vérification officielle</h3>
                    <p className="text-xs text-cyan-400/60 mt-1">
                      Réservé aux journalistes détenteurs d'une carte de presse valide ou aux maisons de presse déclarées.
                    </p>
                  </div>

                  {verifMessage && (
                    <div className="p-3 rounded-xl bg-[#141933] border border-cyan-500/40 text-cyan-300 text-xs font-semibold">
                      {verifMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      Nom du Média ou Organe de Presse
                    </label>
                    <input
                      type="text"
                      value={mediaNameInput}
                      onChange={(e) => setMediaNameInput(e.target.value)}
                      placeholder="Ex: L'Observateur International"
                      className="w-full px-3 py-2 text-xs bg-[#141933] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      Numéro de carte de presse ou récépissé légal *
                    </label>
                    <input
                      type="text"
                      required
                      value={pressCardNumber}
                      onChange={(e) => setPressCardNumber(e.target.value)}
                      placeholder="Ex: BF-PRESS-2026-XXXX"
                      className="w-full px-3 py-2 text-xs bg-[#141933] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 font-mono shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      Motivation & Parcours journalistique *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                      placeholder="Indiquez vos spécialités, vos collaborations antérieures et vos engagements déontologiques..."
                      className="w-full px-3 py-2 text-xs bg-[#141933] border border-cyan-500/40 text-white rounded-lg focus:outline-none focus:border-cyan-400 resize-none shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingVerif}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingVerif ? 'Envoi en cours...' : 'Soumettre ma demande à l’administration'}</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Media Library Tab for Journalist */
            <div className="space-y-4">
              {mediaFeedback && (
                <div className="p-3 bg-[#141933] text-cyan-300 text-xs font-mono font-semibold rounded-xl flex items-center gap-2 border border-cyan-500/40">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{mediaFeedback}</span>
                </div>
              )}

              {/* Action and Filter Header */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101428] p-3.5 rounded-xl border border-cyan-500/30 transition-all font-mono">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      mediaFilter === 'all'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-400 text-white shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                        : 'bg-[#141933] text-cyan-300 border border-cyan-500/30 hover:border-cyan-400'
                    }`}
                  >
                    Tous ({mediaList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaFilter('image')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      mediaFilter === 'image'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-400 text-white shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                        : 'bg-[#141933] text-cyan-300 border border-cyan-500/30 hover:border-cyan-400'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaFilter('video')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      mediaFilter === 'video'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-400 text-white shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                        : 'bg-[#141933] text-cyan-300 border border-cyan-500/30 hover:border-cyan-400'
                    }`}
                  >
                    <VideoIcon className="w-3 h-3" />
                    Vidéos
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMediaUploader(!showMediaUploader)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(0,210,255,0.3)] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{showMediaUploader ? 'Fermer l’outil d’envoi' : 'Téléverser un média Cloud'}</span>
                </button>
              </div>

              {/* Uploader section */}
              {showMediaUploader && (
                <div className="p-4 bg-[#101428] border border-cyan-500/40 rounded-xl shadow-xs space-y-2">
                  <h4 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
                    Nouveau téléversement Cloudinary sécurisé
                  </h4>
                  <MediaUploader
                    type="image"
                    usageType="article_gallery"
                    showAltInput={true}
                    showCaptionInput={true}
                    onChange={() => {
                      setMediaFeedback('Fichier téléversé avec succès !');
                      loadMediaList();
                      setShowMediaUploader(false);
                      setTimeout(() => setMediaFeedback(null), 3000);
                    }}
                  />
                </div>
              )}

              {/* Media items grid */}
              {loadingMedia ? (
                <div className="py-12 text-center text-cyan-400/60 font-mono text-xs">
                  Chargement de vos ressources multimédias...
                </div>
              ) : mediaList.length === 0 ? (
                <div className="py-12 text-center bg-[#101428] rounded-xl border border-cyan-500/30 p-6 font-mono">
                  <ImageIcon className="w-8 h-8 text-cyan-500/40 mx-auto mb-2" />
                  <p className="text-xs font-bold text-cyan-300">Aucun média dans votre bibliothèque</p>
                  <p className="text-[11px] text-cyan-400/60 mt-0.5">
                    Téléversez vos photos et vidéos de reportage pour les intégrer à vos articles.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaList.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#101428] rounded-xl border border-cyan-500/30 overflow-hidden shadow-2xs group flex flex-col justify-between hover:border-cyan-400/60 transition-all"
                    >
                      <div className="relative aspect-video bg-[#0e1224] overflow-hidden">
                        {item.resourceType === 'video' ? (
                          <div className="w-full h-full bg-[#0b0e1a] flex items-center justify-center">
                            <VideoIcon className="w-6 h-6 text-cyan-400/70" />
                          </div>
                        ) : (
                          <img
                            src={getThumbnailUrl(item.url, 280)}
                            alt={item.altText || item.publicId}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        )}

                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-cyan-300 font-mono border border-cyan-500/40 backdrop-blur-xs">
                          {item.format ? item.format.toUpperCase() : item.resourceType.toUpperCase()}
                        </span>
                      </div>

                      <div className="p-2.5 space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-200 truncate font-mono" title={item.altText || item.publicId}>
                          {item.altText || item.publicId}
                        </p>

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-cyan-500/20">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(item.url)}
                            title="Copier le lien Cloudinary"
                            className="p-1 text-cyan-400 hover:text-cyan-200 hover:bg-[#141933] rounded transition flex items-center gap-1 text-[10px] font-mono cursor-pointer"
                          >
                            {copiedUrl === item.url ? (
                              <>
                                <Check className="w-3 h-3 text-cyan-400" />
                                <span className="text-cyan-400 font-bold">Copié</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Lien</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-cyan-400/60 hover:text-cyan-200 rounded transition"
                              title="Ouvrir dans un nouvel onglet"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteMedia(item)}
                              className="p-1 text-red-400/70 hover:text-red-300 rounded transition cursor-pointer"
                              title="Supprimer ce média"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
