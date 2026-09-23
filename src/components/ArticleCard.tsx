import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  Video as VideoIcon,
} from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { realtime } from '../services/realtime';
import { ShareModal } from './ShareModal';
import { bookmarksStorage } from '../services/bookmarksStorage';
import { likesStorage } from '../services/likesStorage';
import { sfx } from '../services/soundEffects';

export interface ArticleCardProps {
  article: Article;
  onOpenArticle: (article: Article) => void;
  onOpenProfile: (userId: string) => void;
  onOpenAuth: () => void;
  onSelectTag?: (tag: string) => void;
  onSelectCategory?: (catIdOrSlug: string) => void;
  variant?: 'standard' | 'compact' | 'large' | 'featured' | 'horizontal';
  className?: string;
  titleClassName?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onOpenArticle,
  onOpenProfile,
  onOpenAuth,
  onSelectTag,
  onSelectCategory,
  variant = 'standard',
  className = '',
  titleClassName = '',
}) => {
  const { refreshUser } = useAuth();
  const [isLiked, setIsLiked] = useState<boolean>(() => likesStorage.isLiked(article.id) || !!article.isLiked);
  const [likesCount, setLikesCount] = useState<number>(article.likesCount);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(() => bookmarksStorage.isBookmarked(article.id) || !!article.isBookmarked);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Sync state when article id or explicit property flags change
  useEffect(() => {
    const locallyLiked = likesStorage.isLiked(article.id);
    setIsLiked(locallyLiked || !!article.isLiked);
    setLikesCount(article.likesCount);

    const locallyBookmarked = bookmarksStorage.isBookmarked(article.id);
    setIsBookmarked(locallyBookmarked || !!article.isBookmarked);
  }, [article.id, article.isLiked, article.isBookmarked]);

  // Subscribe to central likes and bookmarks changes so all cards stay synchronized
  useEffect(() => {
    const unsubLikes = likesStorage.subscribe((likedIds) => {
      setIsLiked(likedIds.includes(article.id));
    });
    const unsubBookmarks = bookmarksStorage.subscribe((bookmarks) => {
      setIsBookmarked(bookmarks.some((b) => b.id === article.id));
    });
    return () => {
      unsubLikes();
      unsubBookmarks();
    };
  }, [article.id]);

  // Real-time listener for likes count changes
  useEffect(() => {
    const unsub = realtime.on('article:liked', ({ articleId: aId, likesCount: aLikes }: { articleId: string; likesCount: number }) => {
      if (aId === article.id) {
        setLikesCount(aLikes);
      }
    });
    return () => {
      unsub();
    };
  }, [article.id]);

  // Approximate reading time (200 words/min)
  const words = (article.content || '').trim().split(/\s+/).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  // Format date
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return '';
    }
  };

  // Optimistic UI for Likes - Resilient and permanent
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.playLike();

    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    likesStorage.setLiked(article.id, nextLiked);

    try {
      const res = await api.toggleLikeArticle(article.id, article);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      console.error('Like request error:', err);
    }
  };

  // Optimistic UI for Bookmarks - Resilient and permanent
  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.playMechanicalClick();

    const nextBookmarked = !isBookmarked;
    setIsBookmarked(nextBookmarked);
    if (nextBookmarked) {
      bookmarksStorage.saveBookmark(article);
    } else {
      bookmarksStorage.removeBookmark(article.id);
    }

    try {
      const res = await api.toggleBookmarkArticle(article);
      setIsBookmarked(res.bookmarked);
      refreshUser();
    } catch (err) {
      console.error('Bookmark request error:', err);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareModal(true);
  };

  /* -------------------------------------------------------------
     VARIANT: COMPACT (Sidebar, Search result lists, Bookmarks)
     ------------------------------------------------------------- */
  if (variant === 'compact') {
    return (
      <article
        id={`article-card-compact-${article.id}`}
        onClick={() => onOpenArticle(article)}
        className={`group p-3 sm:p-3.5 bg-gradient-to-b from-[#0e1936]/85 to-[#050b1c]/95 hover:from-[#13224a]/90 hover:to-[#081028]/98 rounded-2xl border border-blue-500/25 hover:border-cyan-400/60 shadow-[0_8px_25px_-8px_rgba(0,85,255,0.2)] hover:shadow-[0_12px_30px_-5px_rgba(29,104,255,0.35)] transition-all duration-200 flex gap-3 cursor-pointer items-center ${className}`}
      >
        {/* Thumbnail on left */}
        {article.coverImage && (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-blue-500/30">
            <img
              src={article.coverImage}
              alt={article.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider font-mono px-1.5 py-0.2 rounded bg-blue-600/20 border border-blue-400/30">
                {article.categoryName}
              </span>
              <span className="text-[10px] text-blue-300/50">•</span>
              <span className="text-[10px] text-blue-300/60 font-mono">{formatDate(article.createdAt)}</span>
            </div>
            <h3 className={`font-bold text-xs sm:text-sm text-white glitch-hover transition-colors line-clamp-2 leading-snug ${titleClassName}`}>
              {article.title}
            </h3>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-blue-300/70">
            <div className="flex items-center gap-1 truncate max-w-[140px]">
              <span className="truncate font-semibold text-blue-100">{article.mediaName || article.authorName}</span>
              {article.isAuthorVerified && (
                <VerifiedBadge size="xs" type={article.mediaName ? 'media' : 'journalist'} />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 hover:text-red-400 transition-colors cursor-pointer py-1 px-1 ${
                  isLiked ? 'text-red-500 font-bold' : ''
                }`}
                title="J'aime"
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{likesCount}</span>
              </button>
              <button
                onClick={handleBookmark}
                className={`hover:text-cyan-300 transition-colors cursor-pointer py-1 px-1 ${
                  isBookmarked ? 'text-cyan-400' : ''
                }`}
                title="Enregistrer"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {showShareModal && (
          <ShareModal article={article} onClose={() => setShowShareModal(false)} />
        )}
      </article>
    );
  }

  /* -------------------------------------------------------------
     VARIANT: FEATURED / HERO (Sorsa High Impact Showcase)
     ------------------------------------------------------------- */
  if (variant === 'featured') {
    return (
      <article
        id={`article-card-featured-${article.id}`}
        onClick={() => onOpenArticle(article)}
        className={`group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#040817] text-white border border-blue-500/35 hover:border-cyan-400/70 shadow-[0_15px_40px_-10px_rgba(29,104,255,0.35)] hover:shadow-[0_20px_50px_-8px_rgba(0,210,255,0.5)] transition-all duration-300 cursor-pointer aspect-[16/11] sm:aspect-[21/9] ${className}`}
      >
        <img
          src={article.coverImage}
          alt={article.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040817] via-[#040817]/65 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-7 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-yellow-400 text-slate-950 flex items-center gap-1 shadow-[0_0_12px_rgba(250,204,21,0.85)]">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              À la Une • {article.categoryName}
            </span>
            <span className="text-xs text-blue-200 font-medium">
              {formatDate(article.createdAt)}
            </span>
            {article.videoUrl && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.7)] font-mono">
                <Play className="w-2.5 h-2.5 fill-current" />
                Vidéo
              </span>
            )}
            <span className="text-xs text-blue-400/60">•</span>
            <span className="text-xs text-blue-200 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-cyan-400" />
              {readingTimeMinutes} min
            </span>
          </div>

          <h2 className={`font-editorial text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight sm:leading-snug glitch-hover transition-colors line-clamp-2 ${titleClassName}`}>
            {article.title}
          </h2>

          {article.summary && (
            <p className="mt-2 text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-3xl leading-relaxed hidden sm:block">
              {article.summary}
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center justify-between text-xs text-blue-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  article.authorAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={article.authorName}
                referrerPolicy="no-referrer"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-blue-400/40"
              />
              <span className="font-bold text-white truncate text-xs sm:text-sm">
                {article.mediaName || article.authorName}
              </span>
              {article.isAuthorVerified && (
                <VerifiedBadge size="sm" type={article.mediaName ? 'media' : 'journalist'} />
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-200">
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {likesCount}
              </span>
              <span className="flex items-center gap-1 text-slate-200">
                <MessageSquare className="w-4 h-4" />
                {article.commentsCount}
              </span>
            </div>
          </div>
        </div>

        {showShareModal && (
          <ShareModal article={article} onClose={() => setShowShareModal(false)} />
        )}
      </article>
    );
  }

  /* -------------------------------------------------------------
     VARIANT: LARGE (Single column magazine / Featured article)
     ------------------------------------------------------------- */
  if (variant === 'large') {
    return (
      <article
        id={`article-card-large-${article.id}`}
        onClick={() => onOpenArticle(article)}
        className={`group bg-gradient-to-b from-[#0e1936]/85 to-[#050b1c]/95 rounded-2xl sm:rounded-3xl border border-blue-500/25 hover:border-cyan-400/60 shadow-[0_10px_30px_-10px_rgba(0,85,255,0.22)] hover:shadow-[0_16px_35px_-6px_rgba(29,104,255,0.35)] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer ${className}`}
      >
        {/* Cover image */}
        {article.coverImage && (
          <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden border-b border-blue-500/20">
            <img
              src={article.coverImage}
              alt={article.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-[#040817]/85 border border-blue-500/40 backdrop-blur-xs text-[11px] font-mono text-cyan-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{readingTimeMinutes} min</span>
            </div>
            <div className="absolute top-3 left-3">
              <span className="text-[11px] font-bold font-mono px-3 py-1 rounded-full bg-blue-600/25 text-cyan-300 shadow-md border border-blue-400/40 backdrop-blur-md">
                {article.categoryName}
              </span>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-300/70 font-mono mb-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProfile(article.authorId);
                }}
                className="font-bold text-white hover:text-cyan-300 flex items-center gap-1 transition-colors font-sans"
              >
                <span>{article.mediaName || article.authorName}</span>
                {article.isAuthorVerified && (
                  <VerifiedBadge size="sm" type={article.mediaName ? 'media' : 'journalist'} />
                )}
              </button>
              <span>•</span>
              <span>{formatDate(article.createdAt)}</span>
            </div>

            <h2 className={`text-xl sm:text-2xl font-black text-white leading-tight glitch-hover transition-colors ${titleClassName}`}>
              {article.title}
            </h2>

            {article.summary && (
              <p className="mt-2 text-sm sm:text-base text-slate-200 leading-relaxed line-clamp-3">
                {article.summary}
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-blue-500/20 flex items-center justify-between text-blue-300/70 text-xs font-mono">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 font-bold transition-colors py-1 cursor-pointer ${
                  isLiked ? 'text-red-500' : 'hover:text-red-400'
                }`}
              >
                <Heart className={`w-4 h-4 active:scale-125 transition-transform ${isLiked ? 'fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]' : ''}`} />
                <span>{likesCount}</span>
              </button>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                <span>{article.commentsCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{article.viewsCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-full hover:bg-blue-600/20 transition-colors cursor-pointer ${
                  isBookmarked ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(0,210,255,0.7)]' : 'text-blue-300/60 hover:text-cyan-300'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleShareClick}
                className="p-2 rounded-full text-blue-300/60 hover:text-cyan-300 hover:bg-blue-600/20 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {showShareModal && (
          <ShareModal article={article} onClose={() => setShowShareModal(false)} />
        )}
      </article>
    );
  }

  /* -------------------------------------------------------------
     VARIANT: HORIZONTAL (Editorial listing / Desktop Feed)
     ------------------------------------------------------------- */
  if (variant === 'horizontal') {
    return (
      <article
        id={`article-card-horizontal-${article.id}`}
        onClick={() => onOpenArticle(article)}
        className={`group bg-gradient-to-b from-[#0e1936]/80 to-[#050b1c]/95 rounded-2xl border border-blue-500/25 hover:border-cyan-400/60 shadow-[0_10px_30px_-10px_rgba(0,85,255,0.22)] hover:shadow-[0_14px_35px_-6px_rgba(29,104,255,0.35)] transition-all duration-300 overflow-hidden flex flex-col sm:flex-row cursor-pointer ${className}`}
      >
        {/* Cover image on left (or top on small mobile) */}
        {article.coverImage && (
          <div className="relative sm:w-2/5 aspect-[16/10] sm:aspect-auto bg-slate-900 overflow-hidden shrink-0 border-b sm:border-b-0 sm:border-r border-blue-500/20">
            <img
              src={article.coverImage}
              alt={article.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-[#040817]/85 border border-blue-500/40 backdrop-blur-xs text-[10px] font-mono text-cyan-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{readingTimeMinutes} min</span>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-blue-300/70 font-mono mb-2">
              <div className="flex items-center gap-2 truncate">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProfile(article.authorId);
                  }}
                  className="font-bold text-white hover:text-cyan-300 flex items-center gap-1 truncate cursor-pointer transition-colors font-sans"
                >
                  <span className="truncate">{article.mediaName || article.authorName}</span>
                  {article.isAuthorVerified && (
                    <VerifiedBadge size="sm" type={article.mediaName ? 'media' : 'journalist'} />
                  )}
                </button>
                <span>•</span>
                <span className="shrink-0">{formatDate(article.createdAt)}</span>
              </div>

              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-400/40 shadow-[0_0_6px_rgba(0,210,255,0.2)] shrink-0">
                {article.categoryName}
              </span>
            </div>

            <h3 className={`text-base sm:text-lg font-black text-white leading-snug glitch-hover transition-colors line-clamp-2 ${titleClassName}`}>
              {article.title}
            </h3>

            {article.summary && (
              <p className="mt-1.5 text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed">
                {article.summary}
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center justify-between text-blue-300/70 text-xs font-mono">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 font-medium transition-colors py-1 cursor-pointer ${
                  isLiked ? 'text-red-500 font-bold' : 'hover:text-red-400'
                }`}
                title="Aimer cet article"
              >
                <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'fill-red-500 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]' : ''}`} />
                <span>{likesCount}</span>
              </button>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                <span>{article.commentsCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{article.viewsCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-full hover:bg-blue-600/20 transition-colors cursor-pointer ${
                  isBookmarked ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(0,210,255,0.7)]' : 'text-blue-300/60 hover:text-cyan-300'
                }`}
                title="Enregistrer l'article"
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-cyan-400' : ''}`} />
              </button>
              <button
                onClick={handleShareClick}
                className="p-2 rounded-full text-blue-300/60 hover:text-cyan-300 hover:bg-blue-600/20 transition-colors cursor-pointer"
                title="Partager"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {showShareModal && (
          <ShareModal article={article} onClose={() => setShowShareModal(false)} />
        )}
      </article>
    );
  }

  /* -------------------------------------------------------------
     VARIANT: STANDARD (Default 2-col or responsive feed grid)
     ------------------------------------------------------------- */
  return (
    <article
      id={`article-card-${article.id}`}
      onClick={() => onOpenArticle(article)}
      className={`group bg-gradient-to-b from-[#0e1936]/80 to-[#050b1c]/95 hover:from-[#122048]/85 hover:to-[#070e24]/98 rounded-2xl border border-blue-500/25 hover:border-cyan-400/60 shadow-[0_10px_30px_-10px_rgba(0,85,255,0.22)] hover:shadow-[0_14px_35px_-6px_rgba(29,104,255,0.35)] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer ${className}`}
    >
      {/* Card Header: Author, Media, Verification Badge, Date */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-blue-500/15">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile(article.authorId);
          }}
          className="flex items-center gap-2.5 text-left group/author min-w-0"
        >
          <img
            src={
              article.authorAvatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            }
            alt={article.authorName}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover border border-blue-500/40 group-hover/author:border-cyan-400 group-hover/author:shadow-[0_0_12px_rgba(0,210,255,0.5)] transition-all shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1 leading-tight">
              <span className="font-bold text-xs sm:text-sm text-white group-hover/author:text-cyan-300 transition-colors truncate">
                {article.mediaName || article.authorName}
              </span>
              {article.isAuthorVerified && (
                <VerifiedBadge size="sm" type={article.mediaName ? 'media' : 'journalist'} />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-300/60 font-mono">
              {article.mediaName && article.authorName !== article.mediaName && (
                <>
                  <span className="truncate">{article.authorName}</span>
                  <span>•</span>
                </>
              )}
              <span>{formatDate(article.createdAt)}</span>
            </div>
          </div>
        </button>

        {/* Category badge */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectCategory) {
              onSelectCategory(article.categoryId);
            }
          }}
          className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-400/40 shadow-[0_0_8px_rgba(0,210,255,0.2)] hover:bg-blue-600/30 transition-all cursor-pointer font-mono"
        >
          {article.categoryName}
        </button>
      </div>

      {/* Main Cover Image */}
      {article.coverImage && (
        <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden border-b border-blue-500/20">
          <img
            src={article.coverImage}
            alt={article.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
          {article.videoUrl && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-600/90 text-white border border-red-400/60 backdrop-blur-xs text-[10px] font-mono font-bold flex items-center gap-1 shadow-lg">
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>REPORTAGE VIDÉO</span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-[#040817]/85 border border-blue-500/40 backdrop-blur-xs text-[10px] font-mono text-cyan-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{readingTimeMinutes} min</span>
          </div>
        </div>
      )}

      {/* Body: Title, Summary, Tags */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <h2 className={`font-black text-base sm:text-lg text-white leading-snug glitch-hover transition-colors line-clamp-2 ${titleClassName}`}>
            {article.title}
          </h2>
          {article.summary && (
            <p className="mt-1.5 text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed">
              {article.summary}
            </p>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {article.tags.slice(0, 3).map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectTag) onSelectTag(tag);
                  }}
                  className="text-[10px] text-cyan-300 bg-[#070d24] border border-blue-500/30 hover:border-cyan-400 hover:shadow-[0_0_8px_rgba(0,210,255,0.3)] px-2 py-0.5 rounded-md font-mono transition-all cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
              {article.tags.length > 3 && (
                <span className="text-[10px] text-blue-300/60 bg-[#070d24] px-1.5 py-0.5 rounded-md font-mono">
                  +{article.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action bar: Likes, Comments, Views, Bookmarks, Share */}
        <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center justify-between text-blue-300/70 text-xs font-mono">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              id={`like-btn-${article.id}`}
              onClick={handleLike}
              className={`flex items-center gap-1.5 font-medium transition-colors py-1 cursor-pointer ${
                isLiked ? 'text-red-500 font-bold' : 'hover:text-red-400'
              }`}
              title="Aimer cet article"
            >
              <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'fill-red-500 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]' : ''}`} />
              <span>{likesCount}</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => onOpenArticle(article)}
              className="flex items-center gap-1.5 hover:text-cyan-200 font-medium transition-colors py-1 cursor-pointer"
              title="Commentaires"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{article.commentsCount}</span>
            </button>

            {/* Views counter */}
            <div className="flex items-center gap-1 text-blue-400/50" title="Nombre de vues">
              <Eye className="w-3.5 h-3.5" />
              <span>{article.viewsCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Bookmark button */}
            <button
              id={`bookmark-btn-${article.id}`}
              onClick={handleBookmark}
              className={`p-1.5 rounded-full hover:bg-blue-600/20 transition-colors cursor-pointer ${
                isBookmarked ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(0,210,255,0.7)]' : 'text-blue-300/60 hover:text-cyan-300'
              }`}
              title="Enregistrer l'article"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-cyan-400' : ''}`} />
            </button>

            {/* Share button */}
            <button
              id={`share-btn-${article.id}`}
              onClick={handleShareClick}
              className="p-1.5 rounded-full text-blue-300/60 hover:text-cyan-300 hover:bg-blue-600/20 transition-colors cursor-pointer"
              title="Partager l'actualité"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareModal article={article} onClose={() => setShowShareModal(false)} />
      )}
    </article>
  );
};
