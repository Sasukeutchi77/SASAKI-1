import React, { useState, useEffect } from 'react';
import { User, Article } from '../types';
import {
  X,
  CheckCircle2,
  UserPlus,
  UserCheck,
  FileText,
  Users,
  Calendar,
  Layers,
  Phone,
  Mail,
} from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArticleCard } from './ArticleCard';
import { realtime } from '../services/realtime';

interface MediaProfileModalProps {
  userId: string;
  onClose: () => void;
  onOpenArticle: (article: Article) => void;
  onOpenAuth: () => void;
}

export const MediaProfileModal: React.FC<MediaProfileModalProps> = ({
  userId,
  onClose,
  onOpenArticle,
  onOpenAuth,
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'articles' | 'about'>('articles');
  const [loading, setLoading] = useState<boolean>(true);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getUserProfile(userId);
      setProfileUser(res.user);
      setArticles(res.articles);
      setIsFollowing(!!res.user.isFollowing);
      setFollowersCount(res.user.followersCount || 0);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    const unsubArticleCreated = realtime.on('article:created', (newArt: Article) => {
      if (!newArt || !newArt.id) return;
      const isMine =
        newArt.authorId === userId ||
        newArt.mediaId === userId ||
        (profileUser?.mediaId && newArt.mediaId === profileUser.mediaId);

      if (isMine) {
        setArticles((prev) => {
          if (prev.some((a) => a.id === newArt.id)) return prev;
          return [newArt, ...prev];
        });
      }
    });

    const unsubArticleUpdated = realtime.on('article:updated', (updatedArt: Article) => {
      if (!updatedArt || !updatedArt.id) return;
      setArticles((prev) => prev.map((a) => (a.id === updatedArt.id ? { ...a, ...updatedArt } : a)));
    });

    const unsubArticleDeleted = realtime.on('article:deleted', ({ articleId }: { articleId: string }) => {
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    });

    const unsubArticleLiked = realtime.on('article:liked', ({ articleId, likesCount }: { articleId: string; likesCount: number }) => {
      setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, likesCount } : a)));
    });

    return () => {
      unsubArticleCreated();
      unsubArticleUpdated();
      unsubArticleDeleted();
      unsubArticleLiked();
    };
  }, [userId, profileUser?.mediaId]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) return onOpenAuth();
    try {
      const res = await api.toggleFollow(userId);
      setIsFollowing(res.isFollowing);
      setFollowersCount(res.followersCount);
      if (res.isVerified !== undefined) {
        setProfileUser((prev) => prev ? { ...prev, isVerified: res.isVerified } : null);
      } else if (res.followersCount >= 50) {
        setProfileUser((prev) => prev ? { ...prev, isVerified: true } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compute main categories of this media
  const mediaCategories = Array.from(new Set(articles.map((a) => a.categoryName)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b0e1a] border border-cyan-500/40 min-h-screen sm:min-h-0 sm:rounded-2xl shadow-[0_0_40px_rgba(0,243,255,0.2)] sm:my-8 overflow-hidden flex flex-col max-h-[95vh] text-slate-100 transition-all">
        {/* Modal close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-cyan-400 bg-[#0b0e1a]/80 hover:bg-[#141933] hover:text-cyan-200 border border-cyan-500/40 rounded-full transition-all backdrop-blur-xs cursor-pointer shadow-[0_0_12px_rgba(0,243,255,0.2)]"
        >
          <X className="w-5 h-5" />
        </button>

        {loading || !profileUser ? (
          <div className="p-16 text-center text-cyan-400/70 font-mono">
            <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-[0_0_12px_#00f3ff]" />
            <p>Chargement du profil...</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {/* Banner Cover */}
            <div className="h-36 sm:h-48 w-full bg-gradient-to-r from-cyan-950 via-[#0d1226] to-fuchsia-950/80 border-b border-cyan-500/30 relative">
              <div className="absolute inset-0 bg-[radial-gradient(#00f3ff_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            </div>

            {/* Profile Info Header */}
            <div className="px-4 sm:px-8 pb-6 border-b border-cyan-500/30 relative">
              <div className="flex flex-wrap items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
                <div className="flex items-end gap-4">
                  <img
                    src={
                      profileUser.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={profileUser.name}
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[#0b0e1a] shadow-[0_0_20px_rgba(0,243,255,0.3)] bg-[#101428]"
                  />
                  <div className="mb-1">
                    <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                      <span>{profileUser.mediaName || profileUser.name}</span>
                      {profileUser.isVerified && (
                        <VerifiedBadge size="sm" type={profileUser.mediaName ? 'media' : 'journalist'} showLabel label="Certifié" />
                      )}
                    </h1>
                    {profileUser.mediaName && profileUser.name !== profileUser.mediaName && (
                      <p className="text-xs text-cyan-400/70 font-mono">Représenté par {profileUser.name}</p>
                    )}
                    <span className="mt-1 inline-block text-[11px] font-bold font-mono uppercase tracking-wider text-cyan-300 bg-cyan-950/70 px-2.5 py-0.5 rounded border border-cyan-500/40 shadow-[0_0_8px_rgba(0,243,255,0.2)]">
                      {profileUser.role === 'admin'
                        ? 'Administration'
                        : profileUser.role === 'journalist'
                        ? 'Presse & Journalisme'
                        : 'Lecteur Citoyen'}
                    </span>
                  </div>
                </div>

                {/* Follow Button */}
                {currentUser?.id !== profileUser.id && (
                  <button
                    id="profile-follow-toggle-btn"
                    onClick={handleToggleFollow}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold font-mono text-sm transition-all cursor-pointer ${
                      isFollowing
                        ? 'bg-[#141933] hover:bg-[#1a2245] text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,243,255,0.15)]'
                        : 'bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:brightness-110'
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
                        <span>S'abonner</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Bio */}
              {profileUser.bio && (
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mt-2">
                  {profileUser.bio}
                </p>
              )}

              {/* Key Stats Bar */}
              <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-cyan-400/80 font-mono">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="font-black text-white">{followersCount.toLocaleString()}</span>
                  <span>abonnés</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="font-black text-white">{articles.length}</span>
                  <span>articles publiés</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-cyan-400/60">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Membre depuis {new Date(profileUser.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Media Categories Pills */}
              {mediaCategories.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-cyan-400/60 font-mono">Rubriques :</span>
                  {mediaCategories.map((c, i) => (
                    <span key={i} className="text-xs font-semibold font-mono px-2.5 py-0.5 rounded-full bg-[#101428] text-cyan-300 border border-cyan-500/30">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Navigation Tabs */}
            <div className="px-4 sm:px-8 border-b border-cyan-500/30 flex gap-6 bg-[#101428]">
              <button
                onClick={() => setActiveTab('articles')}
                className={`py-3 text-sm font-bold font-mono border-b-2 transition-all cursor-pointer ${
                  activeTab === 'articles'
                    ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                    : 'border-transparent text-cyan-400/50 hover:text-cyan-200'
                }`}
              >
                Articles ({articles.length})
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`py-3 text-sm font-bold font-mono border-b-2 transition-all cursor-pointer ${
                  activeTab === 'about'
                    ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                    : 'border-transparent text-cyan-400/50 hover:text-cyan-200'
                }`}
              >
                À propos
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 sm:p-8">
              {activeTab === 'articles' ? (
                articles.length === 0 ? (
                  <div className="p-12 text-center text-cyan-400/50 font-mono">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-cyan-400" />
                    <p>Aucun article publié pour le moment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {articles.map((art) => (
                      <ArticleCard
                        key={art.id}
                        article={art}
                        onOpenArticle={() => {
                          onOpenArticle(art);
                          onClose();
                        }}
                        onOpenProfile={() => {}}
                        onOpenAuth={onOpenAuth}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4 max-w-xl text-sm text-slate-200">
                  <div className="p-4 bg-[#101428] rounded-xl border border-cyan-500/30">
                    <h3 className="font-bold font-mono text-cyan-300 mb-2">Description éditoriale</h3>
                    <p className="leading-relaxed text-slate-300">
                      {profileUser.bio || 'Aucune description fournie.'}
                    </p>
                  </div>

                  <div className="p-4 bg-[#101428] rounded-xl border border-cyan-500/30 space-y-2 font-mono text-xs">
                    <h3 className="font-bold text-sm text-cyan-300 mb-2">Informations de contact & légitimité</h3>
                    <div className="flex items-center gap-2 text-cyan-400/80">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <span>{profileUser.email}</span>
                    </div>
                    {profileUser.phone && (
                      <div className="flex items-center gap-2 text-cyan-400/80">
                        <Phone className="w-4 h-4 text-cyan-400" />
                        <span>{profileUser.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-cyan-400/80 pt-1">
                      {profileUser.isVerified ? (
                        <VerifiedBadge size="sm" type={profileUser.mediaName ? 'media' : 'journalist'} />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-stone-500" />
                      )}
                      <span>
                        Statut de certification :{' '}
                        <strong className="text-white">
                          {profileUser.isVerified
                            ? 'Certifié officiel (Badge bleu TikTok)'
                            : `En attente (${followersCount}/50 abonnés pour auto-certification)`}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
