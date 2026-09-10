import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Users,
  Eye,
  Heart,
  Building2,
  BookOpen,
  Search,
  ExternalLink,
  UserPlus,
  UserCheck,
  ShieldCheck,
  Zap,
  Info,
  ArrowUpRight,
  TrendingUp,
  Award,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Flame,
} from 'lucide-react';
import { TopMediaHouse, TopJournalist, Article } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from './VerifiedBadge';
import { sfx } from '../services/soundEffects';

interface RankingsModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onOpenArticle: (article: Article | string) => void;
  onOpenProfile: (userId: string) => void;
  onOpenMediaHouses?: () => void;
  onOpenAuth: () => void;
  isPage?: boolean;
  initialTab?: 'houses' | 'journalists' | 'articles';
}

export const RankingsModal: React.FC<RankingsModalProps> = ({
  isOpen = true,
  onClose,
  onOpenArticle,
  onOpenProfile,
  onOpenMediaHouses,
  onOpenAuth,
  isPage = false,
  initialTab = 'houses',
}) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'houses' | 'journalists' | 'articles'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'followers' | 'articles' | 'views' | 'likes'>('popularity');
  const [topHouses, setTopHouses] = useState<TopMediaHouse[]>([]);
  const [topJournalists, setTopJournalists] = useState<TopJournalist[]>([]);
  const [topArticles, setTopArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followingLoading, setFollowingLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen && !isPage) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [rankingsRes, articlesRes] = await Promise.all([
          api.getTopRankings(),
          api.getArticles({ sort: 'views', limit: 20 }),
        ]);

        setTopHouses(rankingsRes.topHouses || []);
        setTopJournalists(rankingsRes.topJournalists || []);
        setTopArticles(articlesRes.articles || []);

        const map: Record<string, boolean> = {};
        (rankingsRes.topHouses || []).forEach((h) => {
          if (h.isFollowing) map[h.id] = true;
        });
        (rankingsRes.topJournalists || []).forEach((j) => {
          if (j.isFollowing) map[j.id] = true;
        });
        setFollowingMap(map);
      } catch (err) {
        console.error('Erreur de chargement du classement:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, isPage, user?.id]);

  if (!isOpen && !isPage) return null;

  const handleToggleFollow = async (id: string, type: 'house' | 'journalist', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    sfx.playClick();
    setFollowingLoading((prev) => ({ ...prev, [id]: true }));

    try {
      if (type === 'house') {
        const res = await api.followMediaHouse(id);
        setFollowingMap((prev) => ({ ...prev, [id]: res.isFollowing }));
        setTopHouses((prev) =>
          prev.map((h) =>
            h.id === id
              ? {
                  ...h,
                  isFollowing: res.isFollowing,
                  followersCount: res.followersCount,
                }
              : h
          )
        );
      } else {
        const res = await api.followUser(id);
        setFollowingMap((prev) => ({ ...prev, [id]: res.isFollowing }));
        setTopJournalists((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  isFollowing: res.isFollowing,
                  followersCount: res.followersCount,
                }
              : j
          )
        );
      }
    } catch (err) {
      console.error('Erreur lors du suivi:', err);
    } finally {
      setFollowingLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Filter and sort items strictly with accurate, sequential display ranks
  const getSortedHouses = () => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = topHouses.filter((h) => {
      if (!q) return true;
      return (
        h.name.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q)) ||
        (h.motto && h.motto.toLowerCase().includes(q)) ||
        (h.specialties && h.specialties.some((s) => s.toLowerCase().includes(q)))
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'followers') return (b.followersCount || 0) - (a.followersCount || 0);
      if (sortBy === 'articles') return (b.articlesCount || 0) - (a.articlesCount || 0);
      if (sortBy === 'views') return (b.totalViews || 0) - (a.totalViews || 0);
      if (sortBy === 'likes') return (b.totalLikes || 0) - (a.totalLikes || 0);
      return (b.popularityScore || 0) - (a.popularityScore || 0);
    });
  };

  const getSortedJournalists = () => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = topJournalists.filter((j) => {
      if (!q) return true;
      return (
        j.name.toLowerCase().includes(q) ||
        (j.bio && j.bio.toLowerCase().includes(q)) ||
        (j.mediaName && j.mediaName.toLowerCase().includes(q))
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'followers') return (b.followersCount || 0) - (a.followersCount || 0);
      if (sortBy === 'articles') return (b.articlesCount || 0) - (a.articlesCount || 0);
      if (sortBy === 'views') return (b.totalViews || 0) - (a.totalViews || 0);
      if (sortBy === 'likes') return (b.totalLikes || 0) - (a.totalLikes || 0);
      return (b.popularityScore || 0) - (a.popularityScore || 0);
    });
  };

  const getSortedArticles = () => {
    const q = (searchQuery || '').toLowerCase().trim();
    const filtered = topArticles.filter((art) => {
      if (!q) return true;
      return (
        (art.title && art.title.toLowerCase().includes(q)) ||
        (art.summary && art.summary.toLowerCase().includes(q)) ||
        (art.authorName && art.authorName.toLowerCase().includes(q)) ||
        (art.mediaName && art.mediaName.toLowerCase().includes(q)) ||
        (art.categoryName && art.categoryName.toLowerCase().includes(q))
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
      if (sortBy === 'articles' || sortBy === 'popularity') {
        // Combined score: views + likes * 5 + comments * 4
        const scoreA = (a.viewsCount || 0) + (a.likesCount || 0) * 5 + (a.commentsCount || 0) * 4;
        const scoreB = (b.viewsCount || 0) + (b.likesCount || 0) * 5 + (b.commentsCount || 0) * 4;
        return scoreB - scoreA;
      }
      return (b.viewsCount || 0) - (a.viewsCount || 0);
    });
  };

  const currentHouses = getSortedHouses();
  const currentJournalists = getSortedJournalists();
  const currentArticles = getSortedArticles();

  // Helper for podium badge styling
  const renderRankPill = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-[0_0_12px_rgba(250,204,21,0.6)]">
          <Crown className="w-3.5 h-3.5 fill-black stroke-black" />
          <span>#1 OR</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-slate-200 to-slate-400 text-slate-900 shadow-[0_0_10px_rgba(203,213,225,0.4)]">
          <Medal className="w-3.5 h-3.5 fill-slate-900 stroke-slate-900" />
          <span>#2 ARGENT</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)]">
          <Medal className="w-3.5 h-3.5 fill-white stroke-white" />
          <span>#3 BRONZE</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
        #{rank}
      </span>
    );
  };

  // Core content of the rankings (shared by page and modal)
  const rankingContent = (
    <div className="flex flex-col w-full text-slate-100">
      {/* 1. Header & Context */}
      <div className="p-4 sm:p-7 border-b border-cyan-500/20 bg-gradient-to-r from-[#0b132e]/90 via-[#091026]/90 to-[#070b1a]/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-cyan-400 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(234,179,8,0.4)] border border-white/30 shrink-0">
              <Trophy className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 text-[10px] font-mono font-black border border-yellow-400/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  PALMARÈS OFFICIEL DE L'INFORMATION
                </span>
                <span className="text-[11px] sm:text-xs text-cyan-400 font-mono">Actualisé en temps réel</span>
              </div>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                Classement de la Presse & des Journalistes
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Retrouvez les rédactions les plus influentes, les plumes les plus suivies et les publications
                ayant le plus fort impact citoyen.
              </p>
            </div>
          </div>

          {!isPage && (
            <button
              id="close-rankings-modal-btn"
              onClick={() => {
                sfx.playClick();
                onClose();
              }}
              className="self-end sm:self-start p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Fermer la fenêtre"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. Primary Navigation Tabs: Maisons | Journalistes | Articles */}
        <div className="mt-4 sm:mt-6 w-full border-t border-cyan-500/20 pt-3 sm:pt-4 pb-1">
          <div className="grid grid-cols-3 bg-[#060a1a] p-1 sm:p-1.5 rounded-2xl border border-cyan-500/30 gap-1 shadow-inner">
            <button
              id="ranking-tab-houses"
              onClick={() => {
                sfx.playMechanicalClick();
                setActiveTab('houses');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'houses'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_18px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                Maisons<span className="hidden md:inline"> de Presse</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px] font-mono shrink-0">
                {topHouses.length}
              </span>
            </button>

            <button
              id="ranking-tab-journalists"
              onClick={() => {
                sfx.playMechanicalClick();
                setActiveTab('journalists');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'journalists'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_18px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                Journalistes<span className="hidden md:inline"> & Plumes</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px] font-mono shrink-0">
                {topJournalists.length}
              </span>
            </button>

            <button
              id="ranking-tab-articles"
              onClick={() => {
                sfx.playMechanicalClick();
                setActiveTab('articles');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'articles'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_18px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                Articles<span className="hidden md:inline"> les Plus Lus</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px] font-mono shrink-0">
                {topArticles.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Search & Sort Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-cyan-500/15 bg-[#050918] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'houses'
                ? 'Rechercher une rédaction par nom ou spécialité...'
                : activeTab === 'journalists'
                ? 'Rechercher un journaliste, une plume...'
                : 'Rechercher un article ou un thème...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#090e24] border border-cyan-500/30 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Effacer
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden md:inline">Trier par :</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#090e24] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 font-mono cursor-pointer transition-colors"
          >
            <option value="popularity">Score d'Impact Global</option>
            <option value="followers">Plus d'Abonnés (Audience)</option>
            <option value="articles">
              {activeTab === 'articles' ? 'Pertinence' : "Plus d'Articles Publiés"}
            </option>
            <option value="views">Plus de Lectures (Vues)</option>
            <option value="likes">Plus d'Approbations (Likes)</option>
          </select>
        </div>
      </div>

      {/* 4. Understandable Educational Banner */}
      <div className="border-b border-cyan-500/10 bg-[#070c20]">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-cyan-300 hover:text-white font-mono cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold">Comment est calculé le classement ?</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Les 4 piliers d'influence vérifiable)
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-cyan-400">
            <span>{showExplanation ? 'Masquer' : 'En savoir plus'}</span>
            {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showExplanation && (
          <div className="px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t border-cyan-500/10 animate-fadeIn">
            <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>1. Audience Vérifiée</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Nombre de citoyens et professionnels qui suivent activement les dépêches et travaux d'enquête.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-blue-300 font-bold mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span>2. Régularité Éditoriale</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Volume d'articles originaux rédigés, documentés et validés par les pairs de la rédaction.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-yellow-300 font-bold mb-1">
                <Eye className="w-3.5 h-3.5" />
                <span>3. Lectures Uniques</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Total des lectures certifiées générées par les articles, mesurant la portée réelle de l'information.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>4. Approbations & Badge</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Retours positifs des lecteurs et bonus attribué aux rédactions officiellement certifiées.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. Main Rankings Display Area */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {loading ? (
          <div className="py-20 text-center text-cyan-400 flex flex-col items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 animate-spin text-yellow-400" />
            <span className="text-xs font-mono">Calcul des scores et synchronisation des données...</span>
          </div>
        ) : activeTab === 'houses' ? (
          /* TAB 1: MAISONS DE PRESSE */
          currentHouses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm px-4">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-cyan-500/30" />
              <p className="font-semibold text-slate-200">
                {searchQuery ? 'Aucune maison de presse trouvée.' : 'Aucune maison de presse disponible.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery ? 'Modifiez votre mot-clé de recherche.' : 'Les maisons accréditées apparaîtront ici.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Podium Top 3 */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span>Le Podium d'Honneur (Top 3 des Rédactions)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentHouses.slice(0, 3).map((house, idx) => {
                    const displayRank = idx + 1;
                    const isFollowing = !!followingMap[house.id];
                    const isLoadingFollow = !!followingLoading[house.id];

                    return (
                      <div
                        key={house.id}
                        onClick={() => {
                          if (onOpenMediaHouses) {
                            if (!isPage) onClose();
                            onOpenMediaHouses();
                          }
                        }}
                        className={`p-5 rounded-2xl border transition-all duration-200 group cursor-pointer flex flex-col justify-between ${
                          displayRank === 1
                            ? 'bg-gradient-to-b from-[#171c3d] via-[#0d132c] to-[#080d20] border-yellow-400/60 shadow-[0_0_25px_rgba(234,179,8,0.25)] hover:border-yellow-300'
                            : displayRank === 2
                            ? 'bg-gradient-to-b from-[#111836] via-[#0b1026] to-[#070b1a] border-slate-300/50 shadow-[0_0_18px_rgba(203,213,225,0.15)] hover:border-slate-200'
                            : 'bg-gradient-to-b from-[#14122b] via-[#0d0f22] to-[#070817] border-amber-600/40 shadow-[0_0_15px_rgba(217,119,6,0.15)] hover:border-amber-500'
                        }`}
                      >
                        <div>
                          {/* Rank Pill + Score Header */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            {renderRankPill(displayRank)}
                            <div className="flex items-center gap-1 text-xs font-mono text-cyan-300 font-bold bg-black/40 px-2.5 py-1 rounded-full border border-cyan-500/20">
                              <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                              <span>{(house.popularityScore || 0).toLocaleString()} pts</span>
                            </div>
                          </div>

                          {/* Identity */}
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={
                                house.logo ||
                                'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={house.name}
                              referrerPolicy="no-referrer"
                              className={`w-14 h-14 rounded-2xl object-cover border-2 shadow-md shrink-0 ${
                                displayRank === 1
                                  ? 'border-yellow-400'
                                  : displayRank === 2
                                  ? 'border-slate-300'
                                  : 'border-amber-500'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-black text-white text-base group-hover:text-cyan-300 transition-colors truncate">
                                  {house.name}
                                </h4>
                                <VerifiedBadge size="sm" type="media" />
                              </div>
                              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                                {house.motto || house.description}
                              </p>
                              {house.specialties && house.specialties.length > 0 && (
                                <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                                  {house.specialties.join(' • ')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Metric Grid */}
                          <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/30 border border-white/10 mb-4 text-center font-mono">
                            <div className="p-1">
                              <span className="text-[10px] text-slate-400 block">Abonnés</span>
                              <strong className="text-xs font-bold text-white">
                                {(house.followersCount || 0).toLocaleString()}
                              </strong>
                            </div>
                            <div className="p-1 border-x border-white/10">
                              <span className="text-[10px] text-slate-400 block">Articles</span>
                              <strong className="text-xs font-bold text-white">
                                {house.articlesCount || 0}
                              </strong>
                            </div>
                            <div className="p-1">
                              <span className="text-[10px] text-slate-400 block">Lectures</span>
                              <strong className="text-xs font-bold text-white">
                                {(house.totalViews || 0).toLocaleString()}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Follow Action */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                          <button
                            onClick={(e) => handleToggleFollow(house.id, 'house', e)}
                            disabled={isLoadingFollow || user?.id === house.ownerId}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              isFollowing
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Abonné</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>S'abonner</span>
                              </>
                            )}
                          </button>

                          {onOpenMediaHouses && (
                            <button
                              onClick={() => {
                                if (!isPage) onClose();
                                onOpenMediaHouses();
                              }}
                              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                              title="Voir la maison de presse"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ranks 4 and onward */}
              {currentHouses.length > 3 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400/80">
                    Positions Suivantes (#{4} à #{currentHouses.length})
                  </h3>

                  <div className="rounded-2xl bg-[#090e24]/70 border border-cyan-500/20 divide-y divide-cyan-500/10 overflow-hidden">
                    {currentHouses.slice(3).map((house, idx) => {
                      const displayRank = idx + 4;
                      const isFollowing = !!followingMap[house.id];
                      const isLoadingFollow = !!followingLoading[house.id];

                      return (
                        <div
                          key={house.id}
                          onClick={() => {
                            if (onOpenMediaHouses) {
                              if (!isPage) onClose();
                              onOpenMediaHouses();
                            }
                          }}
                          className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-cyan-500/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {renderRankPill(displayRank)}

                            <img
                              src={
                                house.logo ||
                                'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={house.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-cyan-500/30 shrink-0"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-extrabold text-sm text-white group-hover:text-cyan-300 truncate">
                                  {house.name}
                                </h4>
                                <VerifiedBadge size="xs" type="media" />
                              </div>
                              <p className="text-xs text-slate-300 truncate">
                                {house.motto || house.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 font-mono text-xs">
                            <div className="flex items-center gap-3 text-slate-300">
                              <span>
                                <strong className="text-white">{(house.followersCount || 0).toLocaleString()}</strong>{' '}
                                <span className="text-[10px] text-slate-400">abonnés</span>
                              </span>
                              <span>
                                <strong className="text-white">{house.articlesCount || 0}</strong>{' '}
                                <span className="text-[10px] text-slate-400">articles</span>
                              </span>
                              <span className="hidden md:inline">
                                <strong className="text-cyan-300">{(house.popularityScore || 0).toLocaleString()}</strong>{' '}
                                <span className="text-[10px] text-slate-400">pts</span>
                              </span>
                            </div>

                            <button
                              onClick={(e) => handleToggleFollow(house.id, 'house', e)}
                              disabled={isLoadingFollow || user?.id === house.ownerId}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isFollowing
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                              }`}
                            >
                              {isFollowing ? 'Abonné' : "S'abonner"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        ) : activeTab === 'journalists' ? (
          /* TAB 2: JOURNALISTES & PLUMES */
          currentJournalists.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm px-4">
              <Users className="w-12 h-12 mx-auto mb-3 text-cyan-500/30" />
              <p className="font-semibold text-slate-200">
                {searchQuery ? 'Aucun journaliste trouvé.' : 'Aucun journaliste accrédité classé.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Essayez avec un autre nom.'
                  : 'Les journalistes apparaîtront dès leurs premières publications vérifiées.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Podium Top 3 Journalistes */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span>Le Podium d'Honneur (Top 3 des Plumes)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentJournalists.slice(0, 3).map((journalist, idx) => {
                    const displayRank = idx + 1;
                    const isFollowing = !!followingMap[journalist.id];
                    const isLoadingFollow = !!followingLoading[journalist.id];

                    return (
                      <div
                        key={journalist.id}
                        onClick={() => {
                          if (!isPage) onClose();
                          onOpenProfile(journalist.id);
                        }}
                        className={`p-5 rounded-2xl border transition-all duration-200 group cursor-pointer flex flex-col justify-between ${
                          displayRank === 1
                            ? 'bg-gradient-to-b from-[#171c3d] via-[#0d132c] to-[#080d20] border-yellow-400/60 shadow-[0_0_25px_rgba(234,179,8,0.25)] hover:border-yellow-300'
                            : displayRank === 2
                            ? 'bg-gradient-to-b from-[#111836] via-[#0b1026] to-[#070b1a] border-slate-300/50 shadow-[0_0_18px_rgba(203,213,225,0.15)] hover:border-slate-200'
                            : 'bg-gradient-to-b from-[#14122b] via-[#0d0f22] to-[#070817] border-amber-600/40 shadow-[0_0_15px_rgba(217,119,6,0.15)] hover:border-amber-500'
                        }`}
                      >
                        <div>
                          {/* Rank Pill + Score Header */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            {renderRankPill(displayRank)}
                            <div className="flex items-center gap-1 text-xs font-mono text-cyan-300 font-bold bg-black/40 px-2.5 py-1 rounded-full border border-cyan-500/20">
                              <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                              <span>{(journalist.popularityScore || 0).toLocaleString()} pts</span>
                            </div>
                          </div>

                          {/* Identity */}
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={
                                journalist.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={journalist.name}
                              referrerPolicy="no-referrer"
                              className={`w-14 h-14 rounded-full object-cover border-2 shadow-md shrink-0 ${
                                displayRank === 1
                                  ? 'border-yellow-400'
                                  : displayRank === 2
                                  ? 'border-slate-300'
                                  : 'border-amber-500'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-black text-white text-base group-hover:text-cyan-300 transition-colors truncate">
                                  {journalist.name}
                                </h4>
                                <VerifiedBadge size="sm" type="journalist" />
                              </div>
                              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                                {journalist.bio || 'Journaliste d’enquête certifié'}
                              </p>
                              {journalist.mediaName && (
                                <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                                  {journalist.mediaName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Metric Grid */}
                          <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/30 border border-white/10 mb-3 text-center font-mono">
                            <div className="p-1">
                              <span className="text-[10px] text-slate-400 block">Abonnés</span>
                              <strong className="text-xs font-bold text-white">
                                {(journalist.followersCount || 0).toLocaleString()}
                              </strong>
                            </div>
                            <div className="p-1 border-x border-white/10">
                              <span className="text-[10px] text-slate-400 block">Articles</span>
                              <strong className="text-xs font-bold text-white">
                                {journalist.articlesCount || 0}
                              </strong>
                            </div>
                            <div className="p-1">
                              <span className="text-[10px] text-slate-400 block">Lectures</span>
                              <strong className="text-xs font-bold text-white">
                                {(journalist.totalViews || 0).toLocaleString()}
                              </strong>
                            </div>
                          </div>

                          {/* Recent article link */}
                          {journalist.recentArticleTitle && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (journalist.recentArticleId) {
                                  if (!isPage) onClose();
                                  onOpenArticle(journalist.recentArticleId);
                                }
                              }}
                              className="p-2 rounded-xl bg-black/40 border border-white/10 mb-3 text-[11px] text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="truncate italic">"{journalist.recentArticleTitle}"</span>
                              </div>
                              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                            </div>
                          )}
                        </div>

                        {/* Follow Action */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                          <button
                            onClick={(e) => handleToggleFollow(journalist.id, 'journalist', e)}
                            disabled={isLoadingFollow || user?.id === journalist.id}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              isFollowing
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Abonné</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Suivre</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              if (!isPage) onClose();
                              onOpenProfile(journalist.id);
                            }}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                            title="Voir le profil du journaliste"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ranks 4 and onward for journalists */}
              {currentJournalists.length > 3 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400/80">
                    Positions Suivantes (#{4} à #{currentJournalists.length})
                  </h3>

                  <div className="rounded-2xl bg-[#090e24]/70 border border-cyan-500/20 divide-y divide-cyan-500/10 overflow-hidden">
                    {currentJournalists.slice(3).map((journalist, idx) => {
                      const displayRank = idx + 4;
                      const isFollowing = !!followingMap[journalist.id];
                      const isLoadingFollow = !!followingLoading[journalist.id];

                      return (
                        <div
                          key={journalist.id}
                          onClick={() => {
                            if (!isPage) onClose();
                            onOpenProfile(journalist.id);
                          }}
                          className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-cyan-500/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {renderRankPill(displayRank)}

                            <img
                              src={
                                journalist.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={journalist.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover border border-cyan-500/30 shrink-0"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-extrabold text-sm text-white group-hover:text-cyan-300 truncate">
                                  {journalist.name}
                                </h4>
                                <VerifiedBadge size="xs" type="journalist" />
                                {journalist.mediaName && (
                                  <span className="text-[10px] text-cyan-400/70 font-mono hidden sm:inline">
                                    • {journalist.mediaName}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 truncate">
                                {journalist.bio || 'Journaliste d’investigation'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 font-mono text-xs">
                            <div className="flex items-center gap-3 text-slate-300">
                              <span>
                                <strong className="text-white">
                                  {(journalist.followersCount || 0).toLocaleString()}
                                </strong>{' '}
                                <span className="text-[10px] text-slate-400">abonnés</span>
                              </span>
                              <span>
                                <strong className="text-white">{journalist.articlesCount || 0}</strong>{' '}
                                <span className="text-[10px] text-slate-400">articles</span>
                              </span>
                              <span className="hidden md:inline">
                                <strong className="text-cyan-300">{(journalist.popularityScore || 0).toLocaleString()}</strong>{' '}
                                <span className="text-[10px] text-slate-400">pts</span>
                              </span>
                            </div>

                            <button
                              onClick={(e) => handleToggleFollow(journalist.id, 'journalist', e)}
                              disabled={isLoadingFollow || user?.id === journalist.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isFollowing
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                              }`}
                            >
                              {isFollowing ? 'Abonné' : 'Suivre'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* TAB 3: ARTICLES LES PLUS LUS & POPULAIRES */
          currentArticles.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm px-4">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-cyan-500/30" />
              <p className="font-semibold text-slate-200">
                {searchQuery ? 'Aucun article trouvé.' : 'Aucun article classé pour le moment.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery ? 'Modifiez votre requête.' : 'Les publications les plus lues apparaîtront ici.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Palmarès des Publications Phares</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {currentArticles.length} publications analysées
                </span>
              </div>

              <div className="rounded-2xl bg-[#090e24]/80 border border-cyan-500/20 divide-y divide-cyan-500/10 overflow-hidden">
                {currentArticles.map((article, idx) => {
                  const displayRank = idx + 1;

                  return (
                    <div
                      key={article.id}
                      onClick={() => {
                        if (!isPage) onClose();
                        onOpenArticle(article);
                      }}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-cyan-500/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div className="shrink-0 pt-0.5 sm:pt-0">
                          {renderRankPill(displayRank)}
                        </div>

                        {article.coverImage && (
                          <img
                            src={article.coverImage}
                            alt={article.title}
                            referrerPolicy="no-referrer"
                            className="w-16 h-12 rounded-lg object-cover border border-cyan-500/30 shrink-0 group-hover:scale-105 transition-transform"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                              {article.categoryName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(article.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                            {article.title}
                          </h4>

                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 font-mono">
                            <span className="font-bold text-white">
                              {article.mediaName || article.authorName}
                            </span>
                            {article.isAuthorVerified && (
                              <VerifiedBadge size="xs" type={article.mediaName ? 'media' : 'journalist'} />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 font-mono text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <div className="flex items-center gap-3 text-slate-300">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <strong className="text-white">{(article.viewsCount || 0).toLocaleString()}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-rose-400" />
                            <strong className="text-white">{(article.likesCount || 0).toLocaleString()}</strong>
                          </span>
                        </div>

                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 group-hover:bg-cyan-500/20 group-hover:text-white transition-all">
                          Lire l'article
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* 6. Footer bar */}
      <div className="p-4 bg-[#050817] border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Classement indépendant et sécurisé par le protocole PURGE-INFO</span>
        </div>

        {!isPage && (
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
          >
            Fermer le classement
          </button>
        )}
      </div>
    </div>
  );

  // If used as a dedicated full page
  if (isPage) {
    return (
      <div
        id="rankings-full-page"
        className="w-full max-w-full min-h-screen bg-[#07080f] text-slate-100 font-sans pb-28 md:pb-16 animate-fadeIn overflow-x-clip"
      >
        {/* Top breadcrumb & return header */}
        <div className="w-full max-w-full bg-[#040817] border-b border-cyan-500/20 px-3 sm:px-8 py-2.5 sm:py-3 transition-all">
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-3 min-w-0">
            <button
              id="rankings-page-back-btn"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-600/25 text-cyan-300 hover:text-white border border-blue-500/40 hover:border-cyan-400/60 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-[0_0_10px_rgba(0,210,255,0.1)]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à l'accueil</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-blue-950/70 text-cyan-300 border border-cyan-500/35 shadow-[0_0_12px_rgba(0,210,255,0.15)]">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span>Palmarès Officiel</span>
              </span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-6xl mx-auto px-2 sm:px-8 pt-5 sm:pt-8 min-w-0">
          <div className="w-full max-w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#090e24] via-[#060a1a] to-[#040714] border border-cyan-500/40 shadow-[0_0_50px_rgba(0,210,255,0.15)] overflow-hidden">
            {rankingContent}
          </div>
        </div>
      </div>
    );
  }

  // If used as a modal overlay
  return (
    <div
      id="rankings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="rankings-modal-container"
        className="relative w-full max-w-5xl bg-gradient-to-b from-[#090e24] via-[#060a1a] to-[#040714] border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,210,255,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="overflow-y-auto">{rankingContent}</div>
      </div>
    </div>
  );
};
