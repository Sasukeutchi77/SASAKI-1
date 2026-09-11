import React, { useState, useEffect, useRef } from 'react';
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
  SlidersHorizontal,
  ArrowUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShareModal } from './ShareModal';
import { getCoverUrl } from '../services/cloudinary';
import { PhotoGallery } from './media/PhotoGallery';
import { VideoPlayer } from './media/VideoPlayer';
import { AdminConfirmDialog } from './admin/AdminConfirmDialog';
import { ArticlePoll } from './ArticlePoll';
import { VerifiedBadge } from './VerifiedBadge';
import { sfx } from '../services/soundEffects';
import { realtime } from '../services/realtime';

export const ZEN_THEMES = {
  cyan: {
    id: 'cyan',
    name: 'Cyber Cyan',
    container: 'bg-[#02050f] text-cyan-100',
    topBar: 'bg-[#050b1a]/95 border-cyan-500/40 text-cyan-300',
    title: 'text-cyan-200',
    accent: 'border-cyan-500/40 text-cyan-400',
    leadBox: 'bg-cyan-950/40 border-cyan-400 text-cyan-100',
    proseText: 'text-cyan-100/90',
    meta: 'text-cyan-400/70',
    activeBtn: 'bg-cyan-400 text-black shadow-[0_0_10px_#00f3ff] font-bold',
    inactiveBtn: 'bg-[#070d20] text-cyan-300/70 border border-cyan-500/30 hover:text-cyan-200',
    progress: 'from-blue-600 via-cyan-400 to-blue-400 shadow-[0_0_12px_#00f3ff]',
  },
  amber: {
    id: 'amber',
    name: 'Ambre CRT',
    container: 'bg-[#080501] text-amber-100',
    topBar: 'bg-[#140b02]/95 border-amber-500/40 text-amber-300',
    title: 'text-amber-200',
    accent: 'border-amber-500/40 text-amber-400',
    leadBox: 'bg-amber-950/40 border-amber-400 text-amber-100',
    proseText: 'text-amber-100/90',
    meta: 'text-amber-400/70',
    activeBtn: 'bg-amber-400 text-black shadow-[0_0_10px_#f59e0b] font-bold',
    inactiveBtn: 'bg-[#180e03] text-amber-300/70 border border-amber-500/30 hover:text-amber-200',
    progress: 'from-amber-400 via-orange-500 to-yellow-300 shadow-[0_0_12px_#f59e0b]',
  },
  matrix: {
    id: 'matrix',
    name: 'Matrice Vert',
    container: 'bg-[#010904] text-emerald-100',
    topBar: 'bg-[#021408]/95 border-emerald-500/40 text-emerald-300',
    title: 'text-emerald-200',
    accent: 'border-emerald-500/40 text-emerald-400',
    leadBox: 'bg-emerald-950/40 border-emerald-400 text-emerald-100',
    proseText: 'text-emerald-100/90',
    meta: 'text-emerald-400/70',
    activeBtn: 'bg-emerald-400 text-black shadow-[0_0_10px_#10b981] font-bold',
    inactiveBtn: 'bg-[#031c0b] text-emerald-300/70 border border-emerald-500/30 hover:text-emerald-200',
    progress: 'from-emerald-400 via-teal-400 to-lime-300 shadow-[0_0_12px_#10b981]',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Noir & Blanc',
    container: 'bg-[#000000] text-neutral-100',
    topBar: 'bg-[#0d0d0d]/95 border-neutral-700 text-neutral-200',
    title: 'text-white',
    accent: 'border-neutral-700 text-neutral-300',
    leadBox: 'bg-neutral-900 border-neutral-600 text-neutral-100',
    proseText: 'text-neutral-100',
    meta: 'text-neutral-400',
    activeBtn: 'bg-white text-black shadow-[0_0_10px_#ffffff] font-bold',
    inactiveBtn: 'bg-[#141414] text-neutral-300 border border-neutral-700 hover:text-white',
    progress: 'from-white via-neutral-300 to-neutral-500 shadow-[0_0_12px_#ffffff]',
  },
};

