import React, { useState, useEffect } from 'react';
import { Article, Comment } from '../types';
import {
  X,
  Heart,
  Bookmark,
  Share2,
  CheckCircle2,
  MessageSquare,
  Clock,
  Eye,
  Flag,
  CornerDownRight,
  Send,
  Edit,
  Trash2,
  UserPlus,
  UserCheck,
  Video as VideoIcon,
  Terminal,
  Type,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShareModal } from './ShareModal';
import { getCoverUrl } from '../services/cloudinary';
import { PhotoGallery } from './media/PhotoGallery';
import { VideoPlayer } from './media/VideoPlayer';
import { AdminConfirmDialog } from './admin/AdminConfirmDialog';
import { FactCheckBadge } from './FactCheckBadge';
import { ArticlePoll } from './ArticlePoll';

interface ArticleDetailModalProps {
  articleId: string;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenAuth: () => void;
  onArticleDeleted?: () => void;
  onOpenEditArticle?: (article: Article) => void;
  onSelectTag?: (tag: string) => void;
  onOpenArticle?: (article: Article) => void;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  articleId,
  onClose,
  onOpenProfile,
  onOpenAuth,
  onArticleDeleted,
  onOpenEditArticle,
  onSelectTag,
  onOpenArticle,
}) => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // Optimistic article state
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);

  // Modals state
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('Désinformation / Fausses nouvelles');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  // Comment edit / reply / report states
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState<string>('');
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);
  const [commentReportReason, setCommentReportReason] = useState<string>('Contenu haineux ou insultant');
  const [commentReportDetails, setCommentReportDetails] = useState<string>('');
  const [commentReportSuccess, setCommentReportSuccess] = useState<boolean>(false);
  const [confirmDeleteArticle, setConfirmDeleteArticle] = useState<boolean>(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);

  // Zen Reader Mode states
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [zenFontSize, setZenFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('lg');
  const [isMonoFont, setIsMonoFont] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const total = target.scrollHeight - target.clientHeight;
    if (total > 0) {
      setScrollProgress(Math.min(100, Math.max(0, Math.round((target.scrollTop / total) * 100))));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZenMode) {
          setIsZenMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  // Fetch article details & comments
  const loadData = async () => {
    try {
      setLoading(true);
      const artRes = await api.getArticle(articleId);
      setArticle(artRes.article);
      setIsLiked(!!artRes.article.isLiked);
      setLikesCount(artRes.article.likesCount);
      setIsBookmarked(!!artRes.article.isBookmarked);

      // Fetch author profile to get accurate follow state
      try {
        const authorProfile = await api.getUserProfile(artRes.article.authorId);
        setIsFollowingAuthor(!!authorProfile.user.isFollowing);
        setFollowersCount(authorProfile.user.followersCount || 0);
      } catch {
        // Ignored
      }

      // Fetch comments
      const commRes = await api.getComments(articleId);
      setComments(commRes.comments);

      // Fetch related recommendations in the same category
      if (artRes.article?.categoryId) {
        api.getArticles({ category: artRes.article.categoryId, limit: 4 })
          .then((rel) => {
            setRelatedArticles((rel.articles || []).filter((a) => a.id !== articleId).slice(0, 3));
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load article:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [articleId]);

  // Active reading view tracker: registers real view after 3.5s of reading
  useEffect(() => {
    if (!articleId) return;
    const timer = setTimeout(() => {
      api.recordView(articleId).then((res) => {
        if (res && res.viewsCount) {
          setArticle((prev) => (prev ? { ...prev, viewsCount: res.viewsCount } : prev));
        }
      }).catch(() => {});
    }, 3500);
    return () => clearTimeout(timer);
  }, [articleId]);

  // Optimistic Like with Rollback
  const handleLike = async () => {
    if (!isAuthenticated) return onOpenAuth();
    const prevLiked = isLiked;
    const prevCount = likesCount;

    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await api.toggleLikeArticle(articleId);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      console.error('Like failed, rollback:', err);
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  // Optimistic Bookmark with Rollback
  const handleBookmark = async () => {
    if (!isAuthenticated) return onOpenAuth();
    const prevBookmarked = isBookmarked;
    setIsBookmarked(!prevBookmarked);

    try {
      const res = await api.toggleBookmarkArticle(articleId);
      setIsBookmarked(res.bookmarked);
      refreshUser();
    } catch (err) {
      console.error('Bookmark failed, rollback:', err);
      setIsBookmarked(prevBookmarked);
    }
  };

  // Optimistic Follow with Rollback
  const handleFollowAuthor = async () => {
    if (!isAuthenticated) return onOpenAuth();
    if (!article) return;

    const prevFollowing = isFollowingAuthor;
    const prevFollowers = followersCount;

    setIsFollowingAuthor(!prevFollowing);
    setFollowersCount(prevFollowing ? Math.max(0, prevFollowers - 1) : prevFollowers + 1);

    try {
      const res = await api.toggleFollow(article.authorId);
      setIsFollowingAuthor(res.isFollowing);
      setFollowersCount(res.followersCount);
    } catch (err) {
      console.error('Follow failed, rollback:', err);
      setIsFollowingAuthor(prevFollowing);
      setFollowersCount(prevFollowers);
    }
  };

  // Comments handlers
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return onOpenAuth();
    if (!newComment.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      await api.addComment(articleId, newComment.trim());
      setNewComment('');
      // Reload comments
      const commRes = await api.getComments(articleId);
      setComments(commRes.comments);
      if (article) {
        setArticle({ ...article, commentsCount: article.commentsCount + 1 });
      }
    } catch (err) {
      console.error('Add comment failed:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!isAuthenticated) return onOpenAuth();
    if (!replyContent.trim()) return;

    try {
      await api.addComment(articleId, replyContent.trim(), parentId);
      setReplyContent('');
      setReplyingToId(null);
      const commRes = await api.getComments(articleId);
      setComments(commRes.comments);
      if (article) {
        setArticle({ ...article, commentsCount: article.commentsCount + 1 });
      }
    } catch (err) {
      console.error('Add reply failed:', err);
    }
  };

  // Toggle Like on Comment
  const handleToggleCommentLike = async (comm: Comment) => {
    if (!isAuthenticated) return onOpenAuth();

    // Optimistic toggle
    const prevIsLiked = !!comm.isLiked;
    const prevCount = comm.likesCount;
    const nextIsLiked = !prevIsLiked;
    const nextCount = prevIsLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === comm.id) {
          return { ...c, isLiked: nextIsLiked, likesCount: nextCount };
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === comm.id ? { ...r, isLiked: nextIsLiked, likesCount: nextCount } : r
            ),
          };
        }
        return c;
      })
    );

    try {
      const res = await api.toggleLikeComment(articleId, comm.id);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === comm.id) {
            return { ...c, isLiked: res.liked, likesCount: res.likesCount };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === comm.id ? { ...r, isLiked: res.liked, likesCount: res.likesCount } : r
              ),
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error('Comment like rollback:', err);
      // Rollback
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === comm.id) {
            return { ...c, isLiked: prevIsLiked, likesCount: prevCount };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === comm.id ? { ...r, isLiked: prevIsLiked, likesCount: prevCount } : r
              ),
            };
          }
          return c;
        })
      );
    }
  };

  // Edit Comment
  const handleStartEditComment = (comm: Comment) => {
    setEditingCommentId(comm.id);
    setEditCommentContent(comm.content);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    try {
      await api.updateComment(articleId, commentId, editCommentContent.trim());
      setEditingCommentId(null);
      const commRes = await api.getComments(articleId);
      setComments(commRes.comments);
    } catch (err) {
      console.error('Edit comment failed:', err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await api.deleteComment(articleId, commentId);
      const commRes = await api.getComments(articleId);
      setComments(commRes.comments);
      if (article && typeof res.commentsCount === 'number') {
        setArticle({ ...article, commentsCount: res.commentsCount });
      }
    } catch (err) {
      console.error('Delete comment failed:', err);
    } finally {
      setCommentToDeleteId(null);
    }
  };

  // Report Article
  const handleSendArticleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return onOpenAuth();
    try {
      await api.reportArticle(articleId, reportReason, reportDetails);
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportModal(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Report Comment
  const handleSendCommentReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return onOpenAuth();
    if (!reportingComment) return;

    try {
      await api.reportComment(articleId, reportingComment.id, commentReportReason, commentReportDetails);
      setCommentReportSuccess(true);
      setTimeout(() => {
        setCommentReportSuccess(false);
        setReportingComment(null);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteArticle = async () => {
    try {
      await api.deleteArticle(articleId);
      if (onArticleDeleted) onArticleDeleted();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDeleteArticle(false);
    }
  };

  const isAuthorOrAdmin = user && article && (user.id === article.authorId || user.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b0e1a] text-slate-100 min-h-screen sm:min-h-0 sm:rounded-2xl shadow-[0_0_40px_rgba(0,243,255,0.2)] sm:my-8 overflow-hidden flex flex-col border border-cyan-500/40 transition-all">
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-20 bg-[#0b0e1a]/95 backdrop-blur-md border-b border-cyan-500/30 px-4 py-3 flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,243,255,0.2)]">
              {article?.categoryName || 'Actualité'}
            </span>
            {article?.status === 'draft' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40">
                Brouillon
              </span>
            )}
            {article?.status === 'hidden' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/40">
                Masqué par la modération
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zen Reader Mode Toggle */}
            {article && (
              <button
                id="toggle-zen-mode-btn"
                onClick={() => setIsZenMode(!isZenMode)}
                className={`px-2.5 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 text-xs font-mono font-bold ${
                  isZenMode
                    ? 'bg-cyan-400 text-black shadow-[0_0_12px_#00f3ff]'
                    : 'text-cyan-300 hover:text-white hover:bg-cyan-500/20 border border-cyan-500/40'
                }`}
                title="Basculer en Mode Lecteur Terminal / Zen"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isZenMode ? 'Mode Normal' : 'Mode Zen'}</span>
              </button>
            )}

            {isAuthorOrAdmin && article && (
              <>
                {onOpenEditArticle && (
                  <button
                    id="edit-article-btn"
                    onClick={() => {
                      onOpenEditArticle(article);
                      onClose();
                    }}
                    className="p-2 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-full cursor-pointer transition-colors"
                    title="Modifier l'article"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button
                  id="delete-article-btn"
                  onClick={() => setConfirmDeleteArticle(true)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full cursor-pointer transition-colors"
                  title="Supprimer l'article"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              id="close-article-detail-modal"
              onClick={onClose}
              className="p-2 text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reading Progress Bar (always active, highly prominent in Zen mode) */}
        <div className="w-full bg-[#07080f] h-1 sticky top-[53px] z-30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-emerald-400 shadow-[0_0_10px_#00f3ff] transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Zen Mode Control Bar when active */}
        {isZenMode && article && (
          <div className="sticky top-[57px] z-25 bg-[#07080f]/95 backdrop-blur-md border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between gap-3 text-xs font-mono text-cyan-300">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#00ff9d]" />
              <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-400 hidden sm:inline">
                CONSOLE DE LECTURE ZEN v2.0
              </span>
              <span className="text-cyan-400/60">• Progression : {scrollProgress}%</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Font Size Selector */}
              <div className="flex items-center bg-[#0b0e1a] rounded-lg border border-cyan-500/30 p-0.5">
                <button
                  onClick={() => setZenFontSize('base')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    zenFontSize === 'base' ? 'bg-cyan-500/30 text-white font-bold' : 'text-cyan-400/60 hover:text-white'
                  }`}
                  title="Taille de texte standard"
                >
                  A-
                </button>
                <button
                  onClick={() => setZenFontSize('lg')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    zenFontSize === 'lg' ? 'bg-cyan-500/30 text-white font-bold' : 'text-cyan-400/60 hover:text-white'
                  }`}
                  title="Taille de texte grande"
                >
                  A
                </button>
                <button
                  onClick={() => setZenFontSize('xl')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    zenFontSize === 'xl' ? 'bg-cyan-500/30 text-white font-bold' : 'text-cyan-400/60 hover:text-white'
                  }`}
                  title="Taille de texte très grande"
                >
                  A+
                </button>
              </div>

              {/* Typography switcher */}
              <button
                onClick={() => setIsMonoFont(!isMonoFont)}
                className={`px-2 py-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
                  isMonoFont
                    ? 'border-cyan-400 bg-cyan-950 text-cyan-200 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
                    : 'border-cyan-500/30 text-cyan-400/70 hover:text-cyan-200'
                }`}
                title="Basculer entre police Monospace et Sans-Serif"
              >
                {isMonoFont ? 'Monospace' : 'Sans-Serif'}
              </button>
            </div>
          </div>
        )}

        {loading || !article ? (
          <div className="p-16 text-center text-cyan-400">
            <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
            <p className="font-mono text-sm">Chargement de l'article...</p>
          </div>
        ) : (
          <div
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto transition-all ${
              isZenMode ? 'p-5 sm:p-12 max-w-3xl mx-auto w-full' : 'p-4 sm:p-8'
            }`}
          >
            {/* Article Title */}
            <h1
              className={`font-black text-white leading-tight tracking-tight ${
                isZenMode ? 'text-3xl sm:text-5xl font-mono text-cyan-200' : 'text-2xl sm:text-4xl'
              }`}
            >
              {article.title}
            </h1>

            {/* Author Box */}
            <div className="mt-5 p-4 rounded-xl bg-[#101428] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4 transition-all shadow-[0_0_15px_rgba(0,243,255,0.06)]">
              <button
                onClick={() => onOpenProfile(article.authorId)}
                className="flex items-center gap-3 text-left group cursor-pointer"
              >
                <img
                  src={
                    article.authorAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={article.authorName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-cyan-500/40 group-hover:border-cyan-400 group-hover:shadow-[0_0_10px_rgba(0,243,255,0.5)] transition-all"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors">
                    <span>{article.mediaName || article.authorName}</span>
                    {article.isAuthorVerified && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" title="Compte officiel vérifié" />
                    )}
                  </div>
                  <div className="text-xs text-cyan-400/60 font-mono">
                    {article.mediaName && article.authorName !== article.mediaName && (
                      <span>Par {article.authorName} • </span>
                    )}
                    <span>{followersCount} abonné(s)</span>
                  </div>
                </div>
              </button>

              {user?.id !== article.authorId && (
                <button
                  id="follow-author-btn"
                  onClick={handleFollowAuthor}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold font-mono transition-all shadow-xs cursor-pointer ${
                    isFollowingAuthor
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_12px_rgba(0,243,255,0.4)]'
                  }`}
                >
                  {isFollowingAuthor ? (
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
              )}
            </div>

            {/* Date & Stats bar */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-stone-500 dark:text-stone-400 pb-4 border-b border-stone-100 dark:border-stone-800">
              <span>
                Publié le{' '}
                {new Date(article.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.max(1, Math.ceil((article.content || '').split(/\s+/).length / 200))} min de lecture
              </span>
              <span>•</span>
              <span className="flex items-center gap-1" title="Vues réelles">
                <Eye className="w-3.5 h-3.5" />
                {article.viewsCount} vues
              </span>
            </div>

            {/* Main Cover Image */}
            {article.coverImage && (
              <div className="mt-6 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 aspect-[16/9] shadow-sm">
                <img
                  src={getCoverUrl(article.coverImage, 1200, 675)}
                  alt={article.coverImageAlt || article.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Fact Check Report & Trust Indicator */}
            <FactCheckBadge factCheck={article.factCheck} />

            {/* Article Summary Quote */}
            {article.summary && (
              <div className="mt-4 p-4 rounded-xl bg-cyan-950/40 border-l-4 border-cyan-400 text-cyan-100 font-medium text-sm sm:text-base leading-relaxed italic shadow-[0_0_15px_rgba(0,243,255,0.06)]">
                « {article.summary} »
              </div>
            )}

            {/* Video Player if article has video */}
            {article.videoUrl && (
              <div className="mt-6">
                <div className="mb-2 flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm text-white">Reportage vidéo exclusif :</h3>
                </div>
                <VideoPlayer
                  src={article.videoUrl}
                  poster={article.videoThumbnail}
                  title={article.title}
                />
              </div>
            )}

            {/* Full Article Content */}
            <div
              className={`mt-6 leading-relaxed whitespace-pre-line ${
                isMonoFont ? 'font-mono' : 'font-sans'
              } ${
                zenFontSize === 'sm'
                  ? 'text-sm sm:text-base'
                  : zenFontSize === 'base'
                  ? 'text-base sm:text-lg'
                  : zenFontSize === 'xl'
                  ? 'text-xl sm:text-2xl leading-loose'
                  : 'text-lg sm:text-xl'
              } ${isZenMode ? 'text-slate-100' : 'text-slate-200'}`}
            >
              {article.content}
            </div>

            {/* Photo Gallery (Reportage) */}
            {((article.gallery && article.gallery.length > 0) || (article.images && article.images.length > 0)) && (
              <PhotoGallery
                items={article.gallery && article.gallery.length > 0 ? article.gallery : article.images}
                title="Galerie photographique du reportage"
              />
            )}

            {/* Interactive Opinion Poll & Barometer */}
            <ArticlePoll
              articleId={article.id}
              poll={article.poll}
              onOpenAuth={onOpenAuth}
            />

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 pt-4 border-t border-cyan-500/20">
                {article.tags.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (onSelectTag) {
                        onSelectTag(t);
                        onClose();
                      }
                    }}
                    className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[#101428] hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 transition-all cursor-pointer"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {/* Interaction Bar */}
            <div className="mt-8 p-3 rounded-2xl bg-[#101428] border border-cyan-500/30 flex items-center justify-between shadow-[0_0_20px_rgba(0,243,255,0.06)]">
              <div className="flex items-center gap-3">
                <button
                  id="modal-like-article-btn"
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all cursor-pointer font-mono ${
                    isLiked
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : 'bg-[#0b0e1a] text-slate-300 hover:text-white border border-cyan-500/25'
                  }`}
                >
                  <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{likesCount} likes</span>
                </button>

                <button
                  id="modal-bookmark-article-btn"
                  onClick={handleBookmark}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all cursor-pointer font-mono ${
                    isBookmarked
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,243,255,0.5)]'
                      : 'bg-[#0b0e1a] text-slate-300 hover:text-white border border-cyan-500/25'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                  <span className="hidden sm:inline">Enregistrer</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="modal-share-article-btn"
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#0b0e1a] text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer font-mono"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Partager</span>
                </button>

                <button
                  id="modal-report-article-btn"
                  onClick={() => (isAuthenticated ? setShowReportModal(true) : onOpenAuth())}
                  className="p-2 text-cyan-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
                  title="Signaler un problème sur cet article"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recommended Articles Section ("À lire aussi") */}
            {relatedArticles.length > 0 && (
              <div className="mt-8 pt-6 border-t border-cyan-500/20">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>À lire aussi</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                    Recommandations
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {relatedArticles.map((rel) => (
                    <article
                      key={rel.id}
                      onClick={() => {
                        if (onOpenArticle) {
                          onOpenArticle(rel);
                        }
                      }}
                      className="group cursor-pointer flex sm:flex-col gap-3 p-3 rounded-xl bg-[#101428] hover:bg-[#141a35] border border-cyan-500/25 hover:border-cyan-400/60 shadow-[0_0_12px_rgba(0,243,255,0.05)] hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all"
                    >
                      {rel.coverImage && (
                        <div className="w-20 h-20 sm:w-full sm:h-28 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-cyan-500/20">
                          <img
                            src={getCoverUrl(rel.coverImage, 400, 240)}
                            alt={rel.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-cyan-300 line-clamp-2 leading-snug transition-colors">
                          {rel.title}
                        </h4>
                        <div className="mt-2 text-[11px] text-cyan-400/60 font-mono flex items-center gap-2">
                          <span>{rel.categoryName || 'Actualité'}</span>
                          <span>•</span>
                          <span>
                            {new Date(rel.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Discussion / Comments Section */}
            <section className="mt-10 pt-6 border-t border-cyan-500/20">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-extrabold text-white">
                  Commentaires ({comments.length})
                </h2>
              </div>

              {/* Add Comment Input */}
              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="mb-8">
                  <div className="flex gap-3">
                    <img
                      src={
                        user?.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={user?.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-cyan-500/40 shrink-0"
                    />
                    <div className="flex-1">
                      <textarea
                        id="new-comment-textarea"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Exprimez votre avis citoyen dans le respect et la courtoisie (au moins 2 caractères)..."
                        className="w-full p-3 text-sm bg-[#101428] border border-cyan-500/30 rounded-xl text-slate-100 placeholder:text-cyan-400/40 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,243,255,0.3)] transition-all resize-none"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={!newComment.trim() || isSubmittingComment}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-40 text-black text-xs font-bold font-mono rounded-full transition-all cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.4)]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmittingComment ? 'Publication...' : 'Publier'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-8 p-4 rounded-xl bg-[#101428] border border-cyan-500/30 text-center transition-all">
                  <p className="text-xs sm:text-sm text-cyan-200">
                    Connectez-vous pour réagir et participer aux débats sur cet article.
                  </p>
                  <button
                    onClick={onOpenAuth}
                    className="mt-2.5 px-4 py-1.5 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black text-xs font-bold font-mono rounded-full cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.4)]"
                  >
                    Se connecter / Créer un compte
                  </button>
                </div>
              )}

              {/* Comments Thread List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-cyan-400/50 italic font-mono">Soyez le premier à commenter cet article !</p>
                ) : (
                  comments.map((comm) => {
                    const canModify = user && (user.id === comm.userId || user.role === 'admin');
                    const canDelete =
                      canModify || (article && user && user.id === article.authorId);

                    return (
                      <div
                        key={comm.id}
                        className="p-4 rounded-xl bg-[#101428]/80 border border-cyan-500/25 hover:border-cyan-500/40 transition-all shadow-[0_0_12px_rgba(0,243,255,0.03)]"
                      >
                        {/* Comment author info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                comm.userAvatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={comm.userName}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-cyan-500/30"
                            />
                            <span className="font-bold text-xs text-white">{comm.userName}</span>
                            {comm.isUserVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                            <span className="text-[11px] text-cyan-400/50 font-mono">
                              {new Date(comm.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {comm.isEdited && (
                              <span className="text-[10px] text-cyan-400/40 italic font-mono">
                                (modifié)
                              </span>
                            )}
                          </div>

                          {/* Options / Moderation for comment */}
                          <div className="flex items-center gap-1">
                            {canModify && editingCommentId !== comm.id && (
                              <button
                                onClick={() => handleStartEditComment(comm)}
                                className="p-1 text-cyan-400/60 hover:text-cyan-300 rounded-md cursor-pointer"
                                title="Modifier mon commentaire"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setCommentToDeleteId(comm.id)}
                                className="p-1 text-cyan-400/60 hover:text-red-400 rounded-md cursor-pointer"
                                title="Supprimer le commentaire"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {user && user.id !== comm.userId && (
                              <button
                                onClick={() => setReportingComment(comm)}
                                className="p-1 text-cyan-400/60 hover:text-red-400 rounded-md cursor-pointer"
                                title="Signaler ce commentaire"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Comment text or Edit mode */}
                        {editingCommentId === comm.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              rows={2}
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              className="w-full p-2.5 text-xs bg-[#0b0e1a] border border-cyan-500/40 text-slate-100 rounded-lg focus:outline-none focus:border-cyan-400"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 text-xs text-cyan-400/70 hover:bg-cyan-500/20 rounded-md cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => handleSaveEditComment(comm.id)}
                                className="px-3 py-1 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 rounded-md cursor-pointer shadow-[0_0_8px_rgba(0,243,255,0.4)]"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                            {comm.content}
                          </p>
                        )}

                        {/* Comment action footer: Likes + Reply */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-cyan-400/60 font-mono">
                          {/* Like on comment */}
                          <button
                            onClick={() => handleToggleCommentLike(comm)}
                            className={`flex items-center gap-1 font-medium cursor-pointer transition-colors ${
                              comm.isLiked ? 'text-red-400 font-bold' : 'hover:text-red-400'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${comm.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                            <span>{comm.likesCount || 0}</span>
                          </button>

                          {/* Reply button */}
                          <button
                            onClick={() => {
                              if (!isAuthenticated) return onOpenAuth();
                              setReplyingToId(replyingToId === comm.id ? null : comm.id);
                            }}
                            className="flex items-center gap-1 font-semibold hover:text-cyan-300 cursor-pointer"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Répondre</span>
                          </button>
                        </div>

                        {/* Reply form */}
                        {replyingToId === comm.id && (
                          <div className="mt-3 pt-3 border-t border-cyan-500/20">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={`Répondre à ${comm.userName}...`}
                                className="flex-1 px-3 py-1.5 text-xs bg-[#0b0e1a] border border-cyan-500/40 text-slate-100 rounded-lg focus:outline-none focus:border-cyan-400"
                              />
                              <button
                                onClick={() => handleAddReply(comm.id)}
                                className="px-3 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-bold font-mono rounded-lg cursor-pointer shadow-[0_0_8px_rgba(0,243,255,0.4)]"
                              >
                                Envoyer
                              </button>
                              <button
                                onClick={() => setReplyingToId(null)}
                                className="px-2 py-1.5 text-cyan-400/60 hover:text-cyan-300 text-xs cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Nested Replies */}
                        {comm.replies && comm.replies.length > 0 && (
                          <div className="mt-3 pl-4 sm:pl-6 border-l-2 border-cyan-500/30 space-y-3">
                            {comm.replies.map((reply) => {
                              const canModifyReply = user && (user.id === reply.userId || user.role === 'admin');
                              const canDeleteReply =
                                canModifyReply || (article && user && user.id === article.authorId);

                              return (
                                <div key={reply.id} className="pt-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={
                                          reply.userAvatar ||
                                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                                        }
                                        alt={reply.userName}
                                        referrerPolicy="no-referrer"
                                        className="w-6 h-6 rounded-full object-cover border border-cyan-500/30"
                                      />
                                      <span className="font-bold text-xs text-white">{reply.userName}</span>
                                      {reply.isUserVerified && (
                                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                      )}
                                      <span className="text-[10px] text-cyan-400/50 font-mono">
                                        {new Date(reply.createdAt).toLocaleDateString('fr-FR', {
                                          day: 'numeric',
                                          month: 'short',
                                        })}
                                      </span>
                                      {reply.isEdited && (
                                        <span className="text-[10px] text-cyan-400/40 italic font-mono">
                                          (modifié)
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {canDeleteReply && (
                                        <button
                                          onClick={() => setCommentToDeleteId(reply.id)}
                                          className="p-1 text-cyan-400/60 hover:text-red-400 rounded-md cursor-pointer"
                                          title="Supprimer la réponse"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      {user && user.id !== reply.userId && (
                                        <button
                                          onClick={() => setReportingComment(reply)}
                                          className="p-1 text-cyan-400/60 hover:text-red-400 rounded-md cursor-pointer"
                                          title="Signaler la réponse"
                                        >
                                          <Flag className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                                    {reply.content}
                                  </p>

                                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-cyan-400/60 font-mono">
                                    <button
                                      onClick={() => handleToggleCommentLike(reply)}
                                      className={`flex items-center gap-1 cursor-pointer ${
                                        reply.isLiked ? 'text-red-400 font-bold' : 'hover:text-red-400'
                                      }`}
                                    >
                                      <Heart className={`w-3 h-3 ${reply.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                      <span>{reply.likesCount || 0}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && article && (
          <ShareModal
            article={article}
            onClose={() => setShowShareModal(false)}
          />
        )}

        {/* Report Article Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="bg-[#0b0e1a] border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-[0_0_30px_rgba(0,243,255,0.2)] animate-in zoom-in-95 transition-all text-slate-100">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-400" />
                <span>Signaler cet article</span>
              </h3>
              <p className="mt-1 text-xs text-cyan-400/60">
                Aidez l’équipe de modération à préserver la qualité et la véracité de l’information.
              </p>

              {reportSuccess ? (
                <div className="mt-6 p-4 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 rounded-xl text-center font-medium text-sm">
                  Merci ! Votre signalement a été transmis avec succès.
                </div>
              ) : (
                <form onSubmit={handleSendArticleReport} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold font-mono text-cyan-300 mb-1">
                      Motif du signalement
                    </label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#101428] border border-cyan-500/40 text-slate-100 rounded-lg focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Désinformation / Fausses nouvelles">Désinformation / Fausses nouvelles</option>
                      <option value="Discours de haine ou discrimination">Discours de haine ou discrimination</option>
                      <option value="Diffamation / Atteinte à l’honneur">Diffamation / Atteinte à l’honneur</option>
                      <option value="Plagiat ou violation de droits">Plagiat ou violation de droits</option>
                      <option value="Contenu à caractère violent ou choquant">Contenu à caractère violent ou choquant</option>
                      <option value="Autre motif">Autre motif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold font-mono text-cyan-300 mb-1">
                      Précisions complémentaires (facultatif)
                    </label>
                    <textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Expliquez en quelques mots ce qui pose problème..."
                      className="w-full p-2.5 text-xs bg-[#101428] border border-cyan-500/40 text-slate-100 placeholder:text-cyan-400/40 rounded-lg focus:outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold font-mono text-black bg-red-500 hover:bg-red-400 rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.5)] cursor-pointer transition-all"
                    >
                      Confirmer le signalement
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Report Comment Modal */}
        {reportingComment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="bg-[#0b0e1a] border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-[0_0_30px_rgba(0,243,255,0.2)] animate-in zoom-in-95 transition-all text-slate-100">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-400" />
                <span>Signaler un commentaire</span>
              </h3>
              <p className="mt-1 text-xs text-cyan-400/60 font-mono">
                Commentaire de {reportingComment.userName}: "{reportingComment.content.substring(0, 50)}..."
              </p>

              {commentReportSuccess ? (
                <div className="mt-6 p-4 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 rounded-xl text-center font-medium text-sm">
                  Merci ! Le commentaire a été transmis à l’équipe de modération.
                </div>
              ) : (
                <form onSubmit={handleSendCommentReport} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold font-mono text-cyan-300 mb-1">
                      Motif du signalement
                    </label>
                    <select
                      value={commentReportReason}
                      onChange={(e) => setCommentReportReason(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#101428] border border-cyan-500/40 text-slate-100 rounded-lg focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Contenu haineux ou insultant">Contenu haineux ou insultant</option>
                      <option value="Harcèlement ou intimidation">Harcèlement ou intimidation</option>
                      <option value="Spam ou publicité indésirable">Spam ou publicité indésirable</option>
                      <option value="Fausses informations évidentes">Fausses informations évidentes</option>
                      <option value="Autre motif">Autre motif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold font-mono text-cyan-300 mb-1">
                      Détails (facultatif)
                    </label>
                    <textarea
                      rows={3}
                      value={commentReportDetails}
                      onChange={(e) => setCommentReportDetails(e.target.value)}
                      placeholder="Pourquoi ce commentaire enfreint-il les règles de la communauté ?"
                      className="w-full p-2.5 text-xs bg-[#101428] border border-cyan-500/40 text-slate-100 placeholder:text-cyan-400/40 rounded-lg focus:outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReportingComment(null)}
                      className="px-4 py-2 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold font-mono text-black bg-red-500 hover:bg-red-400 rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.5)] cursor-pointer transition-all"
                    >
                      Signaler ce commentaire
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
        {/* Confirm Dialogs */}
        <AdminConfirmDialog
          isOpen={confirmDeleteArticle}
          title="Supprimer cet article"
          message="Êtes-vous certain de vouloir supprimer cet article ? Cette action est irréversible."
          confirmLabel="Supprimer définitivement"
          cancelLabel="Annuler"
          isDestructive={true}
          onConfirm={handleDeleteArticle}
          onCancel={() => setConfirmDeleteArticle(false)}
        />

        <AdminConfirmDialog
          isOpen={!!commentToDeleteId}
          title="Supprimer ce commentaire"
          message="Voulez-vous vraiment supprimer ce commentaire ?"
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          isDestructive={true}
          onConfirm={() => {
            if (commentToDeleteId) handleDeleteComment(commentToDeleteId);
          }}
          onCancel={() => setCommentToDeleteId(null)}
        />
      </div>
    </div>
  );
};
