import { Router, Response } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../auth';
import { VerificationRequest, Report } from '../../src/types';
import { reportRateLimiter, likesRateLimiter } from '../security/rateLimiter';
import { sanitizeText, isValidUrl } from '../security/sanitizer';

export const usersRouter = Router();

// 1. List verified or notable journalists & media
usersRouter.get('/journalists', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const journalists = data.users.filter(
    (u) => (u.role === 'journalist' || u.role === 'admin') && u.status === 'active'
  );

  const currentUserId = req.user?.id;

  const result = journalists.map((j) => {
    const followers = data.follows.filter((f) => f.targetId === j.id);
    const isFollowing = currentUserId
      ? data.follows.some((f) => f.followerId === currentUserId && f.targetId === j.id)
      : false;
    const { passwordHash, passwordSalt, ...safe } = j;
    return {
      ...safe,
      followersCount: j.followersCount ? Math.max(j.followersCount, followers.length) : followers.length,
      isFollowing,
    };
  });

  return res.json({ journalists: result });
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
  db.save();

  return res.status(201).json({
    message: 'Votre demande de vérification a bien été soumise et sera examinée par l’administration.',
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

  const followersCount = data.follows.filter((f) => f.targetId === targetUser.id).length;
  db.save();

  return res.json({ isFollowing, followersCount });
});

// 8. Public profile by id (placed last so it doesn't intercept /journalists or /me/*)
usersRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = data.users.find((u) => u.id === req.params.id);

  if (!user || user.status === 'suspended') {
    return res.status(404).json({ error: 'Utilisateur ou média introuvable.' });
  }

  const followersCount = data.follows.filter((f) => f.targetId === user.id || (user.mediaId && f.targetId === user.mediaId)).length;
  const followingCount = data.follows.filter((f) => f.followerId === user.id).length;
  const isFollowing = req.user ? data.follows.some((f) => f.followerId === req.user!.id && (f.targetId === user.id || (user.mediaId && f.targetId === user.mediaId))) : false;

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
      followersCount: user.followersCount ? Math.max(user.followersCount, followersCount) : followersCount,
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

