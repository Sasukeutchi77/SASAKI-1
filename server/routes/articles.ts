import { Router, Response } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth, requireJournalistOrAdmin } from '../auth';
import { Article, Comment, ArticleStatus } from '../../src/types';
import {
  articleCreationLimiter,
  commentsRateLimiter,
  likesRateLimiter,
  reportRateLimiter,
  checkDuplicateComment,
} from '../security/rateLimiter';
import { sanitizeText, isValidUrl, isRepetitiveSpam } from '../security/sanitizer';
import { isMasterAdmin } from '../config/masterAccounts';
import { realtimeHub } from '../realtime';

export const articlesRouter = Router();

// Helper to parse and sanitize hashtags, ensuring '#' prefix and clean alphanumeric tokens
export function formatHashtags(rawTags: any): string[] {
  if (!rawTags) return [];
  const list = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === 'string'
    ? rawTags.split(/[,\s]+/)
    : [];

  return list
    .map((t: string) => {
      if (typeof t !== 'string') return '';
      const trimmed = t.trim().toLowerCase();
      const withoutHash = trimmed.replace(/^#+/, '').trim();
      if (!withoutHash) return '';
      const sanitized = sanitizeText(withoutHash, { maxLength: 29, allowNewlines: false })
        .replace(/[^a-z0-9_\-\u00C0-\u017F]/gi, '');
      return sanitized ? `#${sanitized.toLowerCase()}` : '';
    })
    .filter(Boolean)
    .slice(0, 10);
}

// List articles with search, category filtering, smart feeds and pagination
articlesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const rawFeed = (req.query.feed || req.query.filter || 'foryou') as string;
  const feed = ['foryou', 'following', 'trending', 'latest'].includes(rawFeed) ? rawFeed : 'latest';
  const { category, tag, search, authorId, status, sort, dateRange } = req.query;

  let list = [...data.articles];

  // Permissions on status: regular viewers only see 'published'
  const isPrivileged = req.user && (req.user.role === 'admin' || (req.user.role === 'journalist' && authorId === req.user.id));
  if (!isPrivileged) {
    list = list.filter((a) => a.status === 'published');
  } else if (status) {
    list = list.filter((a) => a.status === status);
  }

  // Author filter
  if (authorId) {
    list = list.filter((a) => a.authorId === authorId || (a.mediaId && a.mediaId === authorId));
  }

  // Category filter (by id or slug)
  if (category && category !== 'all') {
    const catObj = data.categories.find((c) => c.id === category || c.slug === category);
    if (catObj) {
      list = list.filter((a) => a.categoryId === catObj.id);
    }
  }

  // Tag filter (case-insensitive, strip '#' if present)
  if (tag) {
    const normalizedTag = String(tag).replace(/^#/, '').toLowerCase().trim();
    list = list.filter((a) => a.tags && a.tags.some((t) => t.toLowerCase().replace(/^#/, '').trim() === normalizedTag));
  }

  // Global search filter
  if (search) {
    const q = String(search).toLowerCase().trim();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        a.content.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q) ||
        (a.mediaName && a.mediaName.toLowerCase().includes(q)) ||
        (a.tags && a.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  // Date range filter
  if (dateRange && dateRange !== 'all') {
    const nowMs = Date.now();
    list = list.filter((a) => {
      const artTime = new Date(a.createdAt).getTime();
      const diffHours = (nowMs - artTime) / (1000 * 60 * 60);
      if (dateRange === 'today') return diffHours <= 24;
      if (dateRange === 'week') return diffHours <= 24 * 7;
      if (dateRange === 'month') return diffHours <= 24 * 30;
      if (dateRange === 'year') return diffHours <= 24 * 365;
      return true;
    });
  }

  const now = Date.now();

  // Sorting logic (if explicit 'sort' is provided, it takes precedence)
  if (sort === 'views') {
    list.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
  } else if (sort === 'likes') {
    list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else if (sort === 'popular') {
    list.sort((a, b) => {
      const ageHoursA = Math.max(0.1, (now - new Date(a.createdAt).getTime()) / 3600000);
      const ageHoursB = Math.max(0.1, (now - new Date(b.createdAt).getTime()) / 3600000);
      const scoreA = (a.viewsCount + a.likesCount * 4 + a.commentsCount * 6) / Math.pow(ageHoursA + 2, 1.25);
      const scoreB = (b.viewsCount + b.likesCount * 4 + b.commentsCount * 6) / Math.pow(ageHoursB + 2, 1.25);
      return scoreB - scoreA;
    });
  } else if (sort === 'latest') {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (feed === 'following') {
    if (req.user) {
      const followedIds = data.follows.filter((f) => f.followerId === req.user!.id).map((f) => f.targetId);
      list = list.filter((a) => followedIds.includes(a.authorId) || (a.mediaId && followedIds.includes(a.mediaId)));
      // Most recent first in subscriptions feed
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      list = []; // Unauthenticated following feed is empty
    }
  } else if (feed === 'trending') {
    // Trending: Freshness boost + engagement with time-decay
    list.sort((a, b) => {
      const ageHoursA = Math.max(0.05, (now - new Date(a.createdAt).getTime()) / 3600000);
      const ageHoursB = Math.max(0.05, (now - new Date(b.createdAt).getTime()) / 3600000);
      const freshA = 12 / Math.pow(ageHoursA + 0.8, 1.2);
      const freshB = 12 / Math.pow(ageHoursB + 0.8, 1.2);
      const scoreA = freshA + (a.viewsCount + a.likesCount * 4 + a.commentsCount * 6) / Math.pow(ageHoursA + 2, 1.35);
      const scoreB = freshB + (b.viewsCount + b.likesCount * 4 + b.commentsCount * 6) / Math.pow(ageHoursB + 2, 1.35);
      if (Math.abs(scoreB - scoreA) > 0.001) return scoreB - scoreA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (feed === 'foryou') {
    // "Pour vous" personalized recommendation
    if (req.user) {
      const followedIds = data.follows.filter((f) => f.followerId === req.user!.id).map((f) => f.targetId);
      const userInteractedArticleIds = [
        ...data.likes.filter((l) => l.userId === req.user!.id).map((l) => l.articleId),
        ...data.bookmarks.filter((b) => b.userId === req.user!.id).map((b) => b.articleId),
      ];
      const preferredCategoryIds = new Set(
        data.articles.filter((a) => userInteractedArticleIds.includes(a.id)).map((a) => a.categoryId)
      );

      list.sort((a, b) => {
        const isFollowedA = (followedIds.includes(a.authorId) || (a.mediaId && followedIds.includes(a.mediaId))) ? 80 : 0;
        const isFollowedB = (followedIds.includes(b.authorId) || (b.mediaId && followedIds.includes(b.mediaId))) ? 80 : 0;
        const catAffinityA = preferredCategoryIds.has(a.categoryId) ? 30 : 0;
        const catAffinityB = preferredCategoryIds.has(b.categoryId) ? 30 : 0;

        const ageHoursA = Math.max(0.05, (now - new Date(a.createdAt).getTime()) / 3600000);
        const ageHoursB = Math.max(0.05, (now - new Date(b.createdAt).getTime()) / 3600000);

        const freshA = 16 / Math.pow(ageHoursA + 0.6, 1.15);
        const freshB = 16 / Math.pow(ageHoursB + 0.6, 1.15);

        const engA = (a.viewsCount * 0.5 + a.likesCount * 3 + a.commentsCount * 5) / Math.pow(ageHoursA + 2, 1.15);
        const engB = (b.viewsCount * 0.5 + b.likesCount * 3 + b.commentsCount * 5) / Math.pow(ageHoursB + 2, 1.15);

        const scoreA = isFollowedA + catAffinityA + freshA + engA;
        const scoreB = isFollowedB + catAffinityB + freshB + engB;
        if (Math.abs(scoreB - scoreA) > 0.001) return scoreB - scoreA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      // Default: Blend of freshness, quality and recency for unauthenticated readers
      list.sort((a, b) => {
        const ageHoursA = Math.max(0.05, (now - new Date(a.createdAt).getTime()) / 3600000);
        const ageHoursB = Math.max(0.05, (now - new Date(b.createdAt).getTime()) / 3600000);
        const freshA = 16 / Math.pow(ageHoursA + 0.6, 1.15);
        const freshB = 16 / Math.pow(ageHoursB + 0.6, 1.15);
        const scoreA = freshA + (a.viewsCount + a.likesCount * 3 + a.commentsCount * 4) / Math.pow(ageHoursA + 2, 1.25);
        const scoreB = freshB + (b.viewsCount + b.likesCount * 3 + b.commentsCount * 4) / Math.pow(ageHoursB + 2, 1.25);
        if (Math.abs(scoreB - scoreA) > 0.001) return scoreB - scoreA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
  } else {
    // Default 'latest'
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Pagination parameters
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
  const total = list.length;
  const startIndex = (page - 1) * limit;
  const paginatedList = list.slice(startIndex, startIndex + limit);

  // Enrich with user's like/bookmark status
  const enriched = paginatedList.map((art) => {
    const isLiked = req.user ? data.likes.some((l) => l.userId === req.user!.id && l.articleId === art.id) : false;
    const isBookmarked = req.user ? data.bookmarks.some((b) => b.userId === req.user!.id && b.articleId === art.id) : false;
    return {
      ...art,
      isLiked,
      isBookmarked,
    };
  });

  return res.json({
    articles: enriched,
    total,
    page,
    limit,
    hasMore: startIndex + limit < total,
  });
});

// List all distinct tags with actual published article counts
articlesRouter.get('/tags', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const tagCountMap = new Map<string, number>();

  data.articles.forEach((a) => {
    if (a.status === 'published' && a.tags && Array.isArray(a.tags)) {
      a.tags.forEach((raw) => {
        const clean = raw.replace(/^#/, '').trim();
        if (clean) {
          tagCountMap.set(clean, (tagCountMap.get(clean) || 0) + 1);
        }
      });
    }
  });

  const tags = Array.from(tagCountMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return res.json({ tags });
});

// Single Article details + view count anti-abuse
articlesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }

  // Non-privileged users cannot view drafts or hidden articles
  const isPrivileged = req.user && (req.user.role === 'admin' || req.user.id === article.authorId);
  if (article.status !== 'published' && !isPrivileged) {
    return res.status(403).json({ error: 'Cet article n’est pas accessible au public.' });
  }

  // Anti-abuse view tracking: 30 minutes cooldown per user / IP
  const now = Date.now();
  const thirtyMinutesAgo = now - 30 * 60 * 1000;
  const clientIdentifier = req.user?.id || req.ip || 'anonymous';
  const recentView = data.views.find(
    (v) =>
      v.articleId === article.id &&
      (req.user ? v.userId === req.user.id : v.ip === req.ip) &&
      new Date(v.viewedAt).getTime() > thirtyMinutesAgo
  );

  if (!recentView) {
    article.viewsCount += 1;
    data.views.push({
      id: `vw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      articleId: article.id,
      userId: req.user ? req.user.id : undefined,
      ip: req.ip || '',
      viewedAt: new Date().toISOString(),
    });
    db.save();
    realtimeHub.broadcast('article:viewed', { articleId: article.id, viewsCount: article.viewsCount });
  }

  const isLiked = req.user ? data.likes.some((l) => l.userId === req.user!.id && l.articleId === article.id) : false;
  const isBookmarked = req.user ? data.bookmarks.some((b) => b.userId === req.user!.id && b.articleId === article.id) : false;

  return res.json({
    article: {
      ...article,
      isLiked,
      isBookmarked,
    },
  });
});

// Dedicated active view register (called when reader spends active time on article)
articlesRouter.post('/:id/view', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }

  const now = Date.now();
  const thirtyMinutesAgo = now - 30 * 60 * 1000;
  const recentView = data.views.find(
    (v) =>
      v.articleId === article.id &&
      (req.user ? v.userId === req.user.id : v.ip === req.ip) &&
      new Date(v.viewedAt).getTime() > thirtyMinutesAgo
  );

  if (!recentView) {
    article.viewsCount += 1;
    data.views.push({
      id: `vw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      articleId: article.id,
      userId: req.user ? req.user.id : undefined,
      ip: req.ip || '',
      viewedAt: new Date().toISOString(),
    });
    db.save();
    realtimeHub.broadcast('article:viewed', { articleId: article.id, viewsCount: article.viewsCount });
  }

  return res.json({ viewsCount: article.viewsCount });
});

// Create article (Journalist or Admin) with rate limiting and strict sanitization
articlesRouter.post(
  '/',
  requireJournalistOrAdmin,
  articleCreationLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
  const user = req.user!;
  const {
    title,
    summary,
    content,
    categoryId,
    tags,
    coverImage,
    coverImageAlt,
    coverMedia,
    images,
    gallery,
    videoUrl,
    videoMedia,
    videoThumbnail,
    status = 'published',
  } = req.body;

  if (!title || !content || !categoryId) {
    return res.status(400).json({ error: 'Le titre, le contenu et la catégorie sont obligatoires.' });
  }

  const cleanTitle = sanitizeText(title, { maxLength: 200, allowNewlines: false });
  if (cleanTitle.length < 5) {
    return res.status(400).json({ error: 'Le titre doit contenir au moins 5 caractères valides.' });
  }

  const cleanContent = sanitizeText(content, { maxLength: 60000 });
  if (cleanContent.length < 30) {
    return res.status(400).json({ error: 'Le contenu de l’article doit comporter au moins 30 caractères.' });
  }

  const cleanSummary = summary ? sanitizeText(summary, { maxLength: 500 }) : cleanTitle.substring(0, 160);

  const category = data.categories.find((c) => c.id === categoryId);
  if (!category) {
    return res.status(400).json({ error: 'Catégorie sélectionnée inexistante.' });
  }

  // Validate Cover Image URL
  const validCover = coverImage && isValidUrl(coverImage)
    ? coverImage.trim()
    : 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80';

  // Validate Video URL if provided
  let validVideoUrl: string | undefined = undefined;
  if (videoUrl) {
    if (isValidUrl(videoUrl)) {
      validVideoUrl = videoUrl.trim();
    } else {
      return res.status(400).json({ error: 'L’URL de la vidéo fournie est invalide ou non sécurisée.' });
    }
  }

  // Sanitize hashtags (ensure '#' prefix and clean tokens)
  const cleanTags: string[] = formatHashtags(tags);

  // Enforce Media House requirement:
  // Journalists publish exclusively through their accredited Maison de Journalistes (never as isolated accounts)
  const isSuperAdmin = user.role === 'admin' || isMasterAdmin(user.email);
  let house = (data.mediaHouses || []).find(
    (m) =>
      m.ownerId === user.id ||
      (m.members && Array.isArray(m.members) && m.members.includes(user.id)) ||
      (user.mediaId && m.id === user.mediaId)
  );

  if (user.role === 'journalist' && !isSuperAdmin) {
    if (!house) {
      return res.status(403).json({
        error: 'Publication refusée : vous devez créer une maison de journalistes ou être rattaché à une maison de journalistes pour publier. Les publications se font obligatoirement au nom d’une maison de journalistes.',
        requiresHouse: true,
      });
    }
  }

  const now = new Date().toISOString();
  const newArticle: Article = {
    id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: cleanTitle,
    summary: cleanSummary,
    content: cleanContent,
    authorId: user.id,
    authorName: user.name,
    authorAvatar: user.avatar,
    authorRole: user.role,
    isAuthorVerified: !!user.isVerified,
    mediaId: house ? house.id : user.mediaId,
    mediaName: house ? house.name : (user.mediaName || 'PURGE-INFO'),
    coverImage: validCover,
    coverImageAlt: coverImageAlt ? sanitizeText(coverImageAlt, { maxLength: 150, allowNewlines: false }) : undefined,
    coverMedia: coverMedia || undefined,
    images: Array.isArray(images) ? images.filter((img) => typeof img === 'string' && isValidUrl(img)) : [],
    gallery: Array.isArray(gallery) ? gallery : [],
    videoUrl: validVideoUrl,
    videoMedia: videoMedia || undefined,
    videoThumbnail: videoThumbnail && isValidUrl(videoThumbnail) ? videoThumbnail : undefined,
    categoryId: category.id,
    categoryName: category.name,
    tags: cleanTags,
    status: (['published', 'draft'].includes(status) ? status : 'published') as ArticleStatus,
    viewsCount: 0,
    likesCount: 0,
    commentsCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Associate media records with this newly created article
  if (data.mediaRecords) {
    const mediaUrls = new Set<string>();
    if (coverImage) mediaUrls.add(coverImage);
    if (coverMedia?.url) mediaUrls.add(coverMedia.url);
    if (Array.isArray(images)) images.forEach((img) => mediaUrls.add(img));
    if (Array.isArray(gallery)) gallery.forEach((g) => { if (g.url) mediaUrls.add(g.url); });
    if (videoUrl) mediaUrls.add(videoUrl);

    data.mediaRecords.forEach((m) => {
      if (mediaUrls.has(m.url) || mediaUrls.has(m.secureUrl) || (coverMedia && m.publicId === coverMedia.publicId)) {
        m.articleId = newArticle.id;
      }
    });
  }

  data.articles.unshift(newArticle);

  // If published, notify followers of both the author and the media house
  if (newArticle.status === 'published') {
    const targetFollowIds = new Set<string>([user.id]);
    if (newArticle.mediaId) targetFollowIds.add(newArticle.mediaId);
    if (house?.id) targetFollowIds.add(house.id);
    if (user.mediaId) targetFollowIds.add(user.mediaId);

    const followerIds = new Set<string>();
    data.follows.forEach((f) => {
      if (targetFollowIds.has(f.targetId) && f.followerId !== user.id) {
        followerIds.add(f.followerId);
      }
    });

    for (const followerId of followerIds) {
      const houseOrAuthorName = newArticle.mediaName || user.mediaName || user.name;
      const notifItem = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: followerId,
        type: 'article' as const,
        title: `🔴 ${houseOrAuthorName} vient de publier`,
        message: newArticle.title,
        link: `/article/${newArticle.id}`,
        read: false,
        createdAt: now,
      };
      data.notifications.unshift(notifItem);
      realtimeHub.broadcastToUser(followerId, 'notification:new', notifItem);
    }
  }

  if (house) {
    house.articlesCount = (house.articlesCount || 0) + 1;
    realtimeHub.broadcast('mediaHouse:updated', house);
  }

  await db.persistArticle(newArticle);
  db.save();

  // Real-time broadcast to all connected readers & media houses
  if (newArticle.status === 'published') {
    realtimeHub.broadcast('article:created', newArticle);
  }

  return res.status(201).json({ message: 'Article créé avec succès !', article: newArticle });
});

// Update article
articlesRouter.put('/:id', requireJournalistOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable.' });
  }

  // Security check: Only original author or admin can edit
  if (article.authorId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Vous n’êtes pas autorisé à modifier cet article.' });
  }

  const prevStatus = article.status;

  const {
    title,
    summary,
    content,
    categoryId,
    tags,
    coverImage,
    coverImageAlt,
    coverMedia,
    images,
    gallery,
    videoUrl,
    videoMedia,
    videoThumbnail,
    status,
  } = req.body;

  if (title) article.title = title.trim();
  if (summary !== undefined) article.summary = summary.trim();
  if (content) article.content = content.trim();
  if (coverImage) article.coverImage = coverImage;
  if (coverImageAlt !== undefined) article.coverImageAlt = coverImageAlt.trim();
  if (coverMedia !== undefined) article.coverMedia = coverMedia;
  if (Array.isArray(images)) article.images = images;
  if (Array.isArray(gallery)) article.gallery = gallery;
  if (videoUrl !== undefined) article.videoUrl = videoUrl ? videoUrl.trim() : undefined;
  if (videoMedia !== undefined) article.videoMedia = videoMedia;
  if (videoThumbnail !== undefined) article.videoThumbnail = videoThumbnail;
  if (tags !== undefined) article.tags = formatHashtags(tags);
  if (categoryId) {
    const category = data.categories.find((c) => c.id === categoryId);
    if (category) {
      article.categoryId = category.id;
      article.categoryName = category.name;
    }
  }
  if (status && ['published', 'draft', 'hidden'].includes(status)) {
    article.status = status;
  }
  article.updatedAt = new Date().toISOString();

  // Associate updated media records
  if (data.mediaRecords) {
    const mediaUrls = new Set<string>();
    if (article.coverImage) mediaUrls.add(article.coverImage);
    if (article.images) article.images.forEach((img) => mediaUrls.add(img));
    if (article.gallery) article.gallery.forEach((g) => { if (g.url) mediaUrls.add(g.url); });
    if (article.videoUrl) mediaUrls.add(article.videoUrl);

    data.mediaRecords.forEach((m) => {
      if (mediaUrls.has(m.url) || mediaUrls.has(m.secureUrl)) {
        m.articleId = article.id;
      }
    });
  }

  await db.persistArticle(article);
  db.save();

  // If status transitioned to 'published', broadcast article:created as well as article:updated
  if (prevStatus !== 'published' && article.status === 'published') {
    realtimeHub.broadcast('article:created', article);
  } else if (prevStatus === 'published' && article.status !== 'published') {
    realtimeHub.broadcast('article:deleted', { articleId: article.id, categoryId: article.categoryId });
  }

  realtimeHub.broadcast('article:updated', article);
  return res.json({ message: 'Article mis à jour avec succès.', article });
});

// Delete article
articlesRouter.delete('/:id', requireJournalistOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const index = data.articles.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Article introuvable.' });
  }

  const article = data.articles[index];
  // Security check: Only author or admin can delete
  if (article.authorId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Vous n’avez pas l’autorisation de supprimer cet article.' });
  }

  await db.deleteArticle(article.id);
  data.articles.splice(index, 1);
  // Also cleanup associated likes, comments, bookmarks
  data.likes = data.likes.filter((l) => l.articleId !== article.id);
  data.bookmarks = data.bookmarks.filter((b) => b.articleId !== article.id);
  data.comments = data.comments.filter((c) => c.articleId !== article.id);

  // Update house article count if applicable
  const house = (data.mediaHouses || []).find((m) => m.id === article.mediaId);
  if (house) {
    house.articlesCount = Math.max(0, (house.articlesCount || 1) - 1);
    realtimeHub.broadcast('mediaHouse:updated', house);
  }

  db.save();
  realtimeHub.broadcast('article:deleted', { articleId: req.params.id, categoryId: article.categoryId });
  return res.json({ message: 'Article supprimé avec succès.' });
});

// Toggle Like with rate limiting
articlesRouter.post('/:id/like', requireAuth, likesRateLimiter, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }

  const existingIndex = data.likes.findIndex((l) => l.userId === user.id && l.articleId === article.id);
  let liked = false;

  if (existingIndex !== -1) {
    data.likes.splice(existingIndex, 1);
    article.likesCount = Math.max(0, article.likesCount - 1);
    liked = false;
  } else {
    data.likes.push({
      id: `lk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      articleId: article.id,
      createdAt: new Date().toISOString(),
    });
    article.likesCount += 1;
    liked = true;

    // Send notification to author if not self
    if (article.authorId !== user.id) {
      const likeNotif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: article.authorId,
        type: 'like' as const,
        title: 'Nouveau like',
        message: `${user.name} a aimé votre article : "${article.title.substring(0, 45)}..."`,
        link: `/article/${article.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      data.notifications.unshift(likeNotif);
      realtimeHub.broadcastToUser(article.authorId, 'notification:new', likeNotif);
    }
  }

  db.save();
  realtimeHub.broadcast('article:liked', { articleId: article.id, likesCount: article.likesCount });
  return res.json({ liked, likesCount: article.likesCount });
});

// Toggle Bookmark
articlesRouter.post('/:id/bookmark', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }

  const existingIndex = data.bookmarks.findIndex((b) => b.userId === user.id && b.articleId === article.id);
  let bookmarked = false;

  if (existingIndex !== -1) {
    data.bookmarks.splice(existingIndex, 1);
    bookmarked = false;
  } else {
    data.bookmarks.push({
      id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      articleId: article.id,
      createdAt: new Date().toISOString(),
    });
    bookmarked = true;
  }

  db.save();
  return res.json({ bookmarked });
});

// Get Comments for an article
articlesRouter.get('/:id/comments', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const articleComments = data.comments.filter((c) => c.articleId === req.params.id);

  // Group comments into root comments and their replies
  const rootComments: Comment[] = [];
  const repliesMap: Record<string, Comment[]> = {};

  for (const c of articleComments) {
    const isLiked = req.user ? data.commentLikes.some((cl) => cl.userId === req.user!.id && cl.commentId === c.id) : false;
    const enrichedComment = { ...c, isLiked };

    if (c.parentId) {
      if (!repliesMap[c.parentId]) {
        repliesMap[c.parentId] = [];
      }
      repliesMap[c.parentId].push(enrichedComment);
    } else {
      rootComments.push(enrichedComment);
    }
  }

  // Attach replies
  const tree = rootComments.map((root) => ({
    ...root,
    replies: repliesMap[root.id] || [],
  }));

  // Sort root comments latest first
  tree.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ comments: tree, total: articleComments.length });
});

// Post a comment or reply with anti-spam, duplicate check, and rate limiting
articlesRouter.post('/:id/comments', requireAuth, commentsRateLimiter, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }

  const { content, parentId } = req.body;
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Le commentaire ne peut pas être vide.' });
  }

  const cleanContent = sanitizeText(content, { maxLength: 1200 });
  if (cleanContent.length < 2) {
    return res.status(400).json({ error: 'Le commentaire doit contenir au moins 2 caractères valides.' });
  }
  if (cleanContent.length > 1200) {
    return res.status(400).json({ error: 'Le commentaire ne peut pas dépasser 1200 caractères.' });
  }

  // Anti-spam checks: repetitive gibberish or duplicate comment
  if (isRepetitiveSpam(cleanContent)) {
    return res.status(400).json({ error: 'Le contenu du commentaire semble répétitif ou suspect.' });
  }

  if (checkDuplicateComment(user.id, article.id, cleanContent)) {
    return res.status(429).json({
      error: 'Vous avez déjà soumis ce même commentaire récemment. Les doublons sont bloqués.',
    });
  }

  const now = new Date().toISOString();
  const newComment: Comment = {
    id: `com_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    articleId: article.id,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    userRole: user.role,
    isUserVerified: !!user.isVerified,
    parentId: parentId || undefined,
    content: cleanContent,
    likesCount: 0,
    createdAt: now,
  };

  data.comments.push(newComment);
  article.commentsCount += 1;

  // If reply, notify parent comment author; otherwise notify article author
  if (parentId) {
    const parentComment = data.comments.find((c) => c.id === parentId);
    if (parentComment && parentComment.userId !== user.id) {
      const replyNotif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: parentComment.userId,
        type: 'comment' as const,
        title: 'Réponse à votre commentaire',
        message: `${user.name} a répondu à votre commentaire.`,
        link: `/article/${article.id}`,
        read: false,
        createdAt: now,
      };
      data.notifications.unshift(replyNotif);
      realtimeHub.broadcastToUser(parentComment.userId, 'notification:new', replyNotif);
    }
  } else if (article.authorId !== user.id) {
    const commentNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: article.authorId,
      type: 'comment' as const,
      title: 'Nouveau commentaire',
      message: `${user.name} a commenté votre article "${article.title.substring(0, 45)}...".`,
      link: `/article/${article.id}`,
      read: false,
      createdAt: now,
    };
    data.notifications.unshift(commentNotif);
    realtimeHub.broadcastToUser(article.authorId, 'notification:new', commentNotif);
  }

  db.save();
  // Real-time broadcast of new comment and updated count
  realtimeHub.broadcast('comment:created', {
    articleId: article.id,
    comment: newComment,
    commentsCount: article.commentsCount,
  });
  realtimeHub.broadcast('article:updated', { ...article });
  return res.status(201).json({ message: 'Commentaire publié avec succès', comment: newComment });
});

// Edit comment
articlesRouter.put('/:id/comments/:commentId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const comment = data.comments.find((c) => c.id === req.params.commentId && c.articleId === req.params.id);

  if (!comment) {
    return res.status(404).json({ error: 'Commentaire introuvable.' });
  }

  // Security check: Only comment author can edit
  if (comment.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres commentaires.' });
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Le commentaire ne peut pas être vide.' });
  }

  const trimmed = content.trim();
  if (trimmed.length < 2) {
    return res.status(400).json({ error: 'Le commentaire doit contenir au moins 2 caractères.' });
  }
  if (trimmed.length > 1200) {
    return res.status(400).json({ error: 'Le commentaire ne peut pas dépasser 1200 caractères.' });
  }

  comment.content = trimmed;
  comment.isEdited = true;
  comment.updatedAt = new Date().toISOString();

  db.save();
  realtimeHub.broadcast('comment:updated', { articleId: req.params.id, comment });
  return res.json({ message: 'Commentaire mis à jour.', comment });
});

// Delete comment
articlesRouter.delete('/:id/comments/:commentId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const article = data.articles.find((a) => a.id === req.params.id);
  const commentIndex = data.comments.findIndex((c) => c.id === req.params.commentId && c.articleId === req.params.id);

  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Commentaire introuvable.' });
  }

  const targetComment = data.comments[commentIndex];

  // Allowed to delete: author of comment, author of article, or admin
  const isAllowed =
    targetComment.userId === user.id ||
    (article && article.authorId === user.id) ||
    user.role === 'admin';

  if (!isAllowed) {
    return res.status(403).json({ error: 'Vous n’êtes pas autorisé à supprimer ce commentaire.' });
  }

  // Also remove child replies if this was a root comment
  const repliesToDelete = data.comments.filter((c) => c.parentId === targetComment.id);
  const totalDeletedCount = 1 + repliesToDelete.length;

  data.comments = data.comments.filter(
    (c) => c.id !== targetComment.id && c.parentId !== targetComment.id
  );

  // Clean comment likes
  data.commentLikes = data.commentLikes.filter(
    (cl) => cl.commentId !== targetComment.id && !repliesToDelete.some((r) => r.id === cl.commentId)
  );

  if (article) {
    article.commentsCount = Math.max(0, article.commentsCount - totalDeletedCount);
  }

  db.save();
  realtimeHub.broadcast('comment:deleted', {
    articleId: req.params.id,
    commentId: targetComment.id,
    commentsCount: article ? article.commentsCount : 0,
  });
  if (article) {
    realtimeHub.broadcast('article:updated', { ...article });
  }
  return res.json({
    message: 'Commentaire supprimé.',
    commentsCount: article ? article.commentsCount : 0,
  });
});

// Toggle Like on a Comment
articlesRouter.post('/:id/comments/:commentId/like', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const comment = data.comments.find((c) => c.id === req.params.commentId && c.articleId === req.params.id);

  if (!comment) {
    return res.status(404).json({ error: 'Commentaire introuvable.' });
  }

  const existingIndex = data.commentLikes.findIndex(
    (cl) => cl.userId === user.id && cl.commentId === comment.id
  );

  let liked = false;
  if (existingIndex !== -1) {
    data.commentLikes.splice(existingIndex, 1);
    comment.likesCount = Math.max(0, comment.likesCount - 1);
    liked = false;
  } else {
    data.commentLikes.push({
      id: `clk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      commentId: comment.id,
      createdAt: new Date().toISOString(),
    });
    comment.likesCount += 1;
    liked = true;
  }

  db.save();
  realtimeHub.broadcast('comment:liked', {
    articleId: req.params.id,
    commentId: comment.id,
    likesCount: comment.likesCount,
  });
  return res.json({ liked, likesCount: comment.likesCount });
});

