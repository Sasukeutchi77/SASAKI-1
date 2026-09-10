import { Router, Response } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../auth';
import { VerificationRequest, Report } from '../../src/types';
import { reportRateLimiter, likesRateLimiter } from '../security/rateLimiter';
import { sanitizeText, isValidUrl } from '../security/sanitizer';
import { isMasterAdmin } from '../config/masterAccounts';

export const usersRouter = Router();

// 1. List verified or notable journalists & media
usersRouter.get('/journalists', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const journalists = data.users.filter(
    (u) => (u.role === 'journalist' || u.role === 'admin') && u.status === 'active'
  );

  const currentUserId = req.user?.id;
  let hasChanges = false;

  const result = journalists.map((j) => {
    const followers = data.follows.filter((f) => f.targetId === j.id);
    const isFollowing = currentUserId
      ? data.follows.some((f) => f.followerId === currentUserId && f.targetId === j.id)
      : false;
    const followersCount = j.followersCount ? Math.max(j.followersCount, followers.length) : followers.length;

    // Automatic verification for journalists reaching >= 50 followers
    if ((j.role === 'journalist' || j.role === 'admin') && followersCount >= 50 && !j.isVerified) {
      j.isVerified = true;
      j.verificationStatus = 'approved';
      hasChanges = true;
      data.articles.forEach((a) => {
        if (a.authorId === j.id) {
          a.isAuthorVerified = true;
        }
      });
    }

    const { passwordHash, passwordSalt, ...safe } = j;
    return {
      ...safe,
      followersCount,
      isFollowing,
    };
  });

  if (hasChanges) {
    db.save();
  }

  return res.json({ journalists: result });
});

// Top 7 Journalists by Popularity
usersRouter.get(['/top-7-journalists', '/top-journalists'], (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const currentUserId = req.user?.id;

  const journalists = data.users.filter(
    (u) => (u.role === 'journalist' || u.role === 'admin') && u.status === 'active'
  );

  const rankedJournalists = journalists
    .map((j) => {
      const articles = data.articles.filter(
        (a) =>
          a.status === 'published' &&
          (a.authorId === j.id || (a.authorName && a.authorName.toLowerCase() === j.name.toLowerCase()))
      );

      const totalViews = articles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
      const totalLikes = articles.reduce((sum, a) => sum + (a.likesCount || 0), 0);
      const totalComments = articles.reduce((sum, a) => sum + (a.commentsCount || 0), 0);

      const follows = data.follows.filter((f) => f.targetId === j.id);
      const followersCount = j.followersCount ? Math.max(j.followersCount, follows.length) : follows.length;
      const isFollowing = currentUserId
        ? data.follows.some((f) => f.followerId === currentUserId && f.targetId === j.id)
        : false;

      const articlesCount = Math.max(j.articlesCount || 0, articles.length);

      // Popularity score formula
      const popularityScore =
        followersCount * 15 +
        articlesCount * 20 +
        totalViews * 1 +
        totalLikes * 6 +
        totalComments * 3 +
        (j.isVerified ? 100 : 0);

      // Most recent published article
      const sortedArticles = [...articles].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const recentArticle = sortedArticles[0];

      const { passwordHash, passwordSalt, ...safe } = j;
      return {
        ...safe,
        articlesCount,
        followersCount,
        isFollowing,
        totalViews,
        totalLikes,
        totalComments,
        popularityScore,
        recentArticleTitle: recentArticle?.title,
        recentArticleId: recentArticle?.id,
      };
    })
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 7)
    .map((j, index) => {
      const rank = index + 1;
      let badgeTier: 'gold' | 'silver' | 'bronze' | 'elite' = 'elite';
      let badgeLabel = 'Plume d’Élite';
      let trend: 'up' | 'stable' | 'hot' = 'stable';

      if (rank === 1) {
        badgeTier = 'gold';
        badgeLabel = 'Or • Plume Suprême';
        trend = 'hot';
      } else if (rank === 2) {
        badgeTier = 'silver';
        badgeLabel = 'Argent • Grand Enquêteur';
        trend = 'up';
      } else if (rank === 3) {
        badgeTier = 'bronze';
        badgeLabel = 'Bronze • Reporter d’Honneur';
        trend = 'up';
      } else {
        badgeTier = 'elite';
        badgeLabel = `Rang #${rank} • Reporter de Terrain`;
        trend = index % 2 === 0 ? 'up' : 'stable';
      }

      return {
        ...j,
        rank,
        badgeTier,
        badgeLabel,
        trend,
      };
    });

  return res.json({
    topJournalists: rankedJournalists,
    total: rankedJournalists.length,
    lastUpdated: new Date().toISOString(),
  });
});

