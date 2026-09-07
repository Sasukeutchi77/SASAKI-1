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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShareModal } from './ShareModal';
import { getCoverUrl } from '../services/cloudinary';
import { PhotoGallery } from './media/PhotoGallery';
import { VideoPlayer } from './media/VideoPlayer';

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
    if (!window.confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;
    try {
      const res = await api.deleteComment(articleId, commentId);
      const commRes = await api.getComments(articleId);
      setComments(commRes.comments);
      if (article && typeof res.commentsCount === 'number') {
        setArticle({ ...article, commentsCount: res.commentsCount });
      }
    } catch (err) {
      console.error('Delete comment failed:', err);
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
    if (!window.confirm('Êtes-vous certain de vouloir supprimer cet article ? Cette action est irréversible.')) return;
    try {
      await api.deleteArticle(articleId);
      if (onArticleDeleted) onArticleDeleted();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const isAuthorOrAdmin = user && article && (user.id === article.authorId || user.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl sm:my-8 overflow-hidden flex flex-col border border-stone-200/80 dark:border-stone-800 transition-colors">
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
              {article?.categoryName || 'Actualité'}
            </span>
            {article?.status === 'draft' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Brouillon
              </span>
            )}
            {article?.status === 'hidden' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300">
                Masqué par la modération
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAuthorOrAdmin && article && (
              <>
                {onOpenEditArticle && (
                  <button
                    id="edit-article-btn"
                    onClick={() => {
                      onOpenEditArticle(article);
                      onClose();
                    }}
                    className="p-2 text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full cursor-pointer transition-colors"
                    title="Modifier l'article"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button
                  id="delete-article-btn"
                  onClick={handleDeleteArticle}
                  className="p-2 text-stone-600 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full cursor-pointer transition-colors"
                  title="Supprimer l'article"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              id="close-article-detail-modal"
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading || !article ? (
          <div className="p-16 text-center text-stone-500 dark:text-stone-400">
            <div className="w-8 h-8 border-3 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-medium text-sm">Chargement de l'article...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-8 flex-1 overflow-y-auto">
            {/* Article Title */}
            <h1 className="font-serif text-2xl sm:text-4xl font-black text-stone-900 dark:text-stone-50 leading-tight tracking-tight">
              {article.title}
            </h1>

            {/* Author Box */}
            <div className="mt-5 p-4 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4 transition-colors">
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
                  className="w-12 h-12 rounded-full object-cover border border-stone-200 dark:border-stone-700 group-hover:ring-2 group-hover:ring-emerald-600 transition-all"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    <span>{article.mediaName || article.authorName}</span>
                    {article.isAuthorVerified && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" title="Compte officiel vérifié" />
                    )}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isFollowingAuthor
                      ? 'bg-stone-200 dark:bg-stone-750 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
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

            {/* Article Summary Quote */}
            {article.summary && (
              <div className="mt-6 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border-l-4 border-amber-600 dark:border-amber-500 text-stone-800 dark:text-stone-200 font-medium text-sm sm:text-base leading-relaxed italic transition-colors">
                « {article.summary} »
              </div>
            )}

            {/* Video Player if article has video */}
            {article.videoUrl && (
              <div className="mt-6">
                <div className="mb-2 flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">Reportage vidéo exclusif :</h3>
                </div>
                <VideoPlayer
                  src={article.videoUrl}
                  poster={article.videoThumbnail}
                  title={article.title}
                />
              </div>
            )}

            {/* Full Article Content */}
            <div className="mt-6 text-stone-800 dark:text-stone-200 text-base sm:text-lg leading-relaxed whitespace-pre-line font-serif transition-colors">
              {article.content}
            </div>

            {/* Photo Gallery (Reportage) */}
            {((article.gallery && article.gallery.length > 0) || (article.images && article.images.length > 0)) && (
              <PhotoGallery
                items={article.gallery && article.gallery.length > 0 ? article.gallery : article.images}
                title="Galerie photographique du reportage"
              />
            )}

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
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
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {/* Interaction Bar */}
            <div className="mt-8 p-3 rounded-2xl bg-stone-100 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <button
                  id="modal-like-article-btn"
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all cursor-pointer ${
                    isLiked
                      ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750'
                  }`}
                >
                  <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''}`} />
                  <span>{likesCount} likes</span>
                </button>

                <button
                  id="modal-bookmark-article-btn"
                  onClick={handleBookmark}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all cursor-pointer ${
                    isBookmarked
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-900'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-emerald-700 dark:fill-emerald-400' : ''}`} />
                  <span className="hidden sm:inline">Enregistrer</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="modal-share-article-btn"
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Partager</span>
                </button>

                <button
                  id="modal-report-article-btn"
                  onClick={() => (isAuthenticated ? setShowReportModal(true) : onOpenAuth())}
                  className="p-2 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
                  title="Signaler un problème sur cet article"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recommended Articles Section ("À lire aussi") */}
            {relatedArticles.length > 0 && (
              <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                  <span>À lire aussi</span>
                  <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
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
                      className="group cursor-pointer flex sm:flex-col gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-850 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 border border-stone-200/80 dark:border-stone-800 transition-all"
                    >
                      {rel.coverImage && (
                        <div className="w-20 h-20 sm:w-full sm:h-28 rounded-lg overflow-hidden shrink-0 bg-stone-200 dark:bg-stone-800">
                          <img
                            src={getCoverUrl(rel.coverImage, 400, 240)}
                            alt={rel.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-2 leading-snug">
                          {rel.title}
                        </h4>
                        <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2">
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
            <section className="mt-10 pt-6 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
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
                      className="w-9 h-9 rounded-full object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                    />
                    <div className="flex-1">
                      <textarea
                        id="new-comment-textarea"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Exprimez votre avis citoyen dans le respect et la courtoisie (au moins 2 caractères)..."
                        className="w-full p-3 text-sm bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-800 transition-all resize-none"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={!newComment.trim() || isSubmittingComment}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-full transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmittingComment ? 'Publication...' : 'Publier'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-8 p-4 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-center transition-colors">
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                    Connectez-vous pour réagir et participer aux débats sur cet article.
                  </p>
                  <button
                    onClick={onOpenAuth}
                    className="mt-2.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full cursor-pointer"
                  >
                    Se connecter / Créer un compte
                  </button>
                </div>
              )}

              {/* Comments Thread List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-stone-400 dark:text-stone-500 italic">Soyez le premier à commenter cet article !</p>
                ) : (
                  comments.map((comm) => {
                    const canModify = user && (user.id === comm.userId || user.role === 'admin');
                    const canDelete =
                      canModify || (article && user && user.id === article.authorId);

                    return (
                      <div
                        key={comm.id}
                        className="p-4 rounded-xl bg-stone-50/80 dark:bg-stone-850/80 border border-stone-200/60 dark:border-stone-800 transition-colors"
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
                              className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-stone-700"
                            />
                            <span className="font-bold text-xs text-stone-900 dark:text-stone-100">{comm.userName}</span>
                            {comm.isUserVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            )}
                            <span className="text-[11px] text-stone-400 dark:text-stone-500">
                              {new Date(comm.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {comm.isEdited && (
                              <span className="text-[10px] text-stone-400 dark:text-stone-500 italic font-medium">
                                (modifié)
                              </span>
                            )}
                          </div>

                          {/* Options / Moderation for comment */}
                          <div className="flex items-center gap-1">
                            {canModify && editingCommentId !== comm.id && (
                              <button
                                onClick={() => handleStartEditComment(comm)}
                                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md cursor-pointer"
                                title="Modifier mon commentaire"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteComment(comm.id)}
                                className="p-1 text-stone-400 hover:text-red-600 dark:hover:text-red-400 rounded-md cursor-pointer"
                                title="Supprimer le commentaire"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {user && user.id !== comm.userId && (
                              <button
                                onClick={() => setReportingComment(comm)}
                                className="p-1 text-stone-400 hover:text-red-600 dark:hover:text-red-400 rounded-md cursor-pointer"
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
                              className="w-full p-2.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => handleSaveEditComment(comm.id)}
                                className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md cursor-pointer"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">
                            {comm.content}
                          </p>
                        )}

                        {/* Comment action footer: Likes + Reply */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
                          {/* Like on comment */}
                          <button
                            onClick={() => handleToggleCommentLike(comm)}
                            className={`flex items-center gap-1 font-medium cursor-pointer transition-colors ${
                              comm.isLiked ? 'text-red-600 dark:text-red-400 font-bold' : 'hover:text-red-600 dark:hover:text-red-400'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${comm.isLiked ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''}`} />
                            <span>{comm.likesCount || 0}</span>
                          </button>

                          {/* Reply button */}
                          <button
                            onClick={() => {
                              if (!isAuthenticated) return onOpenAuth();
                              setReplyingToId(replyingToId === comm.id ? null : comm.id);
                            }}
                            className="flex items-center gap-1 font-semibold hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Répondre</span>
                          </button>
                        </div>

                        {/* Reply form */}
                        {replyingToId === comm.id && (
                          <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={`Répondre à ${comm.userName}...`}
                                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600"
                              />
                              <button
                                onClick={() => handleAddReply(comm.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Envoyer
                              </button>
                              <button
                                onClick={() => setReplyingToId(null)}
                                className="px-2 py-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-xs cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Nested Replies */}
                        {comm.replies && comm.replies.length > 0 && (
                          <div className="mt-3 pl-4 sm:pl-6 border-l-2 border-stone-200 dark:border-stone-700 space-y-3">
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
                                        className="w-6 h-6 rounded-full object-cover border border-stone-200 dark:border-stone-700"
                                      />
                                      <span className="font-bold text-xs text-stone-900 dark:text-stone-100">{reply.userName}</span>
                                      {reply.isUserVerified && (
                                        <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                      )}
                                      <span className="text-[10px] text-stone-400 dark:text-stone-500">
                                        {new Date(reply.createdAt).toLocaleDateString('fr-FR', {
                                          day: 'numeric',
                                          month: 'short',
                                        })}
                                      </span>
                                      {reply.isEdited && (
                                        <span className="text-[10px] text-stone-400 dark:text-stone-500 italic">
                                          (modifié)
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {canDeleteReply && (
                                        <button
                                          onClick={() => handleDeleteComment(reply.id)}
                                          className="p-1 text-stone-400 hover:text-red-600 dark:hover:text-red-400 rounded-md cursor-pointer"
                                          title="Supprimer la réponse"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      {user && user.id !== reply.userId && (
                                        <button
                                          onClick={() => setReportingComment(reply)}
                                          className="p-1 text-stone-400 hover:text-red-600 dark:hover:text-red-400 rounded-md cursor-pointer"
                                          title="Signaler la réponse"
                                        >
                                          <Flag className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <p className="mt-1 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                                    {reply.content}
                                  </p>

                                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                                    <button
                                      onClick={() => handleToggleCommentLike(reply)}
                                      className={`flex items-center gap-1 cursor-pointer ${
                                        reply.isLiked ? 'text-red-600 dark:text-red-400 font-bold' : 'hover:text-red-600 dark:hover:text-red-400'
                                      }`}
                                    >
                                      <Heart className={`w-3 h-3 ${reply.isLiked ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''}`} />
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
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 transition-colors">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span>Signaler cet article</span>
              </h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Aidez l’équipe de modération à préserver la qualité et la véracité de l’information.
              </p>

              {reportSuccess ? (
                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-center font-medium text-sm">
                  Merci ! Votre signalement a été transmis avec succès.
                </div>
              ) : (
                <form onSubmit={handleSendArticleReport} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Motif du signalement
                    </label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600"
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
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Précisions complémentaires (facultatif)
                    </label>
                    <textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Expliquez en quelques mots ce qui pose problème..."
                      className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg cursor-pointer transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs cursor-pointer transition-colors"
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
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 transition-colors">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span>Signaler un commentaire</span>
              </h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Commentaire de {reportingComment.userName}: "{reportingComment.content.substring(0, 50)}..."
              </p>

              {commentReportSuccess ? (
                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-center font-medium text-sm">
                  Merci ! Le commentaire a été transmis à l’équipe de modération.
                </div>
              ) : (
                <form onSubmit={handleSendCommentReport} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Motif du signalement
                    </label>
                    <select
                      value={commentReportReason}
                      onChange={(e) => setCommentReportReason(e.target.value)}
                      className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="Contenu haineux ou insultant">Contenu haineux ou insultant</option>
                      <option value="Harcèlement ou intimidation">Harcèlement ou intimidation</option>
                      <option value="Spam ou publicité indésirable">Spam ou publicité indésirable</option>
                      <option value="Fausses informations évidentes">Fausses informations évidentes</option>
                      <option value="Autre motif">Autre motif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Détails (facultatif)
                    </label>
                    <textarea
                      rows={3}
                      value={commentReportDetails}
                      onChange={(e) => setCommentReportDetails(e.target.value)}
                      placeholder="Pourquoi ce commentaire enfreint-il les règles de la communauté ?"
                      className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReportingComment(null)}
                      className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg cursor-pointer transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs cursor-pointer transition-colors"
                    >
                      Signaler ce commentaire
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