// Report comment with rate limiting
articlesRouter.post('/:id/comments/:commentId/report', requireAuth, reportRateLimiter, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const comment = data.comments.find((c) => c.id === req.params.commentId && c.articleId === req.params.id);

  if (!comment) {
    return res.status(404).json({ error: 'Commentaire introuvable.' });
  }

  // Prevent duplicate pending reports by same user
  const existingReport = data.reports.find(
    (r) => r.reporterId === user.id && r.targetId === comment.id && ['pending', 'reviewing'].includes(r.status)
  );
  if (existingReport) {
    return res.status(400).json({ error: 'Vous avez déjà signalé ce commentaire. Votre signalement est en cours d’examen.' });
  }

  const { reason, details } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Veuillez préciser le motif du signalement.' });
  }

  const cleanReason = sanitizeText(reason, { maxLength: 100, allowNewlines: false });
  const cleanDetails = details ? sanitizeText(details, { maxLength: 500 }) : undefined;

  const report = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reporterId: user.id,
    reporterName: user.name,
    targetType: 'comment' as const,
    targetId: comment.id,
    targetTitle: `Commentaire de ${comment.userName}: "${comment.content.substring(0, 40)}..."`,
    reason: cleanReason,
    details: cleanDetails,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  data.reports.unshift(report);
  db.save();

  return res.json({ message: 'Le commentaire a été signalé à l’équipe de modération.' });
});

// Report article with rate limiting
articlesRouter.post('/:id/report', requireAuth, reportRateLimiter, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }

  // Prevent duplicate pending reports by same user
  const existingReport = data.reports.find(
    (r) => r.reporterId === user.id && r.targetId === article.id && ['pending', 'reviewing'].includes(r.status)
  );
  if (existingReport) {
    return res.status(400).json({ error: 'Vous avez déjà signalé cet article. Votre signalement est en cours d’examen.' });
  }

  const { reason, details } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Veuillez sélectionner un motif de signalement.' });
  }

  const cleanReason = sanitizeText(reason, { maxLength: 100, allowNewlines: false });
  const cleanDetails = details ? sanitizeText(details, { maxLength: 500 }) : undefined;

  const report = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reporterId: user.id,
    reporterName: user.name,
    targetType: 'article' as const,
    targetId: article.id,
    targetTitle: article.title,
    reason: cleanReason,
    details: cleanDetails,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  data.reports.unshift(report);
  db.save();

  return res.json({ message: 'Votre signalement a été transmis à l’équipe de modération.' });
});