// 2. Bookmarks list of current user
usersRouter.get('/me/bookmarks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const userBookmarkIds = data.bookmarks.filter((b) => b.userId === req.user!.id).map((b) => b.articleId);
  const articles = data.articles.filter((a) => userBookmarkIds.includes(a.id) && a.status === 'published');

  return res.json({ bookmarks: articles });
});

// 3. Notifications list of current user
usersRouter.get('/me/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const notifs = data.notifications.filter((n) => n.userId === req.user!.id);
  notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ notifications: notifs });
});

// 4. Mark single notification read
usersRouter.put('/me/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const notif = data.notifications.find((n) => n.id === req.params.id && n.userId === req.user!.id);

  if (notif) {
    notif.read = true;
    db.save();
  }
  return res.json({ success: true });
});

// 5. Mark all notifications read
usersRouter.put('/me/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  data.notifications.forEach((n) => {
    if (n.userId === req.user!.id) {
      n.read = true;
    }
  });
  db.save();
  return res.json({ success: true });
});

// 6. Request journalist verification badge with rate limiting & sanitization
usersRouter.post('/me/request-verification', requireAuth, reportRateLimiter, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;

  if (user.isVerified) {
    return res.status(400).json({ error: 'Votre profil est déjà vérifié avec badge officiel.' });
  }

  const { mediaName, pressCardNumber, motivation, documentUrl } = req.body;
  if (!pressCardNumber || !motivation) {
    return res.status(400).json({ error: 'Le numéro de carte de presse et votre motivation sont obligatoires.' });
  }

  const cleanCardNumber = sanitizeText(pressCardNumber, { maxLength: 50, allowNewlines: false });
  const cleanMotivation = sanitizeText(motivation, { maxLength: 1000 });
  const cleanMediaName = mediaName ? sanitizeText(mediaName, { maxLength: 100, allowNewlines: false }) : (user.mediaName || user.name);

  if (cleanCardNumber.length < 3) {
    return res.status(400).json({ error: 'Le numéro de carte de presse est invalide.' });
  }

  if (cleanMotivation.length < 15) {
    return res.status(400).json({ error: 'Veuillez rédiger une motivation plus détaillée (minimum 15 caractères).' });
  }

  let cleanDocUrl: string | undefined = undefined;
  if (documentUrl) {
    if (isValidUrl(documentUrl)) {
      cleanDocUrl = documentUrl.trim();
    } else {
      return res.status(400).json({ error: 'L’URL du document justificatif est invalide.' });
    }
  }

  // Check if pending already exists
  const existingPending = data.verificationRequests.find((r) => r.userId === user.id && r.status === 'pending');
  if (existingPending) {
    return res.status(400).json({ error: 'Une demande de vérification est déjà en cours d’examen.' });
  }

  const now = new Date().toISOString();
  const newRequest: VerificationRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    mediaName: cleanMediaName,
    pressCardNumber: cleanCardNumber,
    motivation: cleanMotivation,
    documentUrl: cleanDocUrl,
    status: 'pending',
    createdAt: now,
  };

  data.verificationRequests.unshift(newRequest);
  user.verificationStatus = 'pending';

  // Dispatch notification to Master Admin accounts
  const adminUsers = data.users.filter((u) => isMasterAdmin(u.email) || u.role === 'admin');
  adminUsers.forEach((adminUser) => {
    data.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: adminUser.id,
      type: 'system',
      title: "Nouvelle demande d'accréditation Journaliste",
      message: `${user.name} (${user.email}) a soumis une demande d'accréditation Journaliste. En attente de votre décision d'approbation.`,
      read: false,
      createdAt: now,
    });
  });

  db.save();

  return res.status(201).json({
    message: 'Votre demande d’accréditation a bien été transmise à l’administrateur principal pour examen officiel.',
    request: newRequest,
  });
});

