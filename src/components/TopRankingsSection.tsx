import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Flame,
  Users,
  Eye,
  Building2,
  ArrowRight,
  UserPlus,
  UserCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { TopMediaHouse, TopJournalist, Article } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from './VerifiedBadge';
import { sfx } from '../services/soundEffects';

interface TopRankingsSectionProps {
  onOpenArticle: (article: Article | string) => void;
  onOpenProfile: (userId: string) => void;
  onOpenMediaHouses?: () => void;
  onOpenFullRankings?: () => void;
  onOpenAuth: () => void;
}

export const TopRankingsSection: React.FC<TopRankingsSectionProps> = ({
  onOpenArticle,
  onOpenProfile,
  onOpenMediaHouses,
  onOpenFullRankings,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'houses' | 'journalists'>('houses');
  const [topHouses, setTopHouses] = useState<TopMediaHouse[]>([]);
  const [topJournalists, setTopJournalists] = useState<TopJournalist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followingLoading, setFollowingLoading] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getTopRankings();
      setTopHouses(res.topHouses || []);
      setTopJournalists(res.topJournalists || []);

      const map: Record<string, boolean> = {};
      (res.topHouses || []).forEach((h) => {
        if (h.isFollowing) map[h.id] = true;
      });
      (res.topJournalists || []).forEach((j) => {
        if (j.isFollowing) map[j.id] = true;
      });
      setFollowingMap(map);
    } catch (err) {
      console.error('Failed to load top rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

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
      console.error('Erreur follow:', err);
    } finally {
      setFollowingLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-yellow-400/70 text-yellow-300 text-xs font-black shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            <Crown className="w-3.5 h-3.5 text-yellow-300 stroke-[2.5]" />
            <span>#1 OR</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-300/15 border border-slate-300/60 text-slate-200 text-xs font-black shadow-[0_0_12px_rgba(203,213,225,0.3)]">
            <Medal className="w-3.5 h-3.5 text-slate-300 stroke-[2.5]" />
            <span>#2 ARGENT</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-700/20 border border-amber-600/50 text-amber-300 text-xs font-black shadow-[0_0_10px_rgba(217,119,6,0.25)]">
            <Medal className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
            <span>#3 BRONZE</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-black font-mono">
            <span>#{rank}</span>
          </div>
        );
    }
  };

  const currentList = activeTab === 'houses' ? topHouses : topJournalists;

  return (
    <section
      id="top-rankings-section"
      className="relative my-8 rounded-3xl bg-gradient-to-b from-[#080d22] via-[#05091a] to-[#030612] border border-cyan-500/35 p-4 sm:p-6 lg:p-7 shadow-[0_0_35px_rgba(0,210,255,0.12)] overflow-hidden"
    >
      {/* Background Cyberpunk Accents */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 via-amber-400 to-cyan-400 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(234,179,8,0.5)] border border-white/40 shrink-0">
            <Trophy className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                CLASSEMENT OFFICIEL PURGE-INFO
              </span>
              <span className="text-[9px] px-2 py-0.2 rounded-full bg-cyan-950/80 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                {currentList.length} {activeTab === 'houses' ? 'rédactions' : 'journalistes'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Palmarès de l'Information Citoyenne</span>
              <Flame className="w-5 h-5 text-orange-400 inline" />
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
              Les rédactions et journalistes les plus suivis, ordonnés par score d'impact vérifié.
            </p>
          </div>
        </div>

        {/* Tab Switcher & Full View Link */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="bg-[#0b1028] p-1 rounded-2xl border border-cyan-500/30 flex items-center shadow-inner">
            <button
              id="top-ranking-tab-houses"
              onClick={() => {
                sfx.playMechanicalClick();
                setActiveTab('houses');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'houses'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Maisons de Presse</span>
            </button>
            <button
              id="top-ranking-tab-journalists"
              onClick={() => {
                sfx.playMechanicalClick();
                setActiveTab('journalists');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'journalists'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Journalistes</span>
            </button>
          </div>

          {onOpenFullRankings && (
            <button
              id="top-ranking-open-full-btn"
              onClick={() => {
                sfx.playClick();
                onOpenFullRankings();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 hover:text-white text-xs font-extrabold transition-all shadow-[0_0_12px_rgba(0,210,255,0.2)] cursor-pointer"
            >
              <span>Voir tout le classement</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-cyan-400">
          <RefreshCw className="w-7 h-7 animate-spin" />
          <span className="text-xs font-mono tracking-wider">Calcul des scores et synchronisation...</span>
        </div>
      ) : currentList.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs">
          Aucun classement disponible pour le moment.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {currentList.slice(0, 3).map((item, idx) => {
              const displayRank = idx + 1;
              const isFollowing = !!followingMap[item.id];
              const isLoadingFollow = !!followingLoading[item.id];
              const isHouse = activeTab === 'houses';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isHouse) {
                      if (onOpenMediaHouses) onOpenMediaHouses();
                    } else {
                      onOpenProfile(item.id);
                    }
                  }}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 group cursor-pointer flex flex-col justify-between ${
                    displayRank === 1
                      ? 'bg-gradient-to-b from-[#131735] via-[#0d122b] to-[#070b1d] border-yellow-400/50 shadow-[0_0_25px_rgba(234,179,8,0.25)] hover:border-yellow-300'
                      : displayRank === 2
                      ? 'bg-gradient-to-b from-[#0f142c] via-[#0a0e22] to-[#060918] border-slate-300/40 shadow-[0_0_20px_rgba(203,213,225,0.15)] hover:border-slate-200'
                      : 'bg-gradient-to-b from-[#0e1226] via-[#090d1f] to-[#050816] border-amber-600/35 shadow-[0_0_18px_rgba(217,119,6,0.15)] hover:border-amber-500'
                  }`}
                >
                  <div>
                    {/* Rank + Score */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {getRankBadge(displayRank)}
                      <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-300/90 font-bold bg-black/40 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span>{(item.popularityScore || 0).toLocaleString()} pts</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-3 mb-3">
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
                        className={`w-14 h-14 object-cover border-2 shadow-lg transition-transform group-hover:scale-105 shrink-0 ${
                          isHouse ? 'rounded-2xl' : 'rounded-full'
                        } ${
                          displayRank === 1
                            ? 'border-yellow-400'
                            : displayRank === 2
                            ? 'border-slate-300'
                            : 'border-amber-500'
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-white font-black text-sm group-hover:text-cyan-300 transition-colors truncate">
                          <span className="truncate">{item.name}</span>
                          <VerifiedBadge size="xs" type={isHouse ? 'media' : 'journalist'} />
                        </div>
                        <p className="text-[11px] text-cyan-400/80 font-mono truncate mt-0.5">
                          {isHouse
                            ? (item as TopMediaHouse).motto || (item as TopMediaHouse).specialties?.[0] || 'Média accrédité'
                            : (item as TopJournalist).mediaName || 'Journaliste d’investigation'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                          <span className="text-white font-bold">{(item.followersCount || 0).toLocaleString()}</span> abonnés
                          <span>•</span>
                          <span className="text-white font-bold">{item.articlesCount || 0}</span> articles
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleToggleFollow(item.id, isHouse ? 'house' : 'journalist', e)}
                      disabled={isLoadingFollow || user?.id === (isHouse ? (item as TopMediaHouse).ownerId : item.id)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isFollowing
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(0,210,255,0.3)]'
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
                          <span>{isHouse ? "S'abonner" : 'Suivre'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subsequent Ranks (#4+) */}
          {currentList.length > 3 && (
            <div className="rounded-2xl bg-[#090e24]/70 border border-cyan-500/20 divide-y divide-cyan-500/10 overflow-hidden">
              {currentList.slice(3, 7).map((item, idx) => {
                const displayRank = idx + 4;
                const isFollowing = !!followingMap[item.id];
                const isLoadingFollow = !!followingLoading[item.id];
                const isHouse = activeTab === 'houses';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isHouse) {
                        if (onOpenMediaHouses) onOpenMediaHouses();
                      } else {
                        onOpenProfile(item.id);
                      }
                    }}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-cyan-500/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        #{displayRank}
                      </span>

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
                        className={`w-9 h-9 object-cover border border-cyan-500/30 shrink-0 ${
                          isHouse ? 'rounded-lg' : 'rounded-full'
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1">
                          <span>{item.name}</span>
                          <VerifiedBadge size="xs" type={isHouse ? 'media' : 'journalist'} />
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {(item.followersCount || 0).toLocaleString()} abonnés • {item.articlesCount || 0} articles
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-cyan-300 hidden sm:inline">
                        {(item.popularityScore || 0).toLocaleString()} pts
                      </span>

                      <button
                        onClick={(e) => handleToggleFollow(item.id, isHouse ? 'house' : 'journalist', e)}
                        disabled={isLoadingFollow || user?.id === (isHouse ? (item as TopMediaHouse).ownerId : item.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
          )}
        </div>
      )}
    </section>
  );
};
