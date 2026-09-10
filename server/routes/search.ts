import { Router, Response } from 'express';
import { db } from '../db';
import { AuthenticatedRequest } from '../auth';
import { Article, Category, User } from '../../src/types';
import { isMasterAdmin } from '../config/masterAccounts';

export const searchRouter = Router();

// Helper: Filter date
function matchesDate(dateIso: string, range: string): boolean {
  if (!range || range === 'all') return true;
  const itemDate = new Date(dateIso).getTime();
  const now = Date.now();
  const diffHours = (now - itemDate) / (1000 * 60 * 60);

  if (range === 'today') return diffHours <= 24;
  if (range === 'week') return diffHours <= 24 * 7;
  if (range === 'month') return diffHours <= 24 * 30;
  if (range === 'year') return diffHours <= 24 * 365;
  return true;
}

// 1. GLOBAL MULTI-ENTITY SEARCH
searchRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const currentUserId = req.user?.id;
  const q = String(req.query.q || '').toLowerCase().trim();
  const type = String(req.query.type || 'all').toLowerCase().trim(); // 'all' | 'articles' | 'journalists' | 'media' | 'categories' | 'tags'
  const categoryFilter = String(req.query.category || '').trim();
  const tagFilter = String(req.query.tag || '').replace(/^#/, '').toLowerCase().trim();
  const dateFilter = String(req.query.date || 'all').toLowerCase().trim();
  const sortMode = String(req.query.sort || 'latest').toLowerCase().trim(); // 'latest' | 'popular' | 'views' | 'likes'
  const authorIdFilter = String(req.query.authorId || '').trim();
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));

  // --- 1. Articles Search ---
  let matchingArticles = data.articles.filter((a) => a.status === 'published');

  // Text search on articles
  if (q) {
    matchingArticles = matchingArticles.filter((a) => {
      const inTitle = a.title.toLowerCase().includes(q);
      const inSummary = a.summary ? a.summary.toLowerCase().includes(q) : false;
      const inContent = a.content.toLowerCase().includes(q);
      const inAuthor = a.authorName.toLowerCase().includes(q);
      const inMedia = a.mediaName ? a.mediaName.toLowerCase().includes(q) : false;
      const inCategory = a.categoryName ? a.categoryName.toLowerCase().includes(q) : false;
      const inTags = a.tags ? a.tags.some((t) => t.toLowerCase().includes(q)) : false;
      return inTitle || inSummary || inContent || inAuthor || inMedia || inCategory || inTags;
    });
  }

  // Category filter
  if (categoryFilter && categoryFilter !== 'all') {
    const cat = data.categories.find((c) => c.id === categoryFilter || c.slug === categoryFilter);
    if (cat) {
      matchingArticles = matchingArticles.filter((a) => a.categoryId === cat.id);
    }
  }

  // Tag filter
  if (tagFilter) {
    matchingArticles = matchingArticles.filter(
      (a) => a.tags && a.tags.some((t) => t.toLowerCase().replace(/^#/, '').trim() === tagFilter)
    );
  }

  // Author filter
  if (authorIdFilter) {
    matchingArticles = matchingArticles.filter(
      (a) => a.authorId === authorIdFilter || (a.mediaId && a.mediaId === authorIdFilter)
    );
  }

  // Date filter
  if (dateFilter && dateFilter !== 'all') {
    matchingArticles = matchingArticles.filter((a) => matchesDate(a.createdAt, dateFilter));
  }

  // Sorting
  const now = Date.now();
  if (sortMode === 'popular') {
    matchingArticles.sort((a, b) => {
      const ageHoursA = Math.max(0.1, (now - new Date(a.createdAt).getTime()) / 3600000);
      const ageHoursB = Math.max(0.1, (now - new Date(b.createdAt).getTime()) / 3600000);
      const scoreA = (a.viewsCount + a.likesCount * 4 + a.commentsCount * 6) / Math.pow(ageHoursA + 2, 1.25);
      const scoreB = (b.viewsCount + b.likesCount * 4 + b.commentsCount * 6) / Math.pow(ageHoursB + 2, 1.25);
      return scoreB - scoreA;
    });
  } else if (sortMode === 'views') {
    matchingArticles.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
  } else if (sortMode === 'likes') {
    matchingArticles.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else {
    // Default: latest
    matchingArticles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const totalArticles = matchingArticles.length;
  const startIndex = (page - 1) * limit;
  const paginatedArticles = matchingArticles.slice(startIndex, startIndex + limit);

  const enrichedArticles = paginatedArticles.map((art) => {
    const isLiked = currentUserId ? data.likes.some((l) => l.userId === currentUserId && l.articleId === art.id) : false;
    const isBookmarked = currentUserId ? data.bookmarks.some((b) => b.userId === currentUserId && b.articleId === art.id) : false;
    return {
      ...art,
      isLiked,
      isBookmarked,
    };
  });

  // --- 2. Journalists Search ---
  const activeJournalists = data.users.filter(
    (u) => (u.role === 'journalist' || u.accountType === 'journalist') && u.status === 'active'
  );

  let matchingJournalists = activeJournalists;
  if (q) {
    matchingJournalists = matchingJournalists.filter((j) => {
      const inName = j.name.toLowerCase().includes(q);
      const inUsername = j.username ? j.username.toLowerCase().includes(q) : false;
      const inBio = j.bio ? j.bio.toLowerCase().includes(q) : false;
      const inMedia = j.mediaName ? j.mediaName.toLowerCase().includes(q) : false;
      return inName || inUsername || inBio || inMedia;
    });
  }

  const enrichedJournalists = matchingJournalists.map((j) => {
    const followers = data.follows.filter((f) => f.targetId === j.id);
    const isFollowing = currentUserId
      ? data.follows.some((f) => f.followerId === currentUserId && f.targetId === j.id)
      : false;
    const authorArticles = data.articles.filter((a) => a.authorId === j.id && a.status === 'published');
    const { passwordHash, passwordSalt, ...safe } = j;
    return {
      ...safe,
      followersCount: j.followersCount ? Math.max(j.followersCount, followers.length) : followers.length,
      articlesCount: authorArticles.length,
      isFollowing,
    };
  });

  // --- 3. Media Houses Search ---
  // Aggregate media entities from users that have mediaName or mediaId, plus articles published with mediaName
  const mediaMap = new Map<string, {
    id: string;
    name: string;
    logo?: string;
    bio?: string;
    isVerified: boolean;
    journalists: Set<string>;
    articlesCount: number;
    followersCount: number;
    isFollowing: boolean;
  }>();

  // From users
  data.users.forEach((u) => {
    if (u.mediaName) {
      const key = u.mediaName.trim();
      const mediaId = u.mediaId || `media_${key.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (!mediaMap.has(key)) {
        mediaMap.set(key, {
          id: mediaId,
          name: key,
          logo: u.avatar,
          bio: u.bio || `Média et organe de presse accrédité`,
          isVerified: !!u.isVerified,
          journalists: new Set([u.id]),
          articlesCount: 0,
          followersCount: 0,
          isFollowing: false,
        });
      } else {
        const item = mediaMap.get(key)!;
        item.journalists.add(u.id);
        if (u.isVerified) item.isVerified = true;
      }
    }
  });

  // Calculate article counts and follower counts for media
  mediaMap.forEach((val, key) => {
    const count = data.articles.filter(
      (a) => a.status === 'published' && (a.mediaName?.toLowerCase() === key.toLowerCase() || a.mediaId === val.id)
    ).length;
    val.articlesCount = count;

    const followers = data.follows.filter((f) => f.targetId === val.id);
    val.followersCount = followers.length;
    val.isFollowing = currentUserId ? data.follows.some((f) => f.followerId === currentUserId && f.targetId === val.id) : false;
  });

  let matchingMedia = Array.from(mediaMap.values());
  if (q) {
    matchingMedia = matchingMedia.filter((m) => {
      const inName = m.name.toLowerCase().includes(q);
      const inBio = m.bio ? m.bio.toLowerCase().includes(q) : false;
      return inName || inBio;
    });
  }

  const isGlobalAdmin = req.user ? (req.user.role === 'admin' || (req.user.email && isMasterAdmin(req.user.email))) : false;
  const serializedMedia = matchingMedia.map((m) => {
    const isMember = currentUserId ? m.journalists.has(currentUserId) : false;
    const canSee = isMember || isGlobalAdmin;
    return {
      ...m,
      journalistsCount: canSee ? m.journalists.size : undefined,
      journalists: undefined,
    };
  });

  // --- 4. Categories Search ---
  let matchingCategories = data.categories.map((c) => {
    const count = data.articles.filter((a) => a.categoryId === c.id && a.status === 'published').length;
    return {
      ...c,
      articleCount: count,
    };
  });

  if (q) {
    matchingCategories = matchingCategories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }

  // --- 5. Tags Search & Extraction ---
  // Aggregate real tags with published article counts
  const tagCountMap = new Map<string, number>();
  data.articles.forEach((a) => {
    if (a.status === 'published' && a.tags && Array.isArray(a.tags)) {
      a.tags.forEach((rawTag) => {
        const clean = rawTag.replace(/^#/, '').trim();
        if (clean) {
          tagCountMap.set(clean, (tagCountMap.get(clean) || 0) + 1);
        }
      });
    }
  });

  let allTags = Array.from(tagCountMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  if (q) {
    allTags = allTags.filter((t) => t.tag.toLowerCase().includes(q));
  }

  return res.json({
    query: q,
    type,
    totalArticles,
    totalJournalists: enrichedJournalists.length,
    totalMedia: serializedMedia.length,
    totalCategories: matchingCategories.length,
    totalTags: allTags.length,
    articles: {
      items: enrichedArticles,
      total: totalArticles,
      page,
      limit,
      hasMore: startIndex + limit < totalArticles,
    },
    journalists: {
      items: enrichedJournalists.slice(0, type === 'journalists' ? 50 : 6),
      total: enrichedJournalists.length,
    },
    media: {
      items: serializedMedia.slice(0, type === 'media' ? 50 : 6),
      total: serializedMedia.length,
    },
    categories: {
      items: matchingCategories.slice(0, type === 'categories' ? 50 : 6),
      total: matchingCategories.length,
    },
    tags: {
      items: allTags.slice(0, type === 'tags' ? 100 : 15),
      total: allTags.length,
    },
  });
});

// 2. INSTANT SEARCH SUGGESTIONS (FAST FOR AUTOCOMPLETE)
searchRouter.get('/suggestions', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const q = String(req.query.q || '').toLowerCase().trim();

  if (!q) {
    return res.json({
      articles: [],
      journalists: [],
      media: [],
      categories: [],
      tags: [],
    });
  }

  // Articles suggestions (top 4 matching title)
  const articles = data.articles
    .filter((a) => a.status === 'published' && (a.title.toLowerCase().includes(q) || (a.summary && a.summary.toLowerCase().includes(q))))
    .slice(0, 4)
    .map((a) => ({
      id: a.id,
      title: a.title,
      categoryName: a.categoryName,
      coverImage: a.coverImage,
      authorName: a.authorName,
    }));

  // Journalists suggestions (top 3)
  const journalists = data.users
    .filter((u) => u.role === 'journalist' && u.status === 'active' && u.name.toLowerCase().includes(q))
    .slice(0, 3)
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      mediaName: u.mediaName,
      isVerified: u.isVerified,
      role: u.role,
    }));

  // Media suggestions (top 3)
  const mediaNames = new Set<string>();
  data.articles.forEach((a) => {
    if (a.mediaName && a.mediaName.toLowerCase().includes(q)) {
      mediaNames.add(a.mediaName);
    }
  });
  data.users.forEach((u) => {
    if (u.mediaName && u.mediaName.toLowerCase().includes(q)) {
      mediaNames.add(u.mediaName);
    }
  });

  const media = Array.from(mediaNames).slice(0, 3).map((name) => {
    const userWithMedia = data.users.find((u) => u.mediaName?.toLowerCase() === name.toLowerCase());
    return {
      id: userWithMedia?.mediaId || userWithMedia?.id || `media_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name,
      logo: userWithMedia?.avatar,
      isVerified: !!userWithMedia?.isVerified,
    };
  });

  // Categories suggestions (top 3)
  const categories = data.categories
    .filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
    .slice(0, 3)
    .map((c) => {
      const count = data.articles.filter((a) => a.categoryId === c.id && a.status === 'published').length;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        articleCount: count,
      };
    });

  // Tags suggestions (top 5)
  const tagCountMap = new Map<string, number>();
  data.articles.forEach((a) => {
    if (a.status === 'published' && a.tags) {
      a.tags.forEach((t) => {
        const clean = t.replace(/^#/, '').trim();
        if (clean.toLowerCase().includes(q)) {
          tagCountMap.set(clean, (tagCountMap.get(clean) || 0) + 1);
        }
      });
    }
  });

  const tags = Array.from(tagCountMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return res.json({
    articles,
    journalists,
    media,
    categories,
    tags,
  });
});

// 3. DISCOVERY HUB (POPULAR, RECENT, TOP MEDIA & TAGS)
searchRouter.get('/discovery', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const currentUserId = req.user?.id;
  const publishedArticles = data.articles.filter((a) => a.status === 'published');
  const now = Date.now();

  // 1. Popular articles (time-decayed engagement)
  const popularArticles = [...publishedArticles]
    .sort((a, b) => {
      const ageHoursA = Math.max(0.1, (now - new Date(a.createdAt).getTime()) / 3600000);
      const ageHoursB = Math.max(0.1, (now - new Date(b.createdAt).getTime()) / 3600000);
      const scoreA = (a.viewsCount + a.likesCount * 3 + a.commentsCount * 5) / Math.pow(ageHoursA + 2, 1.2);
      const scoreB = (b.viewsCount + b.likesCount * 3 + b.commentsCount * 5) / Math.pow(ageHoursB + 2, 1.2);
      return scoreB - scoreA;
    })
    .slice(0, 6)
    .map((art) => ({
      ...art,
      isLiked: currentUserId ? data.likes.some((l) => l.userId === currentUserId && l.articleId === art.id) : false,
      isBookmarked: currentUserId ? data.bookmarks.some((b) => b.userId === currentUserId && b.articleId === art.id) : false,
    }));

  // 2. Recent articles
  const recentArticles = [...publishedArticles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map((art) => ({
      ...art,
      isLiked: currentUserId ? data.likes.some((l) => l.userId === currentUserId && l.articleId === art.id) : false,
      isBookmarked: currentUserId ? data.bookmarks.some((b) => b.userId === currentUserId && b.articleId === art.id) : false,
    }));

  // 3. Popular journalists
  const popularJournalists = data.users
    .filter((u) => u.role === 'journalist' && u.status === 'active')
    .map((j) => {
      const followers = data.follows.filter((f) => f.targetId === j.id);
      const articlesCount = publishedArticles.filter((a) => a.authorId === j.id).length;
      const isFollowing = currentUserId ? data.follows.some((f) => f.followerId === currentUserId && f.targetId === j.id) : false;
      const { passwordHash, passwordSalt, ...safe } = j;
      return {
        ...safe,
        followersCount: followers.length,
        articlesCount,
        isFollowing,
      };
    })
    .sort((a, b) => (b.followersCount || 0) + (b.articlesCount || 0) * 2 - ((a.followersCount || 0) + (a.articlesCount || 0) * 2))
    .slice(0, 6);

  // 4. Popular media
  const mediaMap = new Map<string, any>();
  data.users.forEach((u) => {
    if (u.mediaName) {
      const name = u.mediaName.trim();
      const mediaId = u.mediaId || `media_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (!mediaMap.has(name)) {
        const articlesCount = publishedArticles.filter(
          (a) => a.mediaName?.toLowerCase() === name.toLowerCase() || a.mediaId === mediaId
        ).length;
        const followers = data.follows.filter((f) => f.targetId === mediaId);
        const isFollowing = currentUserId ? data.follows.some((f) => f.followerId === currentUserId && f.targetId === mediaId) : false;

        mediaMap.set(name, {
          id: mediaId,
          name,
          logo: u.avatar,
          bio: u.bio || 'Organe d’information accrédité',
          isVerified: !!u.isVerified,
          articlesCount,
          followersCount: followers.length,
          isFollowing,
        });
      }
    }
  });

  const popularMedia = Array.from(mediaMap.values())
    .sort((a, b) => b.articlesCount * 3 + b.followersCount * 2 - (a.articlesCount * 3 + a.followersCount * 2))
    .slice(0, 6);

  // 5. Popular categories with real counts
  const popularCategories = data.categories
    .map((c) => ({
      ...c,
      articleCount: publishedArticles.filter((a) => a.categoryId === c.id).length,
    }))
    .sort((a, b) => b.articleCount - a.articleCount);

  // 6. Popular tags with real occurrence counts
  const tagCountMap = new Map<string, number>();
  publishedArticles.forEach((a) => {
    if (a.tags && Array.isArray(a.tags)) {
      a.tags.forEach((raw) => {
        const clean = raw.replace(/^#/, '').trim();
        if (clean) {
          tagCountMap.set(clean, (tagCountMap.get(clean) || 0) + 1);
        }
      });
    }
  });

  const popularTags = Array.from(tagCountMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return res.json({
    popularArticles,
    recentArticles,
    popularJournalists,
    popularMedia,
    popularCategories,
    popularTags,
    totalArticles: publishedArticles.length,
  });
});