// 7. Follow / Unfollow author or media with rate limiting
usersRouter.post('/:id/follow', requireAuth, likesRateLimiter, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const currentUserId = req.user!.id;
  const targetId = req.params.id;

  if (currentUserId === targetId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas vous suivre vous-même.' });
  }

  // 1. Check if target is a media house
  const targetHouse = (data.mediaHouses || []).find((h) => h.id === targetId || h.slug === targetId);
  if (targetHouse) {
    const existingIndex = data.follows.findIndex(
      (f) => f.followerId === currentUserId && f.targetId === targetHouse.id
    );

    let isFollowing = false;
    if (existingIndex !== -1) {
      data.follows.splice(existingIndex, 1);
      isFollowing = false;
    } else {
      data.follows.push({
        id: `flw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        followerId: currentUserId,
        targetId: targetHouse.id,
        createdAt: new Date().toISOString(),
      });
      isFollowing = true;

      if (targetHouse.ownerId && targetHouse.ownerId !== currentUserId) {
        data.notifications.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: targetHouse.ownerId,
          type: 'follow',
          title: 'Nouvel abonné pour votre Maison de Presse',
          message: `${req.user!.name} a commencé à suivre votre maison de presse "${targetHouse.name}".`,
          link: `/houses/${targetHouse.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const followersCount = data.follows.filter((f) => f.targetId === targetHouse.id).length;
    const membersCount = targetHouse.members ? targetHouse.members.length : (targetHouse.journalistsCount || 1);

    // Auto-verify media house if reaching 100 followers OR 100 members
    let newlyVerified = false;
    if ((followersCount >= 100 || membersCount >= 100) && !targetHouse.isVerified) {
      targetHouse.isVerified = true;
      newlyVerified = true;

      if (targetHouse.ownerId) {
        data.notifications.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: targetHouse.ownerId,
          type: 'system',
          title: 'Maison de Presse Certifiée (Badge Bleu TikTok) !',
          message: `Félicitations ! Votre maison de presse "${targetHouse.name}" a atteint 100 abonnés. Elle a automatiquement obtenu le badge bleu officiel de certification !`,
          link: `/houses/${targetHouse.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    db.save();
    return res.json({ isFollowing, followersCount, isVerified: targetHouse.isVerified, newlyVerified });
  }

  // 2. Check if target is a user / journalist
  const targetUser = data.users.find((u) => u.id === targetId || (u.mediaId && u.mediaId === targetId));
  if (!targetUser) {
    return res.status(404).json({ error: 'Profil introuvable.' });
  }

  const existingIndex = data.follows.findIndex(
    (f) => f.followerId === currentUserId && (f.targetId === targetUser.id || (targetUser.mediaId && f.targetId === targetUser.mediaId))
  );

  let isFollowing = false;
  if (existingIndex !== -1) {
    data.follows.splice(existingIndex, 1);
    isFollowing = false;
  } else {
    data.follows.push({
      id: `flw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      followerId: currentUserId,
      targetId: targetUser.id,
      createdAt: new Date().toISOString(),
    });
    isFollowing = true;

    // Send notification
    data.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUser.id,
      type: 'follow',
      title: 'Nouvel abonné',
      message: `${req.user!.name} a commencé à vous suivre.`,
      link: `/profile/${req.user!.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  const dbFollowersCount = data.follows.filter((f) => f.targetId === targetUser.id).length;
  const effectiveFollowersCount = targetUser.followersCount ? Math.max(targetUser.followersCount, dbFollowersCount) : dbFollowersCount;

  // Auto-verify journalist reaching 50 followers
  let newlyVerified = false;
  if ((targetUser.role === 'journalist' || targetUser.role === 'admin') && effectiveFollowersCount >= 50 && !targetUser.isVerified) {
    targetUser.isVerified = true;
    targetUser.verificationStatus = 'approved';
    newlyVerified = true;
    data.articles.forEach((a) => {
      if (a.authorId === targetUser.id) {
        a.isAuthorVerified = true;
      }
    });

    data.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUser.id,
      type: 'system',
      title: 'Badge Bleu Obtenu (50 Abonnés) !',
      message: 'Félicitations ! Vous venez d’atteindre le seuil de 50 abonnés. Votre profil est désormais officiellement certifié avec le badge bleu TikTok !',
      link: `/profile/${targetUser.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  // Check media house affiliation auto-verification
  if (targetUser.mediaId) {
    const house = (data.mediaHouses || []).find((h) => h.id === targetUser.mediaId);
    if (house) {
      const houseFollowers = data.follows.filter((f) => f.targetId === house.id || (house.ownerId && f.targetId === house.ownerId)).length;
      const membersCount = house.members ? house.members.length : (house.journalistsCount || 1);
      if ((houseFollowers >= 100 || membersCount >= 100) && !house.isVerified) {
        house.isVerified = true;
        if (house.ownerId) {
          data.notifications.unshift({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: house.ownerId,
            type: 'system',
            title: 'Maison de Presse Certifiée (Badge Bleu) !',
            message: `Félicitations ! La maison de presse "${house.name}" a atteint 100 abonnés. Elle reçoit le badge bleu certifié officiel !`,
            link: `/houses/${house.id}`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  db.save();

  return res.json({ isFollowing, followersCount: effectiveFollowersCount, isVerified: targetUser.isVerified, newlyVerified });
});

// 8. Public profile by id (placed last so it doesn't intercept /journalists or /me/*)
usersRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = data.users.find((u) => u.id === req.params.id);

  if (!user || user.status === 'suspended') {
    return res.status(404).json({ error: 'Utilisateur ou média introuvable.' });
  }

  const dbFollowersCount = data.follows.filter((f) => f.targetId === user.id || (user.mediaId && f.targetId === user.mediaId)).length;
  const followingCount = data.follows.filter((f) => f.followerId === user.id).length;
  const isFollowing = req.user ? data.follows.some((f) => f.followerId === req.user!.id && (f.targetId === user.id || (user.mediaId && f.targetId === user.mediaId))) : false;
  const effectiveFollowersCount = user.followersCount ? Math.max(user.followersCount, dbFollowersCount) : dbFollowersCount;

  // Auto-verify if journalist has >= 50 followers
  if ((user.role === 'journalist' || user.role === 'admin') && effectiveFollowersCount >= 50 && !user.isVerified) {
    user.isVerified = true;
    user.verificationStatus = 'approved';
    data.articles.forEach((a) => {
      if (a.authorId === user.id) a.isAuthorVerified = true;
    });
    db.save();
  }

  // Articles written by this author/media (only published for public)
  const isSelfOrAdmin = req.user && (req.user.id === user.id || req.user.role === 'admin');
  const userArticles = data.articles.filter((a) => {
    if (a.authorId !== user.id && (!user.mediaId || a.mediaId !== user.mediaId)) return false;
    return isSelfOrAdmin ? a.status !== 'deleted' : a.status === 'published';
  });

  const { passwordHash, passwordSalt, ...safeUser } = user;

  return res.json({
    user: {
      ...safeUser,
      followersCount: effectiveFollowersCount,
      followingCount,
      articlesCount: userArticles.length,
      isFollowing,
    },
    articles: userArticles,
  });
});

// 9. Report user profile with rate limiting & sanitization
usersRouter.post('/:id/report', requireAuth, reportRateLimiter, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const targetUser = data.users.find((u) => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  if (targetUser.id === user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas signaler votre propre profil.' });
  }

  // Prevent duplicate pending reports
  const existingReport = data.reports.find(
    (r) => r.reporterId === user.id && r.targetId === targetUser.id && ['pending', 'reviewing'].includes(r.status)
  );
  if (existingReport) {
    return res.status(400).json({ error: 'Vous avez déjà signalé ce profil. Votre signalement est en cours d’examen.' });
  }

  const { reason, details } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Veuillez préciser le motif du signalement.' });
  }

  const cleanReason = sanitizeText(reason, { maxLength: 100, allowNewlines: false });
  const cleanDetails = details ? sanitizeText(details, { maxLength: 500 }) : undefined;

  const report: Report = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reporterId: user.id,
    reporterName: user.name,
    targetType: 'user',
    targetId: targetUser.id,
    targetTitle: `Profil de ${targetUser.name} (${targetUser.role})`,
    reason: cleanReason,
    details: cleanDetails,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  data.reports.unshift(report);
  db.save();

  return res.json({ message: 'Le profil a été signalé à l’équipe de modération.' });
});

