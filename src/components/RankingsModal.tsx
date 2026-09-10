import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Flame,
  Users,
  Eye,
  Heart,
  Building2,
  BookOpen,
  CheckCircle2,
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
} from 'lucide-react';
import { TopMediaHouse, TopJournalist, Article } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from './VerifiedBadge';
import { sfx } from '../services/soundEffects';

interface RankingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenArticle: (article: Article | string) => void;
  onOpenProfile: (userId: string) => void;
  onOpenMediaHouses?: () => void;
  onOpenAuth: () => void;
}

export const RankingsModal: React.FC<RankingsModalProps> = ({
  isOpen,
  onClose,
  onOpenArticle,
  onOpenProfile,
  onOpenMediaHouses,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'houses' | 'journalists'>('houses');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'followers' | 'articles' | 'views'>('popularity');
  const [topHouses, setTopHouses] = useState<TopMediaHouse[]>([]);
  const [topJournalists, setTopJournalists] = useState<TopJournalist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followingLoading, setFollowingLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.getTopRankings();
        setTopHouses(res.topHouses);
        setTopJournalists(res.topJournalists);

        const map: Record<string, boolean> = {};
        res.topHouses.forEach((h) => {
          if (h.isFollowing) map[h.id] = true;
        });
        res.topJournalists.forEach((j) => {
          if (j.isFollowing) map[j.id] = true;
        });
        setFollowingMap(map);
      } catch (err) {
        console.error('Failed to load rankings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

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
      console.error('Error toggling follow:', err);
    } finally {
      setFollowingLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getFilteredAndSorted = () => {
    const list = activeTab === 'houses' ? [...topHouses] : [...topJournalists];
    const filtered = list.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchBio = 'bio' in item ? (item.bio || '').toLowerCase().includes(q) : false;
      const matchMotto = 'motto' in item ? (item.motto || '').toLowerCase().includes(q) : false;
      return matchName || matchBio || matchMotto;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'followers') return (b.followersCount || 0) - (a.followersCount || 0);
      if (sortBy === 'articles') return (b.articlesCount || 0) - (a.articlesCount || 0);
      if (sortBy === 'views') return (b.totalViews || 0) - (a.totalViews || 0);
      return (b.popularityScore || 0) - (a.popularityScore || 0);
    });
  };

  const currentItems = getFilteredAndSorted();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div
        id="rankings-modal-container"
        className="relative w-full max-w-4xl bg-gradient-to-b from-[#090e24] via-[#060a1a] to-[#040714] border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,210,255,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 border-b border-cyan-500/25 bg-gradient-to-r from-blue-950/60 to-cyan-950/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 via-amber-400 to-cyan-400 flex items-center justify-center text-black shadow-[0_0_25px_rgba(234,179,8,0.5)] border border-white/40 shrink-0">
              <Trophy className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  PALMARÈS OFFICIEL SASAKI
                </span>
                <span className="px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 text-[10px] font-mono font-bold border border-yellow-400/40">
                  TOP 7
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Tableau d'Honneur : Les 7 Incontournables
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Classement d'influence calculé en temps réel selon les abonnés certifiés, lectures vérifiées et régularité éditoriale.
              </p>
            </div>
          </div>

          <button
            id="close-rankings-modal-btn"
            onClick={() => {
              sfx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/15 bg-[#070b1e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-[#0b1028] p-1 rounded-2xl border border-cyan-500/30">
            <button
              onClick={() => {
                sfx.playMechanicalClick();
                setActiveTab('houses');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'houses'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Top 7 Maisons de Presse ({topHouses.length})</span>
            </button>

            <button
              onClick={() => {
                sfx.playMechanicalClick();
                setActiveTab('journalists');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'journalists'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Top 7 Journalistes d'Élite ({topJournalists.length})</span>
            </button>
          </div>

          {/* Search and Sort controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1433] border border-cyan-500/30 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0d1433] border border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
            >
              <option value="popularity">Score Popularité</option>
              <option value="followers">Plus d'Abonnés</option>
              <option value="articles">Plus d'Articles</option>
              <option value="views">Plus de Vues</option>
            </select>
          </div>
        </div>

        {/* Algorithm Insight Banner */}
        <div className="px-5 py-2.5 bg-blue-950/30 border-b border-cyan-500/10 flex items-center gap-2 text-[11px] text-cyan-300/80 font-mono">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Score = (Abonnés × 15) + (Articles × 20) + (Lectures Certifiées × 1) + (Approbations × 6) + Bonus Vérifié.
          </span>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {loading ? (
            <div className="py-16 text-center text-cyan-400 flex flex-col items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 animate-spin text-yellow-400" />
              <span className="text-xs font-mono">Synchronisation des archives de réputation...</span>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm px-4">
              <Award className="w-12 h-12 mx-auto mb-3 text-cyan-500/30" />
              <p className="font-semibold text-slate-200">
                {searchQuery
                  ? 'Aucun résultat correspondant à votre recherche.'
                  : activeTab === 'journalists'
                  ? 'Aucun journaliste accrédité pour le moment.'
                  : 'Aucune maison de journalistes disponible pour le moment.'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
                {searchQuery
                  ? 'Essayez avec un autre mot-clé ou réinitialisez la recherche.'
                  : activeTab === 'journalists'
                  ? 'Le classement sera actualisé en direct dès que les journalistes publieront leurs articles et chroniques.'
                  : 'Les maisons de presse accréditées apparaîtront ici avec leurs statistiques officielles.'}
              </p>
            </div>
          ) : (
            currentItems.map((item) => {
              const isFirst = item.rank === 1;
              const isSecond = item.rank === 2;
              const isThird = item.rank === 3;
              const isFollowing = !!followingMap[item.id];
              const isLoadingFollow = !!followingLoading[item.id];
              const isHouse = activeTab === 'houses';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isHouse) {
                      if (onOpenMediaHouses) {
                        onClose();
                        onOpenMediaHouses();
                      }
                    } else {
                      onClose();
                      onOpenProfile(item.id);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all duration-200 group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isFirst
                      ? 'bg-gradient-to-r from-yellow-500/10 via-[#0e1430] to-[#0a0f26] border-yellow-400/40 shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:border-yellow-300'
                      : isSecond
                      ? 'bg-gradient-to-r from-slate-400/10 via-[#0b1028] to-[#080d22] border-slate-300/30 hover:border-slate-200'
                      : isThird
                      ? 'bg-gradient-to-r from-amber-700/10 via-[#0b1028] to-[#080d22] border-amber-600/30 hover:border-amber-500'
                      : 'bg-[#090e24]/70 hover:bg-[#0d1435] border-cyan-500/20 hover:border-cyan-400/40'
                  }`}
                >
                  {/* Left: Rank + Avatar + Identity */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-sm shrink-0 shadow-inner border border-white/10">
                      {isFirst ? (
                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black flex items-center justify-center shadow-lg font-black">
                          #1
                        </div>
                      ) : isSecond ? (
                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-slate-300 to-slate-100 text-black flex items-center justify-center shadow-lg font-black">
                          #2
                        </div>
                      ) : isThird ? (
                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-lg font-black">
                          #3
                        </div>
                      ) : (
                        <span className="text-cyan-400 bg-cyan-950/60 w-full h-full rounded-xl flex items-center justify-center border border-cyan-500/30">
                          #{item.rank}
                        </span>
                      )}
                    </div>

                    {/* Logo/Avatar */}
                    <img
                      src={
                        isHouse
                          ? (item as TopMediaHouse).logo ||
                            'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80'
                          : (item as TopJournalist).avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className={`w-12 h-12 object-cover border-2 shadow-md shrink-0 ${
                        isHouse ? 'rounded-2xl' : 'rounded-full'
                      } ${
                        isFirst
                          ? 'border-yellow-400'
                          : isSecond
                          ? 'border-slate-300'
                          : isThird
                          ? 'border-amber-500'
                          : 'border-cyan-500/40'
                      }`}
                    />

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm sm:text-base font-black text-white group-hover:text-cyan-300 transition-colors truncate">
                          {item.name}
                        </h3>
                        <VerifiedBadge size="sm" type={isHouse ? 'media' : 'journalist'} />
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 font-mono font-bold border border-cyan-500/30 hidden sm:inline-block">
                          {item.badgeLabel}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        {isHouse
                          ? (item as TopMediaHouse).motto || (item as TopMediaHouse).description
                          : (item as TopJournalist).bio || (item as TopJournalist).mediaName}
                      </p>

                      {/* Recent article link */}
                      {item.recentArticleTitle && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.recentArticleId) {
                              onClose();
                              onOpenArticle(item.recentArticleId);
                            }
                          }}
                          className="flex items-center gap-1 text-[11px] text-cyan-400/90 hover:text-cyan-200 mt-1 cursor-pointer font-mono"
                        >
                          <BookOpen className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate underline underline-offset-2">
                            {item.recentArticleTitle}
                          </span>
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Metrics + Follow Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Score de Popularité</div>
                        <div className="text-sm font-black text-cyan-300 flex items-center justify-end gap-1">
                          <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span>{item.popularityScore.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-slate-400">Audience</div>
                        <div className="text-sm font-bold text-white">
                          {(item.followersCount || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right hidden md:block">
                        <div className="text-[10px] text-slate-400">Publications</div>
                        <div className="text-sm font-bold text-white">{item.articlesCount || 0}</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleFollow(item.id, isHouse ? 'house' : 'journalist', e)}
                      disabled={isLoadingFollow || user?.id === item.id}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isFollowing
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Abonné</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Suivre</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#050817] border-t border-cyan-500/20 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Classement mis à jour toutes les 60 secondes</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
