import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Users,
  Shield,
  Crown,
  UserPlus,
  UserMinus,
  CheckCircle2,
  FileText,
  ExternalLink,
  Plus,
  AlertTriangle,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { MediaHouse, User, Article } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { realtime } from '../services/realtime';

const LOGO_PRESETS = [
  { name: 'Investigation', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=200&auto=format&fit=crop&q=80' },
  { name: 'Économie', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&auto=format&fit=crop&q=80' },
  { name: 'Tech & IA', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80' },
  { name: 'Culture & Société', url: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=200&auto=format&fit=crop&q=80' },
  { name: 'Sahel & AES', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=200&auto=format&fit=crop&q=80' },
];

const COVER_PRESETS = [
  { name: 'Rédaction Moderne', url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Studio News', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Plateau Média', url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80' },
];

interface MediaHousesModalProps {
  onClose: () => void;
  onOpenArticle?: (article: Article) => void;
  onOpenProfile?: () => void;
  initialTab?: 'explore' | 'my-house' | 'governance';
}

export const MediaHousesModal: React.FC<MediaHousesModalProps> = ({
  onClose,
  onOpenArticle,
  onOpenProfile,
  initialTab = 'explore',
}) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'explore' | 'my-house' | 'governance'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Houses list state
  const [houses, setHouses] = useState<MediaHouse[]>([]);
  const [loadingHouses, setLoadingHouses] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Current user's house state
  const [myHouse, setMyHouse] = useState<MediaHouse | null>(null);
  const [isChef, setIsChef] = useState<boolean>(false);
  const [loadingMyHouse, setLoadingMyHouse] = useState<boolean>(true);
  const [availableJournalists, setAvailableJournalists] = useState<(User & { isAvailable: boolean })[]>([]);
  const [selectedJournalistId, setSelectedJournalistId] = useState<string>('');
  const [addingMember, setAddingMember] = useState<boolean>(false);

  // Selected house for detailed view
  const [selectedHouseDetail, setSelectedHouseDetail] = useState<{ house: MediaHouse; articles: Article[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Creation form state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newLogo, setNewLogo] = useState<string>('');
  const [newCover, setNewCover] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('Ouagadougou, Burkina Faso');
  const [creatingHouse, setCreatingHouse] = useState<boolean>(false);

  // Master accounts state
  const [masterAccounts, setMasterAccounts] = useState<any[]>([]);

  // Feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showMsg = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadHouses = async () => {
    setLoadingHouses(true);
    try {
      const res = await api.getMediaHouses();
      setHouses(res.mediaHouses || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHouses(false);
    }
  };

  const loadMyHouse = async () => {
    if (!user) return;
    setLoadingMyHouse(true);
    try {
      const res = await api.getMyMediaHouse();
      setMyHouse(res.house);
      setIsChef(!!res.isChef);

      if (res.isChef || user.role === 'admin') {
        const jRes = await api.getAvailableJournalists();
        setAvailableJournalists(jRes.journalists || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyHouse(false);
    }
  };

  const loadMasterAccounts = async () => {
    try {
      const res = await api.getMasterAccounts();
      setMasterAccounts(res.masterAccounts || []);
    } catch (err) {
      // Fallback
      setMasterAccounts([
        { email: 'astaimperial45t@gmail.com', name: 'Asta Imperial (Fondateur Principal)', isRegistered: true, role: 'admin' },
        { email: 'direction.purge@gmail.com', name: 'Direction Éditoriale PURGE-INFO', isRegistered: true, role: 'admin' },
      ]);
    }
  };

  useEffect(() => {
    loadHouses();
    loadMasterAccounts();
    if (user) {
      loadMyHouse();
    }

    const unsubHouseCreated = realtime.on('mediaHouse:created', (newHouse: MediaHouse) => {
      if (!newHouse || !newHouse.id) return;
      setHouses((prev) => {
        if (prev.some((h) => h.id === newHouse.id)) return prev;
        return [newHouse, ...prev];
      });
    });

    const unsubHouseUpdated = realtime.on('mediaHouse:updated', (updatedHouse: MediaHouse) => {
      if (!updatedHouse || !updatedHouse.id) return;
      setHouses((prev) => prev.map((h) => (h.id === updatedHouse.id ? { ...h, ...updatedHouse } : h)));
      setMyHouse((prev) => (prev && prev.id === updatedHouse.id ? { ...prev, ...updatedHouse } : prev));
      setSelectedHouseDetail((prev) =>
        prev && prev.house.id === updatedHouse.id
          ? { ...prev, house: { ...prev.house, ...updatedHouse } }
          : prev
      );
    });

    const unsubArticleCreated = realtime.on('article:created', (newArt: Article) => {
      if (!newArt || !newArt.id) return;
      // If a house detail is open and the article belongs to it, prepend immediately
      setSelectedHouseDetail((prev) => {
        if (!prev) return prev;
        const matches = prev.house.id === newArt.mediaId || prev.house.id === (newArt as any).houseId;
        if (!matches) return prev;
        if (prev.articles.some((a) => a.id === newArt.id)) return prev;
        return {
          ...prev,
          house: {
            ...prev.house,
            articlesCount: (prev.house.articlesCount || 0) + 1,
          },
          articles: [newArt, ...prev.articles],
        };
      });

      // Also update the house's count in the main list
      if (newArt.mediaId) {
        setHouses((prev) =>
          prev.map((h) =>
            h.id === newArt.mediaId ? { ...h, articlesCount: (h.articlesCount || 0) + 1 } : h
          )
        );
      }
    });

    const unsubArticleDeleted = realtime.on('article:deleted', ({ articleId }: { articleId: string }) => {
      setSelectedHouseDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          articles: prev.articles.filter((a) => a.id !== articleId),
        };
      });
    });

    return () => {
      unsubHouseCreated();
      unsubHouseUpdated();
      unsubArticleCreated();
      unsubArticleDeleted();
    };
  }, [user]);

  const handleCreateHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim().length < 3) {
      showMsg('error', 'Le nom de la maison doit comporter au moins 3 caractères.');
      return;
    }

    setCreatingHouse(true);
    try {
      const res = await api.createMediaHouse({
        name: newName.trim(),
        description: newDescription.trim(),
        logo: newLogo.trim() || undefined,
        coverImage: newCover.trim() || undefined,
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        address: newAddress.trim() || undefined,
      });

      showMsg('success', res.message);
      setShowCreateForm(false);
      setNewName('');
      setNewDescription('');
      await loadMyHouse();
      await loadHouses();
      await refreshUser();
    } catch (err: any) {
      showMsg('error', err.message || 'Impossible de fonder la maison.');
    } finally {
      setCreatingHouse(false);
    }
  };

  const handleAddMember = async () => {
    if (!myHouse || !selectedJournalistId) return;
    setAddingMember(true);
    try {
      const res = await api.addMediaHouseMember(myHouse.id, selectedJournalistId);
      showMsg('success', res.message);
      setSelectedJournalistId('');
      await loadMyHouse();
      await loadHouses();
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de l’ajout du journaliste.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!myHouse) return;
    if (!window.confirm(`Voulez-vous retirer le journaliste "${memberName}" de cette maison ?`)) return;

    try {
      const res = await api.removeMediaHouseMember(myHouse.id, memberId);
      showMsg('success', res.message);
      await loadMyHouse();
      await loadHouses();
      if (memberId === user?.id) {
        await refreshUser();
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors du retrait du journaliste.');
    }
  };

  const handleOpenHouseDetail = async (houseId: string) => {
    setLoadingDetail(true);
    try {
      const res = await api.getMediaHouseById(houseId);
      setSelectedHouseDetail(res);
    } catch (err: any) {
      showMsg('error', err.message || 'Impossible de charger la maison.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteHouse = async (houseId: string, houseName: string) => {
    const reason = prompt(
      `Pour confirmer la dissolution et suppression définitive de "${houseName}", veuillez indiquer un motif (ex: Fin des activités, restructuration) :`,
      'Dissolution de la rédaction'
    );
    if (!reason) {
      showMsg('error', 'Suppression annulée.');
      return;
    }

    try {
      const res = await api.deleteMediaHouse(houseId, reason);
      showMsg('success', res.message || 'Maison de journalistes supprimée.');
      setSelectedHouseDetail(null);
      await loadMyHouse();
      await loadHouses();
      await refreshUser();
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la suppression de la maison.');
    }
  };

  const filteredHouses = houses.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.description.toLowerCase().includes(q) ||
      h.ownerName.toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="media-houses-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="media-houses-modal-card"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b0e17] border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(0,243,255,0.15)] overflow-hidden text-stone-100"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#070911]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.3)]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
                Maisons de Journalistes
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Max 5 par maison
                </span>
              </h2>
              <p className="text-xs text-cyan-300/70 font-mono">
                Protocole anti-désinformation & gouvernance éditoriale
              </p>
            </div>
          </div>

          <button
            id="close-media-houses-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center px-6 border-b border-cyan-500/20 bg-[#070911]/40 overflow-x-auto">
          <button
            id="tab-explore-houses-btn"
            onClick={() => {
              setActiveTab('explore');
              setSelectedHouseDetail(null);
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'explore' && !selectedHouseDetail
                ? 'text-cyan-300 border-cyan-400 shadow-[0_4px_12px_rgba(0,243,255,0.2)]'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Explorer les Maisons ({houses.length})
          </button>

          <button
            id="tab-my-house-btn"
            onClick={() => {
              setActiveTab('my-house');
              setSelectedHouseDetail(null);
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'my-house' && !selectedHouseDetail
                ? 'text-cyan-300 border-cyan-400 shadow-[0_4px_12px_rgba(0,243,255,0.2)]'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Crown className="w-4 h-4" />
            Ma Maison de Journalistes
            {myHouse && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                {myHouse.name}
              </span>
            )}
          </button>

          <button
            id="tab-governance-btn"
            onClick={() => {
              setActiveTab('governance');
              setSelectedHouseDetail(null);
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'governance' && !selectedHouseDetail
                ? 'text-cyan-300 border-cyan-400 shadow-[0_4px_12px_rgba(0,243,255,0.2)]'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Gouvernance & Comptes Principaux
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-red-950/80 text-red-300 border-b border-red-500/30'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EXPLORE HOUSES */}
          {activeTab === 'explore' && !selectedHouseDetail && (
            <div className="space-y-5">
              {/* Search & Overview Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
                <div>
                  <h3 className="text-sm font-bold text-white">Maisons de Presse Officielles</h3>
                  <p className="text-xs text-stone-400">
                    Chaque article sur PURGE-INFO est signé sous l'autorité d'une Maison de Journalistes accréditée.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Rechercher une maison, un chef..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 pl-8 text-xs rounded-xl bg-stone-900 border border-cyan-500/30 text-white placeholder-stone-500 focus:outline-none focus:border-cyan-400"
                  />
                  <Building2 className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Houses Grid */}
              {loadingHouses ? (
                <div className="py-12 text-center text-xs text-cyan-300 font-mono">
                  Chargement des Maisons de Journalistes...
                </div>
              ) : filteredHouses.length === 0 ? (
                <div className="py-12 text-center text-sm text-stone-400">
                  Aucune maison de journalistes ne correspond à votre recherche.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredHouses.map((house) => {
                    const membersCount = house.members?.length || 1;
                    return (
                      <div
                        key={house.id}
                        onClick={() => handleOpenHouseDetail(house.id)}
                        className="p-4 rounded-xl bg-stone-900/60 hover:bg-stone-900/90 border border-stone-800 hover:border-cyan-500/40 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={house.logo}
                            alt={house.name}
                            className="w-12 h-12 rounded-xl object-cover border border-cyan-500/30 bg-black shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition truncate flex items-center gap-1.5">
                                {house.name}
                                {house.isVerified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                )}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 shrink-0">
                                {membersCount}/5 journalistes
                              </span>
                            </div>

                            <p className="text-[11px] text-stone-400 line-clamp-2 mt-1">
                              {house.description}
                            </p>
                          </div>
                        </div>

                        {/* Chef & Stats Footer */}
                        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                          <div className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Chef: <strong className="text-stone-200">{house.ownerName}</strong></span>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[10px]">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3 text-cyan-400" />
                              {house.articlesCount || 0} articles
                            </span>
                            <span className="text-cyan-400 group-hover:translate-x-0.5 transition flex items-center gap-0.5 font-bold">
                              Voir l'équipe <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DETAIL VIEW OF A SELECTED HOUSE */}
          {selectedHouseDetail && (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedHouseDetail(null)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                ← Retour à la liste des maisons
              </button>

              {/* Cover Banner & Details */}
              <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-stone-900">
                {selectedHouseDetail.house.coverImage && (
                  <div className="h-36 w-full overflow-hidden relative">
                    <img
                      src={selectedHouseDetail.house.coverImage}
                      alt={selectedHouseDetail.house.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-[#0b0e17]/50 to-transparent" />
                  </div>
                )}

                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-10 relative z-10">
                  <div className="flex items-end gap-3">
                    <img
                      src={selectedHouseDetail.house.logo}
                      alt={selectedHouseDetail.house.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 bg-black shadow-lg shrink-0"
                    />
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        {selectedHouseDetail.house.name}
                        {selectedHouseDetail.house.isVerified && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        )}
                      </h3>
                      <p className="text-xs text-stone-400">
                        Chef de rédaction : <strong className="text-amber-300">{selectedHouseDetail.house.ownerName}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold">
                      {selectedHouseDetail.house.membersData?.length || 1} / 5 Journalistes
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-stone-800 text-stone-300 border border-stone-700">
                      {selectedHouseDetail.articles.length} Publications
                    </span>
                    {(user?.role === 'admin' || user?.id === selectedHouseDetail.house.ownerId) && (
                      <button
                        onClick={() => handleDeleteHouse(selectedHouseDetail.house.id, selectedHouseDetail.house.name)}
                        className="px-3 py-1 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/40 flex items-center gap-1.5 font-sans font-bold transition cursor-pointer"
                        title="Supprimer cette maison de journalistes"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer la maison</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 text-xs text-stone-300 leading-relaxed border-t border-stone-800 pt-3">
                  {selectedHouseDetail.house.description}
                </div>
              </div>

              {/* Members of this house (Max 5 journalists) */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Membres de la rédaction (Journalistes accrédités)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedHouseDetail.house.membersData?.map((m) => {
                    const isTheChef = m.id === selectedHouseDetail.house.ownerId;
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          isTheChef
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-stone-900 border-stone-800'
                        }`}
                      >
                        <img
                          src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={m.name}
                          className="w-10 h-10 rounded-full object-cover border border-cyan-400/30 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                            {m.name}
                            {isTheChef && (
                              <Crown className="w-3 h-3 text-amber-400 shrink-0" title="Chef de la maison" />
                            )}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {isTheChef ? 'Chef de rédaction' : 'Journaliste membre'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Articles published by this house */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Articles publiés sous l'égide de cette maison ({selectedHouseDetail.articles.length})
                </h4>

                {selectedHouseDetail.articles.length === 0 ? (
                  <div className="p-4 rounded-xl bg-stone-900 text-center text-xs text-stone-400">
                    Aucun article publié pour le moment.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedHouseDetail.articles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => {
                          if (onOpenArticle) {
                            onOpenArticle(art);
                            onClose();
                          }
                        }}
                        className="p-3 rounded-xl bg-stone-900 hover:bg-stone-800/80 border border-stone-800 hover:border-cyan-500/40 flex items-center justify-between gap-3 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={art.coverImage}
                            alt={art.title}
                            className="w-12 h-12 rounded-lg object-cover border border-stone-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-white truncate hover:text-cyan-300">
                              {art.title}
                            </h5>
                            <p className="text-[10px] text-stone-400 truncate">
                              Par <strong>{art.authorName}</strong> • {new Date(art.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] text-cyan-400 font-bold shrink-0">
                          Lire →
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MY MEDIA HOUSE (JOURNALIST MANAGEMENT) */}
          {activeTab === 'my-house' && !selectedHouseDetail && (
            <div className="space-y-6">
              {!user ? (
                <div className="p-8 rounded-2xl bg-stone-900 border border-stone-800 text-center space-y-3">
                  <Shield className="w-8 h-8 text-cyan-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">Connexion requise</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    Veuillez vous connecter pour gérer ou fonder votre Maison de Journalistes.
                  </p>
                </div>
              ) : user.role !== 'journalist' && user.role !== 'admin' ? (
                /* Simple Citizen User Notice */
                <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-white">
                        Statut actuel : Compte Simple (Lecteur Citoyen)
                      </h3>
                      <p className="text-xs text-stone-300 leading-relaxed">
                        Sur <strong>PURGE-INFO</strong>, tous les nouveaux comptes créés sont par défaut de simples comptes utilisateurs afin d'éradiquer la désinformation.
                      </p>
                      <p className="text-xs text-stone-300 leading-relaxed">
                        Pour devenir journaliste et fonder ou rejoindre une <strong>Maison de Journalistes</strong> (5 journalistes maximum par maison), votre compte doit être formellement accrédité par l'un des <strong>2 Comptes Principaux</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-amber-300 font-medium">
                      Protocole de sécurité & accréditation CSC actif.
                    </span>
                    <div className="flex items-center gap-3">
                      {onOpenProfile && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenProfile();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-amber-400 text-black font-bold shadow-[0_0_12px_rgba(0,243,255,0.3)] hover:brightness-110 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Demander mon accréditation</span>
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('governance')}
                        className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                      >
                        Voir les 2 comptes principaux →
                      </button>
                    </div>
                  </div>
                </div>
              ) : myHouse ? (
                /* Accredited Journalist with an Active House */
                <div className="space-y-6">
                  {/* House Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={myHouse.logo}
                          alt={myHouse.name}
                          className="w-14 h-14 rounded-xl object-cover border-2 border-cyan-400 bg-black shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white">{myHouse.name}</h3>
                            {isChef && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-400" /> Chef de Rédaction
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400">
                            Chef : <strong className="text-white">{myHouse.ownerName}</strong> • {myHouse.articlesCount || 0} publications
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-mono font-bold">
                          {myHouse.members?.length || 1} / 5 Journalistes
                        </span>
                        {(isChef || user.role === 'admin') && (
                          <button
                            onClick={() => handleDeleteHouse(myHouse.id, myHouse.name)}
                            className="px-3 py-1 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            title="Dissoudre et supprimer cette maison de journalistes"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Dissoudre la maison</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-stone-300 border-t border-cyan-500/20 pt-3">
                      {myHouse.description}
                    </p>
                  </div>

                  {/* Journalists in this house (Quota: Max 5) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        Équipe de journalistes ({myHouse.members?.length || 1}/5 maximum)
                      </h4>

                      {isChef && (myHouse.members?.length || 1) < 5 && (
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          Il reste {5 - (myHouse.members?.length || 1)} place(s) disponible(s)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {myHouse.membersData?.map((member) => {
                        const isChefMember = member.id === myHouse.ownerId;
                        return (
                          <div
                            key={member.id}
                            className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={member.name}
                                className="w-10 h-10 rounded-full object-cover border border-cyan-400/30 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                                  {member.name}
                                  {isChefMember && <Crown className="w-3 h-3 text-amber-400" />}
                                </div>
                                <div className="text-[10px] text-stone-400 truncate">
                                  {isChefMember ? 'Chef de la maison' : 'Journaliste assistant'}
                                </div>
                              </div>
                            </div>

                            {/* Chef can remove assistant journalists */}
                            {isChef && !isChefMember && (
                              <button
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition cursor-pointer"
                                title="Retirer ce journaliste de la maison"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}

                            {/* Non-chef member can leave */}
                            {!isChef && member.id === user.id && (
                              <button
                                onClick={() => handleRemoveMember(user.id, user.name)}
                                className="px-2 py-1 rounded text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-500/30 transition cursor-pointer"
                              >
                                Quitter la maison
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Journalist Section (Chef only, if under 5) */}
                  {isChef && (
                    <div className="p-4 rounded-xl bg-stone-900/70 border border-cyan-500/20 space-y-3">
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-cyan-400" />
                        Intégrer un journaliste accrédité dans votre maison (Quota: max 5)
                      </h5>

                      {(myHouse.members?.length || 1) >= 5 ? (
                        <div className="text-xs text-amber-400 font-semibold">
                          Le quota maximal de 5 journalistes pour cette maison est atteint. Vous ne pouvez plus ajouter de membre.
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <select
                            value={selectedJournalistId}
                            onChange={(e) => setSelectedJournalistId(e.target.value)}
                            className="w-full sm:flex-1 px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-stone-200 focus:outline-none focus:border-cyan-400"
                          >
                            <option value="">Sélectionner un journaliste accrédité disponible...</option>
                            {availableJournalists
                              .filter((j) => j.id !== user.id && !myHouse.members?.includes(j.id))
                              .map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.name} ({j.email}) {j.isAvailable ? '— Libre' : `— Actuellement chez ${j.currentHouseName}`}
                                </option>
                              ))}
                          </select>

                          <button
                            onClick={handleAddMember}
                            disabled={!selectedJournalistId || addingMember}
                            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            {addingMember ? 'Ajout...' : 'Intégrer le journaliste'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Publishing Rule Notice */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-300/90 leading-relaxed flex items-center gap-2.5">
                    <Info className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>
                      Tous les articles rédigés par les membres de cette équipe seront publiés au nom de <strong>{myHouse.name}</strong>, garantissant la traçabilité et la crédibilité éditoriale.
                    </span>
                  </div>
                </div>
              ) : (
                /* Accredited Journalist WITHOUT a house yet */
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                      <Crown className="w-5 h-5 text-amber-400" />
                      Fonder votre Maison de Journalistes
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Félicitations, votre compte a été accrédité au rang de <strong>Journaliste</strong> par les comptes principaux !
                    </p>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Conformément au protocole de PURGE-INFO, vous ne pouvez pas publier isolément : vous devez fonder votre maison de presse (dont vous serez le Chef) ou vous faire inviter dans une maison existante. Vous pourrez ensuite intégrer jusqu'à 4 autres journalistes pour vous assister (5 journalistes au total).
                    </p>

                    {!showCreateForm ? (
                      <button
                        id="start-create-house-btn"
                        onClick={() => setShowCreateForm(true)}
                        className="px-4 py-2 text-xs font-bold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl transition shadow-[0_0_15px_rgba(0,243,255,0.3)] cursor-pointer flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Fonder ma Maison de Journalistes
                      </button>
                    ) : null}
                  </div>

                  {/* Creation Form */}
                  {showCreateForm && (
                    <form onSubmit={handleCreateHouse} className="p-5 rounded-2xl bg-stone-900 border border-cyan-500/40 space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-cyan-400" /> Création de la Maison de Journalistes
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="text-xs text-stone-400 hover:text-white"
                        >
                          Annuler
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-300 mb-1">
                            Nom de la Maison *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Furiosa, Burkina Actu, L'Observateur..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-300 mb-1">
                            Chef de rédaction
                          </label>
                          <input
                            type="text"
                            disabled
                            value={`${user.name} (Vous)`}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950/60 border border-stone-800 text-stone-400 cursor-not-allowed"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-stone-300 mb-1">
                            Ligne éditoriale & Description *
                          </label>
                          <textarea
                            rows={3}
                            required
                            placeholder="Décrivez la ligne éditoriale de votre maison de journalistes..."
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-300 mb-1">
                            URL du Logo (optionnel)
                          </label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={newLogo}
                            onChange={(e) => setNewLogo(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                          />
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {LOGO_PRESETS.map((p) => (
                              <button
                                key={p.name}
                                type="button"
                                onClick={() => setNewLogo(p.url)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] border transition cursor-pointer ${
                                  newLogo === p.url
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-300 mb-1">
                            URL de la bannière (optionnel)
                          </label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={newCover}
                            onChange={(e) => setNewCover(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                          />
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {COVER_PRESETS.map((p) => (
                              <button
                                key={p.name}
                                type="button"
                                onClick={() => setNewCover(p.url)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] border transition cursor-pointer ${
                                  newCover === p.url
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="px-4 py-2 text-xs rounded-xl text-stone-400 hover:text-white"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={creatingHouse}
                          className="px-5 py-2 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition cursor-pointer"
                        >
                          {creatingHouse ? 'Fondation en cours...' : 'Fonder la maison et devenir Chef'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GOVERNANCE & TWO MASTER ACCOUNTS */}
          {activeTab === 'governance' && !selectedHouseDetail && (
            <div className="space-y-6">
              {/* Architecture Diagram Card */}
              <div className="p-5 rounded-2xl bg-[#080c14] border border-cyan-500/30 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Hiérarchie stricte & Protocole Anti-Désinformation
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {/* Step 1 */}
                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                      Niveau 1 • Contrôle Total
                    </div>
                    <div className="text-xs font-bold text-white">2 Comptes Principaux</div>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      Seuls ces deux comptes détiennent le contrôle total de la plateforme et le pouvoir exclusif d'accréditer les journalistes.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <div className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                      Niveau 2 • Accréditation
                    </div>
                    <div className="text-xs font-bold text-white">Journalistes Accrédités</div>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      Tous les autres comptes créés débutent comme comptes simples. Seule la promotion par un compte principal permet d'accéder au rang de journaliste.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                      Niveau 3 • Publication
                    </div>
                    <div className="text-xs font-bold text-white">Maisons de Journalistes (Max 5)</div>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      Les journalistes publient exclusivement au nom d'une Maison de Presse dirigée par un Chef (quota strict de 5 journalistes par maison).
                    </p>
                  </div>
                </div>
              </div>

              {/* The Two Master Accounts List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  Les 2 Comptes Principaux Configurés
                </h4>

                <div className="space-y-2.5">
                  {masterAccounts.map((adm, idx) => (
                    <div
                      key={adm.email}
                      className="p-3.5 rounded-xl bg-stone-900 border border-cyan-500/30 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold flex items-center justify-center text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            {adm.name}
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                              SUPER ADMIN
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono truncate">
                            {adm.email}
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] font-mono text-emerald-400 font-semibold shrink-0">
                        {adm.isRegistered ? 'Actif & Opérationnel' : 'En attente de connexion'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