export const ZEN_FONT_CLASSES: Record<'sm' | 'base' | 'lg' | 'xl' | '2xl', string> = {
  sm: 'text-sm sm:text-base leading-relaxed',
  base: 'text-base sm:text-lg leading-relaxed',
  lg: 'text-lg sm:text-xl leading-loose',
  xl: 'text-xl sm:text-2xl leading-loose',
  '2xl': 'text-2xl sm:text-3xl leading-loose',
};

interface ArticleDetailModalProps {
  articleId: string;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenAuth: () => void;
  onArticleDeleted?: () => void;
  onOpenEditArticle?: (article: Article) => void;
  onSelectTag?: (tag: string) => void;
  onOpenArticle?: (article: Article) => void;
  onOpenTrustSystem?: () => void;
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
  onOpenTrustSystem,
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

  // Zen Reader Mode states (Console Rétro-Futuriste)
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [zenFontSize, setZenFontSize] = useState<'sm' | 'base' | 'lg' | 'xl' | '2xl'>('lg');
  const [zenTheme, setZenTheme] = useState<'cyan' | 'amber' | 'matrix' | 'monochrome'>('cyan');
  const [isMonoFont, setIsMonoFont] = useState<boolean>(true);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Dedicated scroll refs for normal and Zen modes
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const zenScrollRef = useRef<HTMLDivElement | null>(null);

  // Lock background body scroll while reading article modal on mobile & desktop
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Reset scroll to the very top whenever a new article is opened
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
    if (zenScrollRef.current) {
      zenScrollRef.current.scrollTop = 0;
    }
    setScrollProgress(0);
    setShowScrollTop(false);
  }, [articleId]);

  const handleToggleZenMode = () => {
    const next = !isZenMode;
    setIsZenMode(next);
    if (next) {
      setIsMonoFont(true);
      sfx.playTerminalBeep();
    } else {
      sfx.playMechanicalClick();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const total = target.scrollHeight - target.clientHeight;
    if (total > 0) {
      setScrollProgress(Math.min(100, Math.max(0, Math.round((target.scrollTop / total) * 100))));
    }
    setShowScrollTop(target.scrollTop > 300);
  };

  const scrollToTop = () => {
    if (isZenMode && zenScrollRef.current) {
      zenScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToComments = () => {
    const el = document.getElementById('article-comments-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZenMode) {
          sfx.playMechanicalClick();
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

  // Real-time synchronization for comments, likes, views and article edits
  useEffect(() => {
    if (!articleId) return;

    // 1. Instant comment posting by any user (handles both root comments & replies)
    const unsubCommentCreated = realtime.on('comment:created', ({ articleId: aId, comment, commentsCount }: { articleId: string; comment: Comment; commentsCount?: number }) => {
      if (aId === articleId && comment) {
        setComments((prev) => {
          // Prevent duplicates
          const exists = prev.some((c) => c.id === comment.id || (c.replies && c.replies.some((r) => r.id === comment.id)));
          if (exists) return prev;

          // If it's a nested reply:
          if (comment.parentId) {
            return prev.map((c) => {
              if (c.id === comment.parentId) {
                const currentReplies = c.replies || [];
                if (currentReplies.some((r) => r.id === comment.id)) return c;
                return {
                  ...c,
                  replies: [...currentReplies, comment],
                };
              }
              return c;
            });
          }

          // If it's a top-level root comment:
          return [comment, ...prev];
        });
        setArticle((prev) => (prev ? { ...prev, commentsCount: commentsCount !== undefined ? commentsCount : prev.commentsCount + 1 } : prev));
        sfx.playMechanicalClick();
      }
    });

    // 2. Real-time comment updates (root and replies)
    const unsubCommentUpdated = realtime.on('comment:updated', ({ articleId: aId, comment }: { articleId: string; comment: Comment }) => {
      if (aId === articleId && comment) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === comment.id) {
              return { ...c, ...comment, replies: c.replies };
            }
            if (c.replies && c.replies.some((r) => r.id === comment.id)) {
              return {
                ...c,
                replies: c.replies.map((r) => (r.id === comment.id ? { ...r, ...comment } : r)),
              };
            }
            return c;
          })
        );
      }
    });

    // 3. Real-time comment deletion (root and replies)
    const unsubCommentDeleted = realtime.on('comment:deleted', ({ articleId: aId, commentId, commentsCount }: { articleId: string; commentId: string; commentsCount?: number }) => {
      if (aId === articleId && commentId) {
        setComments((prev) =>
          prev
            .filter((c) => c.id !== commentId && c.parentId !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies ? c.replies.filter((r) => r.id !== commentId) : [],
            }))
        );
        if (commentsCount !== undefined) {
          setArticle((prev) => (prev ? { ...prev, commentsCount } : prev));
        }
      }
    });

    // 4. Real-time comment like (root and replies)
    const unsubCommentLiked = realtime.on('comment:liked', ({ articleId: aId, commentId, likesCount: cLikes }: { articleId: string; commentId: string; likesCount: number }) => {
      if (aId === articleId && commentId) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) {
              return { ...c, likesCount: cLikes };
            }
            if (c.replies && c.replies.some((r) => r.id === commentId)) {
              return {
                ...c,
                replies: c.replies.map((r) => (r.id === commentId ? { ...r, likesCount: cLikes } : r)),
              };
            }
            return c;
          })
        );
      }
    });

    // 5. Real-time article likes
    const unsubArticleLiked = realtime.on('article:liked', ({ articleId: aId, likesCount: aLikes }: { articleId: string; likesCount: number }) => {
      if (aId === articleId) {
        setLikesCount(aLikes);
        setArticle((prev) => (prev ? { ...prev, likesCount: aLikes } : prev));
      }
    });

    // 6. Real-time article views
    const unsubArticleViewed = realtime.on('article:viewed', ({ articleId: aId, viewsCount: aViews }: { articleId: string; viewsCount: number }) => {
      if (aId === articleId) {
        setArticle((prev) => (prev ? { ...prev, viewsCount: aViews } : prev));
      }
    });

    // 7. Real-time article edit (title, content, tags, media)
    const unsubArticleUpdated = realtime.on('article:updated', (updatedArt: Article) => {
      if (updatedArt && updatedArt.id === articleId) {
        setArticle((prev) => (prev ? { ...prev, ...updatedArt } : updatedArt));
      }
    });

    return () => {
      unsubCommentCreated();
      unsubCommentUpdated();
      unsubCommentDeleted();
      unsubCommentLiked();
      unsubArticleLiked();
      unsubArticleViewed();
      unsubArticleUpdated();
    };
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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-hidden">
      <div className="relative w-full max-w-4xl bg-[#040817] text-slate-100 h-full sm:h-[94vh] sm:max-h-[94vh] sm:rounded-2xl shadow-[0_0_50px_rgba(29,104,255,0.3)] overflow-hidden flex flex-col border-0 sm:border border-blue-500/30 transition-all sm:my-auto">
        {/* Top Sticky Header */}
        <div className="shrink-0 z-20 bg-[#040817]/95 backdrop-blur-md border-b border-blue-500/20 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-400/40 shadow-[0_0_8px_rgba(0,210,255,0.2)]">
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
                onClick={handleToggleZenMode}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 text-xs font-mono font-bold ${
                  isZenMode
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(29,104,255,0.6)]'
                    : 'text-cyan-300 hover:text-white hover:bg-blue-600/20 border border-blue-500/40'
                }`}
                title="Basculer en Mode Lecteur Terminal / Zen [ESC pour quitter]"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-300" />
                <span className="hidden sm:inline">{isZenMode ? 'Quitter Console Zen' : 'Mode Lecteur Zen'}</span>
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
                    className="p-2 text-cyan-400 hover:text-cyan-200 hover:bg-blue-600/20 rounded-full cursor-pointer transition-colors"
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
              className="p-2 text-blue-300/70 hover:text-cyan-200 hover:bg-blue-600/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reading Progress Bar (always active, neon accentuated in Zen mode) */}
        <div className={`w-full bg-[#020512] ${isZenMode ? 'h-1.5' : 'h-1'} shrink-0 z-20 overflow-hidden`}>
          <div
            className={`h-full bg-gradient-to-r ${
              isZenMode
                ? ZEN_THEMES[zenTheme].progress
                : 'from-blue-600 via-cyan-400 to-yellow-400 shadow-[0_0_10px_#00d2ff]'
            } transition-all duration-150 relative`}
            style={{ width: `${scrollProgress}%` }}
          >
            {isZenMode && (
              <span className="absolute right-0 top-0 bottom-0 w-2.5 bg-white shadow-[0_0_8px_#ffffff]" />
            )}
          </div>
        </div>

        {/* Zen Mode Control Bar when active */}
        {isZenMode && article && (
          <div className={`shrink-0 z-20 ${ZEN_THEMES[zenTheme].topBar} backdrop-blur-md border-b px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs font-mono transition-colors`}>
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#00ff9d]" />
              <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-400">
                CONSOLE TERMINAL // SASAKI-PRESS
              </span>
              <span className="text-cyan-400/60 hidden sm:inline">•</span>
              <span className="text-cyan-300 font-bold hidden sm:inline">
                {scrollProgress}% LU
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Theme Palette Switcher */}
              <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-cyan-500/30">
                {(['cyan', 'amber', 'matrix', 'monochrome'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setZenTheme(t);
                      sfx.playMechanicalClick();
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      zenTheme === t
                        ? ZEN_THEMES[t].activeBtn
                        : 'text-stone-400 hover:text-white'
                    }`}
                    title={`Palette ${ZEN_THEMES[t].name}`}
                  >
                    {t === 'monochrome' ? 'Mono' : t}
                  </button>
                ))}
              </div>

              {/* Font Size Selector */}
              <div className="flex items-center bg-black/40 rounded-lg border border-cyan-500/30 p-0.5">
                {(['sm', 'base', 'lg', 'xl', '2xl'] as const).map((size, idx) => (
                  <button
                    key={size}
                    onClick={() => {
                      setZenFontSize(size);
                      sfx.playMechanicalClick();
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      zenFontSize === size
                        ? 'bg-cyan-400 text-black shadow-[0_0_8px_#00f3ff]'
                        : 'text-cyan-400/60 hover:text-white'
                    }`}
                    title={`Taille ${size}`}
                  >
                    {['A--', 'A-', 'A', 'A+', 'A++'][idx]}
                  </button>
                ))}
              </div>

              {/* Typography Monospace / Sans switcher */}
              <button
                onClick={() => {
                  setIsMonoFont(!isMonoFont);
                  sfx.playMechanicalClick();
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                  isMonoFont
                    ? 'border-cyan-400 bg-cyan-950 text-cyan-200 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
                    : 'border-cyan-500/30 text-cyan-400/70 hover:text-cyan-200'
                }`}
                title="Basculer entre police Monospace et Sans-Serif"
              >
                <Type className="w-3 h-3" />
                <span>{isMonoFont ? 'Mono' : 'Sans'}</span>
              </button>

              {/* Exit Zen Button */}
              <button
                onClick={handleToggleZenMode}
                className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 hover:text-white hover:bg-red-900/60 text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                title="Quitter la Console Zen"
              >
                <Minimize2 className="w-3 h-3" />
                <span className="hidden md:inline">Quitter [ESC]</span>
              </button>
            </div>
          </div>
        )}

        {loading || !article ? (
          <div className="p-16 text-center text-cyan-400">
            <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
            <p className="font-mono text-sm">Chargement de l'article...</p>
          </div>
        ) : isZenMode ? (
          <div
            ref={zenScrollRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto overscroll-contain transition-colors p-4 sm:p-10 max-w-3xl mx-auto w-full space-y-7 ${ZEN_THEMES[zenTheme].container} touch-pan-y`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Terminal Telemetry Header */}
            <div className={`p-3.5 rounded-xl border ${ZEN_THEMES[zenTheme].topBar} font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,0,0,0.6)]`}>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-bold tracking-widest text-emerald-400">CONSOLE CITOYENNE // FLUX INTÈGRE</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] opacity-80">
                <span>REF: {article.id.slice(-8).toUpperCase()}</span>
                <span>•</span>
                <span>~{Math.max(1, Math.ceil((article.content || '').split(/\s+/).length / 200))} MIN LECTURE</span>
                <span>•</span>
                <span>{(article.content || '').split(/\s+/).length} MOTS</span>
                <span>•</span>
                <span>{article.viewsCount} LECTURES</span>
              </div>
            </div>

            {/* Monospace Heading & Metadata Block */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={`px-2.5 py-1 rounded font-bold uppercase ${ZEN_THEMES[zenTheme].accent} bg-black/40 border`}>
                  {article.categoryName || 'Actualité'}
                </span>
                <span className={ZEN_THEMES[zenTheme].meta}>
                  {new Date(article.createdAt).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <h1
                className={`font-black text-2xl sm:text-4xl leading-tight tracking-tight ${
                  isMonoFont ? 'font-mono' : 'font-sans'
                } ${ZEN_THEMES[zenTheme].title}`}
              >
                {article.title}
              </h1>

              <div className={`pt-3 border-t border-cyan-500/20 text-xs sm:text-sm font-mono flex flex-wrap items-center gap-2 ${ZEN_THEMES[zenTheme].meta}`}>
                <span>Transmis par :</span>
                <strong className="text-white underline decoration-cyan-500">{article.authorName}</strong>
                {article.isAuthorVerified && (
                  <div className="flex items-center gap-1.5">
                    <VerifiedBadge size="sm" type={article.authorRole === 'admin' ? 'admin' : article.mediaName ? 'media' : 'journalist'} role={article.authorRole} />
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                      {article.authorRole === 'admin' ? 'ADMINISTRATEUR OFFICIEL' : article.mediaName ? 'RÉDACTION CERTIFIÉE' : 'JOURNALISTE ACCRÉDITÉ'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Article Summary (Synthèse du signal) */}
            {article.summary && (
              <div
                className={`p-4.5 rounded-xl border-l-4 ${ZEN_THEMES[zenTheme].leadBox} ${
                  isMonoFont ? 'font-mono' : 'font-sans'
                } text-sm sm:text-base italic leading-relaxed shadow-[0_0_15px_rgba(0,243,255,0.06)]`}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5 opacity-70 font-bold not-italic">
                  &gt; SYNTHÈSE DU SIGNAL // TRANSMISSION OFFICIELLE
                </div>
                <p>« {article.summary} »</p>
              </div>
            )}

            {/* Video Player if article has video */}
            {article.videoUrl && (
              <div className="rounded-xl overflow-hidden border border-cyan-500/30">
                <div className="mb-2 p-2 bg-black/50 text-xs font-mono text-cyan-300 flex items-center gap-2">
                  <VideoIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>FLUX VIDÉO ASSOCIÉ</span>
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
              className={`leading-relaxed whitespace-pre-line tracking-wide ${
                isMonoFont ? 'font-mono' : 'font-sans'
              } ${ZEN_FONT_CLASSES[zenFontSize]} ${ZEN_THEMES[zenTheme].proseText}`}
            >
              {article.content}
            </div>

            {/* Photo Gallery (Reportage) */}
            {((article.gallery && article.gallery.length > 0) || (article.images && article.images.length > 0)) && (
              <PhotoGallery
                items={article.gallery && article.gallery.length > 0 ? article.gallery : article.images}
                title="Pièces à conviction photographiques"
              />
            )}

            {/* Interactive Opinion Poll & Barometer (Uniquement si le journaliste a défini un sondage) */}
            {article.poll && article.poll.question && article.poll.options && article.poll.options.length >= 2 && (
              <div className="pt-6 border-t border-cyan-500/20">
                <ArticlePoll
                  articleId={article.id}
                  poll={article.poll}
                  onOpenAuth={onOpenAuth}
                />
              </div>
            )}

            {/* End of Transmission Banner & Actions */}
            <div className="pt-8 border-t border-cyan-500/30 space-y-4 font-mono text-center">
              <div className="py-2.5 px-4 rounded-xl border border-dashed border-cyan-500/40 bg-black/40 text-xs text-cyan-300">
                /// FIN DU RAPPORT DE TRANSMISSION - ARCHIVE SASAKI COMPAGNIE ///
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-xs transition-all cursor-pointer font-mono ${
                    isLiked
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                      : 'bg-black/50 text-slate-300 hover:text-white border border-cyan-500/30'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{likesCount} Approbations</span>
                </button>

                <button
                  onClick={handleBookmark}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-xs transition-all cursor-pointer font-mono ${
                    isBookmarked
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,243,255,0.5)]'
                      : 'bg-black/50 text-slate-300 hover:text-white border border-cyan-500/30'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                  <span>{isBookmarked ? 'Archivé en mémoire' : 'Archiver'}</span>
                </button>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-black/50 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold font-mono transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Transmettre</span>
                </button>

                <button
                  onClick={handleToggleZenMode}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400 text-xs font-bold font-mono hover:bg-cyan-500/30 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.3)]"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Quitter la Console Zen [ESC]</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={contentScrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overscroll-contain transition-all p-4 sm:p-8 space-y-6 touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Article Title */}
            <h1 className="font-black text-2xl sm:text-4xl text-white leading-tight tracking-tight break-words [overflow-wrap:anywhere]">
              {article.title}
            </h1>

            {/* Author Box */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-[#0b142c] to-[#040817] border border-blue-500/30 flex flex-wrap items-center justify-between gap-4 transition-all shadow-[0_4px_25px_rgba(0,10,35,0.5)]">
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
                  className="w-12 h-12 rounded-full object-cover border border-blue-500/40 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,210,255,0.6)] transition-all"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors">
                    <span>{article.mediaName || article.authorName}</span>
                    {article.isAuthorVerified && (
                      <span
                        onClick={(e) => {
                          if (onOpenTrustSystem) {
                            e.stopPropagation();
                            onOpenTrustSystem();
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-400/40 hover:bg-blue-600/30 cursor-pointer shadow-[0_0_8px_rgba(0,210,255,0.3)] transition-all"
                        title="Compte certifié (Badge bleu officiel) - Cliquez pour voir la charte"
                      >
                        <VerifiedBadge size="xs" type={article.authorRole === 'admin' ? 'admin' : article.mediaName ? 'media' : 'journalist'} role={article.authorRole} />
                        <span className="text-white text-[10px] uppercase tracking-wider font-semibold">Certifié</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-blue-300/60 font-mono">
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
                      ? 'bg-blue-600/20 text-cyan-300 border border-blue-400/40'
                      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(29,104,255,0.4)]'
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
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-blue-300/70 pb-4 border-b border-blue-500/15">
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
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                {Math.max(1, Math.ceil((article.content || '').split(/\s+/).length / 200))} min de lecture
              </span>
              <span>•</span>
              <span className="flex items-center gap-1" title="Vues réelles">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
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
              <div className="mt-4 p-4 rounded-xl bg-cyan-950/40 border-l-4 border-cyan-400 text-cyan-100 font-medium text-sm sm:text-base leading-relaxed italic shadow-[0_0_15px_rgba(0,243,255,0.06)] break-words [overflow-wrap:anywhere]">
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
            <div className="mt-6 text-base sm:text-lg leading-relaxed text-slate-200 whitespace-pre-line font-sans break-words [overflow-wrap:anywhere]">
              {article.content}
            </div>

            {/* Photo Gallery (Reportage) */}
            {((article.gallery && article.gallery.length > 0) || (article.images && article.images.length > 0)) && (
              <PhotoGallery
                items={article.gallery && article.gallery.length > 0 ? article.gallery : article.images}
                title="Galerie photographique du reportage"
              />
            )}

            {/* Interactive Opinion Poll & Barometer (Uniquement si le journaliste a défini un sondage) */}
            {article.poll && article.poll.question && article.poll.options && article.poll.options.length >= 2 && (
              <ArticlePoll
                articleId={article.id}
                poll={article.poll}
                onOpenAuth={onOpenAuth}
              />
            )}

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 pt-4 border-t border-blue-500/20">
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
                    className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[#081026] hover:bg-blue-600/30 border border-blue-500/30 hover:border-cyan-400 text-cyan-300 transition-all cursor-pointer"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {/* Interaction Bar */}
            <div className="mt-8 p-3 rounded-2xl bg-[#081026] border border-blue-500/25 flex items-center justify-between shadow-[0_10px_30px_-10px_rgba(0,85,255,0.2)]">
              <div className="flex items-center gap-3">
                <button
                  id="modal-like-article-btn"
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all cursor-pointer font-mono ${
                    isLiked
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : 'bg-[#040817] text-slate-300 hover:text-white border border-blue-500/25'
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
                      ? 'bg-blue-600/20 text-cyan-300 border border-blue-400/50 shadow-[0_0_10px_rgba(0,210,255,0.5)]'
                      : 'bg-[#040817] text-slate-300 hover:text-white border border-blue-500/25'
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#040817] text-cyan-300 hover:text-white border border-blue-500/30 text-xs font-bold transition-all cursor-pointer font-mono"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Partager</span>
                </button>

                <button
                  id="modal-report-article-btn"
                  onClick={() => (isAuthenticated ? setShowReportModal(true) : onOpenAuth())}
                  className="p-2 text-blue-300/60 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
                  title="Signaler un problème sur cet article"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recommended Articles Section ("À lire aussi") */}
            {relatedArticles.length > 0 && (
              <div className="mt-8 pt-6 border-t border-blue-500/20">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>À lire aussi</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-400/40">
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
                      className="group cursor-pointer flex sm:flex-col gap-3 p-3 rounded-xl bg-gradient-to-b from-[#0e1936]/80 to-[#050b1c]/95 hover:from-[#122048]/90 hover:to-[#070e24]/98 border border-blue-500/25 hover:border-cyan-400/60 shadow-[0_4px_15px_rgba(0,10,35,0.4)] hover:shadow-[0_8px_25px_rgba(29,104,255,0.25)] transition-all"
                    >
                      {rel.coverImage && (
                        <div className="w-20 h-20 sm:w-full sm:h-28 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-blue-500/20">
                          <img
                            src={getCoverUrl(rel.coverImage, 400, 240)}
                            alt={rel.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-cyan-300 line-clamp-2 leading-snug transition-colors">
                          {rel.title}
                        </h4>
                        <div className="mt-2 text-[11px] text-blue-300/60 font-mono flex items-center gap-2">
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
            <section className="mt-10 pt-6 border-t border-blue-500/20">
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
                      className="w-9 h-9 rounded-full object-cover border border-blue-500/40 shrink-0"
                    />
                    <div className="flex-1">
                      <textarea
                        id="new-comment-textarea"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Exprimez votre avis citoyen dans le respect et la courtoisie (au moins 2 caractères)..."
                        className="w-full p-3 text-sm bg-[#081026] border border-blue-500/30 rounded-xl text-slate-100 placeholder:text-blue-300/40 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all resize-none"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={!newComment.trim() || isSubmittingComment}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 text-white text-xs font-bold font-mono rounded-full transition-all cursor-pointer shadow-[0_0_15px_rgba(29,104,255,0.4)]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmittingComment ? 'Publication...' : 'Publier'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-[#0b142c] to-[#040817] border border-blue-500/30 text-center transition-all shadow-[0_4px_20px_rgba(0,10,35,0.4)]">
                  <p className="text-xs sm:text-sm text-slate-200">
                    Connectez-vous pour réagir et participer aux débats sur cet article.
                  </p>
                  <button
                    onClick={onOpenAuth}
                    className="mt-3 px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold font-mono rounded-full cursor-pointer shadow-[0_0_15px_rgba(29,104,255,0.4)]"
                  >
                    Se connecter / Créer un compte
                  </button>
                </div>
              )}

              {/* Comments Thread List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-blue-400/50 italic font-mono">Soyez le premier à commenter cet article !</p>
                ) : (
                  comments.map((comm) => {
                    const canModify = user && (user.id === comm.userId || user.role === 'admin');
                    const canDelete =
                      canModify || (article && user && user.id === article.authorId);

                    return (
                      <div
                        key={comm.id}
                        className="p-4 rounded-xl bg-[#081026]/90 border border-blue-500/25 hover:border-blue-400/50 transition-all shadow-[0_4px_15px_rgba(0,10,35,0.3)]"
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
                          <p className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">
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

                                  <p className="mt-1 text-xs text-slate-300 leading-relaxed break-words [overflow-wrap:anywhere]">
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
                      <option value="Fausses informations volontairement diffusées (Fake news / Infox)">Fausses informations volontairement diffusées (Fake news / Infox)</option>
                      <option value="Propos diffamatoires ou atteinte à l’honneur">Propos diffamatoires ou atteinte à l’honneur</option>
                      <option value="Contenus illégaux ou incitation à la violence / haine">Contenus illégaux ou incitation à la violence / haine</option>
                      <option value="Publication sans rapport avec le journalisme / Sensationnalisme">Publication sans rapport avec le journalisme / Sensationnalisme</option>
                      <option value="Usurpation d’identité ou faux journaliste">Usurpation d’identité ou faux journaliste</option>
                      <option value="Plagiat ou violation de droits d'auteur">Plagiat ou violation de droits d'auteur</option>
                      <option value="Autre motif déontologique">Autre motif déontologique</option>
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
        {/* Floating Quick Action Buttons: Scroll to top & Comments */}
        {showScrollTop && (
          <div className="absolute bottom-5 right-4 sm:right-6 z-30 flex items-center gap-2 animate-in fade-in zoom-in-95">
            <button
              id="scroll-to-comments-btn"
              type="button"
              onClick={scrollToComments}
              className="px-3 py-2 bg-[#0a1024]/90 hover:bg-blue-900/80 text-cyan-300 hover:text-white rounded-full shadow-[0_0_15px_rgba(0,180,255,0.3)] border border-blue-500/40 flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer backdrop-blur-md active:scale-95"
              title="Descendre aux commentaires"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Commentaires</span>
            </button>
            <button
              id="scroll-to-top-btn"
              type="button"
              onClick={scrollToTop}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-full shadow-[0_0_20px_rgba(0,210,255,0.5)] border border-blue-400/50 flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer backdrop-blur-md active:scale-95"
              title="Remonter tout en haut de l'article"
            >
              <ArrowUp className="w-4 h-4" />
              <span>Haut</span>
            </button>
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
