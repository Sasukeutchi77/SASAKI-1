import { Router, Response } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAdmin } from '../auth';
import { AdminLog, MediaHouse, Category, Notification } from '../../src/types';
import { setFirebaseCustomUserClaims } from '../firebaseAdmin';
import { isMasterAdmin, MASTER_ADMIN_EMAILS } from '../config/masterAccounts';
import { realtimeHub } from '../realtime';

export const adminRouter = Router();

// All admin routes strictly require role === 'admin'
adminRouter.use(requireAdmin);

// Helper to record administrative actions into immutable adminLogs
function logAction(
  req: AuthenticatedRequest,
  action: string,
  targetType: 'user' | 'journalist' | 'media' | 'article' | 'comment' | 'category' | 'report' | 'system',
  targetId: string,
  targetTitle: string,
  details: string
) {
  const data = db.getData();
  const admin = req.user!;
  const newLog: AdminLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    adminId: admin.id,
    adminName: admin.name,
    action,
    targetType,
    targetId,
    targetTitle,
    details,
    timestamp: new Date().toISOString(),
  };
  if (!data.adminLogs) data.adminLogs = [];
  data.adminLogs.unshift(newLog);
  // Cap history at 2000 items
  if (data.adminLogs.length > 2000) {
    data.adminLogs = data.adminLogs.slice(0, 2000);
  }
}

// -------------------------------------------------------------
// 1. DASHBOARD GLOBAL STATS & RECENT ACTIVITY
// -------------------------------------------------------------
adminRouter.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();

  const totalUsers = data.users.length;
  const totalJournalists = data.users.filter((u) => u.role === 'journalist').length;
  const totalMedia = (data.mediaHouses || []).length;
  const totalArticles = data.articles.length;
  const publishedArticles = data.articles.filter((a) => a.status === 'published').length;
  const draftArticles = data.articles.filter((a) => a.status === 'draft').length;
  const hiddenArticles = data.articles.filter((a) => a.status === 'hidden').length;

  const totalViews = data.articles.reduce((acc, a) => acc + (a.viewsCount || 0), 0);
  const totalComments = data.comments.length;
  const totalLikes = data.likes.length;

  const pendingReports = data.reports.filter((r) => r.status === 'pending' || r.status === 'reviewing').length;
  const pendingVerifications = data.verificationRequests.filter((v) => v.status === 'pending').length;

  // Real breakdown of articles by category
  const articlesByCategory = data.categories.map((cat) => {
    const count = data.articles.filter((a) => a.categoryId === cat.id && a.status === 'published').length;
    return {
      name: cat.name,
      count,
    };
  });

  // Recent activity stream (real records from DB)
  const recentActivity: {
    id: string;
    type: 'article' | 'report' | 'user' | 'verification' | 'media';
    title: string;
    subtitle: string;
    timestamp: string;
  }[] = [];

  // Recent articles
  data.articles.slice(0, 5).forEach((art) => {
    recentActivity.push({
      id: `act_art_${art.id}`,
      type: 'article',
      title: art.title,
      subtitle: `Par ${art.authorName} (${art.categoryName})`,
      timestamp: art.createdAt,
    });
  });

  // Recent reports
  data.reports.slice(0, 5).forEach((rep) => {
    recentActivity.push({
      id: `act_rep_${rep.id}`,
      type: 'report',
      title: `Signalement [${rep.targetType}] : ${rep.reason}`,
      subtitle: `Par ${rep.reporterName} - Statut : ${rep.status}`,
      timestamp: rep.createdAt,
    });
  });

  // Recent verification requests
  data.verificationRequests.slice(0, 5).forEach((ver) => {
    recentActivity.push({
      id: `act_ver_${ver.id}`,
      type: 'verification',
      title: `Demande de badge : ${ver.userName}`,
      subtitle: `Média : ${ver.mediaName} - Carte : ${ver.pressCardNumber}`,
      timestamp: ver.createdAt,
    });
  });

  // Sort unified activity by timestamp descending
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return res.json({
    stats: {
      totalUsers,
      totalJournalists,
      totalMedia,
      totalArticles,
      publishedArticles,
      draftArticles,
      hiddenArticles,
      totalViews,
      totalComments,
      totalLikes,
      pendingReports,
      pendingVerifications,
      articlesByCategory,
      recentActivity: recentActivity.slice(0, 10),
    },
  });
});

// -------------------------------------------------------------
// 2. USERS MANAGEMENT
// -------------------------------------------------------------
adminRouter.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { q, role, status, page = '1', limit = '15' } = req.query;

  let filtered = data.users.map(({ passwordHash, passwordSalt, ...u }) => {
    const articlesCount = data.articles.filter((a) => a.authorId === u.id).length;
    return {
      ...u,
      articlesCount,
    };
  });

  if (role && role !== 'all') {
    filtered = filtered.filter((u) => u.role === role);
  }

  if (status && status !== 'all') {
    filtered = filtered.filter((u) => u.status === status);
  }

  if (q) {
    const query = String(q).toLowerCase().trim();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.phone && u.phone.toLowerCase().includes(query)) ||
        (u.mediaName && u.mediaName.toLowerCase().includes(query))
    );
  }

  // Sort by creation date descending
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit as string, 10) || 15);
  const total = filtered.length;
  const paginatedUsers = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return res.json({
    users: paginatedUsers,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
});

// Suspend or Reactivate user
adminRouter.put('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = data.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  if (user.id === req.user!.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre statut administrateur.' });
  }

  const { status, reason } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  user.status = status;
  logAction(
    req,
    status === 'suspended' ? 'suspend_user' : 'reactivate_user',
    'user',
    user.id,
    user.name,
    `Compte ${status === 'suspended' ? 'suspendu' : 'réactivé'}. Motif : ${reason || 'Action administrative standard'}`
  );

  db.save();

  // Async sync claims to Firebase if user is linked to Firebase Auth
  setFirebaseCustomUserClaims(user.id, {
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
  }).catch(() => {});

  return res.json({ message: `Compte ${status === 'suspended' ? 'suspendu' : 'réactivé'} avec succès.`, user });
});

// 0. Get Principal Accounts (Master Admins with total control)
adminRouter.get('/master-accounts', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const accounts = MASTER_ADMIN_EMAILS.map((email) => {
    const u = data.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    return {
      email,
      isRegistered: !!u,
      name: u?.name || 'En attente de connexion',
      id: u?.id,
      role: 'admin',
      avatar: u?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      lastLoginAt: u?.lastLoginAt,
    };
  });
  return res.json({ masterAccounts: accounts, maxAccounts: MASTER_ADMIN_EMAILS.length });
});

// Change user role (Strict: Only master admins can promote to journalist or demote to user)
adminRouter.put('/users/:id/role', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = data.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  if (user.id === req.user!.id) {
    return res.status(400).json({ error: 'Impossible de modifier son propre rôle.' });
  }

  const { role } = req.body;
  if (!['user', 'reader', 'journalist', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide.' });
  }

  // Strict rule: Admin role is strictly restricted to the 2 principal accounts
  if (role === 'admin' && !isMasterAdmin(user.email)) {
    return res.status(400).json({
      error: 'Attribution refusée : seuls les 2 comptes principaux configurés ont le contrôle total et le statut d’administrateur.',
    });
  }

  const prevRole = user.role;
  user.role = role === 'reader' ? 'user' : role;

  if (user.role === 'journalist') {
    user.isVerified = true;
    user.verificationStatus = 'approved';
  } else if (user.role === 'user') {
    // If demoting from journalist, detach from all media houses
    for (let i = (data.mediaHouses || []).length - 1; i >= 0; i--) {
      const m = data.mediaHouses[i];
      if (m.members && m.members.includes(user.id)) {
        m.members = m.members.filter((id) => id !== user.id);
        m.journalistsCount = m.members.length;
      }
      if (m.ownerId === user.id) {
        if (m.members && m.members.length > 0) {
          const nextChef = data.users.find((u) => u.id === m.members[0]);
          if (nextChef) {
            m.ownerId = nextChef.id;
            m.ownerName = nextChef.name;
          }
        } else {
          data.mediaHouses.splice(i, 1);
        }
      }
    }
    user.mediaId = undefined;
    user.mediaName = undefined;
    user.isVerified = false;

    data.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      type: 'system',
      title: 'Statut Journaliste révoqué',
      message: `Votre accréditation de Journaliste a été révoquée par l'administrateur principal. Votre compte est désormais un compte simple lecteur.`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  logAction(
    req,
    'change_role',
    'user',
    user.id,
    user.name,
    `Rôle modifié de "${prevRole}" vers "${user.role}" par le compte principal`
  );

  db.save();

  // Async sync claims to Firebase
  setFirebaseCustomUserClaims(user.id, {
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
  }).catch(() => {});

  return res.json({
    message: user.role === 'journalist'
      ? `L'utilisateur "${user.name}" a été promu avec succès au rang de Journaliste accrédité. Il peut désormais fonder ou intégrer une Maison de Journalistes.`
      : `Le rôle a été réinitialisé à Compte Simple ("${user.role}").`,
    user,
  });
});

// Toggle verification badge
adminRouter.put('/users/:id/verify', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = data.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  const { isVerified } = req.body;
  user.isVerified = !!isVerified;
  user.verificationStatus = isVerified ? 'approved' : 'none';

  // Also update articles author verification badge flag
  data.articles.forEach((a) => {
    if (a.authorId === user.id) {
      a.isAuthorVerified = user.isVerified;
    }
  });

  logAction(
    req,
    isVerified ? 'grant_verification' : 'revoke_verification',
    'journalist',
    user.id,
    user.name,
    `Badge officiel de vérification ${isVerified ? 'attribué' : 'révoqué'}`
  );

  db.save();

  // Async sync claims to Firebase
  setFirebaseCustomUserClaims(user.id, {
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
  }).catch(() => {});

  return res.json({ message: `Badge de vérification ${isVerified ? 'attribué' : 'retiré'}.`, user });
});

// Explicit Revoke Journalist status (Demote to reader 'user' & remove from house)
adminRouter.put('/users/:id/revoke-journalist', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = data.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  if (isMasterAdmin(user.email)) {
    return res.status(400).json({ error: 'Action interdite : impossible de révoquer un administrateur principal.' });
  }

  const { reason } = req.body || {};
  user.role = 'user';
  user.isVerified = false;
  user.verificationStatus = 'rejected';

  // Detach from all houses cleanly
  for (let i = (data.mediaHouses || []).length - 1; i >= 0; i--) {
    const m = data.mediaHouses[i];
    if (m.members && m.members.includes(user.id)) {
      m.members = m.members.filter((id) => id !== user.id);
      m.journalistsCount = m.members.length;
    }
    if (m.ownerId === user.id) {
      if (m.members && m.members.length > 0) {
        const nextChef = data.users.find((u) => u.id === m.members[0]);
        if (nextChef) {
          m.ownerId = nextChef.id;
          m.ownerName = nextChef.name;
        }
      } else {
        data.mediaHouses.splice(i, 1);
      }
    }
  }

  user.mediaId = undefined;
  user.mediaName = undefined;

  data.notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    type: 'system',
    title: 'Statut de Journaliste révoqué',
    message: `Votre statut de Journaliste a été officiellement révoqué par l'administrateur principal. Motif : ${reason || 'Non-respect des standards déontologiques ou réorganisation éditoriale'}. Vous êtes désormais simple lecteur citoyen.`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  logAction(
    req,
    'revoke_journalist',
    'journalist',
    user.id,
    user.name,
    `Révocation du statut de journaliste. Motif : ${reason || 'Action administrative'}`
  );

  db.save();

  // Async sync claims
  setFirebaseCustomUserClaims(user.id, {
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
  }).catch(() => {});

  return res.json({ message: `Le statut de journaliste de "${user.name}" a été révoqué avec succès.`, user });
});

// -------------------------------------------------------------
// 3. JOURNALISTS & ACCREDITATION REQUESTS
// -------------------------------------------------------------
adminRouter.get('/journalists', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { q, verifiedOnly } = req.query;

  let journalists = data.users
    .filter((u) => u.role === 'journalist' || u.role === 'admin' || u.isVerified)
    .map(({ passwordHash, passwordSalt, ...u }) => {
      const articles = data.articles.filter((a) => a.authorId === u.id);
      const followers = data.follows.filter((f) => f.targetId === u.id);
      return {
        ...u,
        articlesCount: articles.length,
        followersCount: Math.max(u.followersCount || 0, followers.length),
      };
    });

  if (verifiedOnly === 'true') {
    journalists = journalists.filter((j) => j.isVerified);
  }

  if (q) {
    const query = String(q).toLowerCase().trim();
    journalists = journalists.filter(
      (j) =>
        j.name.toLowerCase().includes(query) ||
        j.email.toLowerCase().includes(query) ||
        (j.mediaName && j.mediaName.toLowerCase().includes(query))
    );
  }

  return res.json({ journalists });
});

// Verification requests list
adminRouter.get('/verification-requests', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { status } = req.query;

  let requests = [...data.verificationRequests];
  if (status && status !== 'all') {
    requests = requests.filter((r) => r.status === status);
  }

  requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ requests });
});

// Handle verification request (Approve / Reject / Request More Info)
adminRouter.put('/verification-requests/:id', async (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const request = data.verificationRequests.find((r) => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' });
  }

  const { status, adminNotes } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  request.status = status;
  request.adminNotes = adminNotes;
  request.reviewedAt = new Date().toISOString();

  const user = data.users.find((u) => u.id === request.userId);
  if (user) {
    user.verificationStatus = status;
    if (status === 'approved') {
      user.isVerified = true;
      user.role = 'journalist';
      if (request.mediaName) user.mediaName = request.mediaName;

      // Update their articles author badge
      data.articles.forEach((a) => {
        if (a.authorId === user.id) a.isAuthorVerified = true;
      });
    } else if (status === 'rejected') {
      user.isVerified = false;
    }

    await db.persistUser(user);

    // Send direct notification to user
    const userNotif: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      recipientEmail: user.email,
      type: 'verification',
      title: status === 'approved' ? 'Accréditation Journaliste validée !' : 'Demande d’accréditation refusée',
      message:
        status === 'approved'
          ? `Félicitations ${user.name} ! Votre demande d’accréditation en tant que Journaliste (${request.mediaName || 'Presse'}) a été approuvée par l’administration officielle.`
          : `Votre demande d’accréditation Journaliste a été rejetée. Motif : ${adminNotes || 'Dossier incomplet ou non vérifiable'}.`,
      link: status === 'approved' ? 'profile' : undefined,
      read: false,
      createdAt: new Date().toISOString(),
    };

    await db.persistNotification(userNotif);
    realtimeHub.broadcastToUser(user.id, 'notification:new', userNotif);
  }

  await db.persistVerificationRequest(request);

  logAction(
    req,
    status === 'approved' ? 'approve_verification' : 'reject_verification',
    'journalist',
    request.userId,
    request.userName,
    `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}. Notes : ${adminNotes || 'Aucune note'}`
  );

  realtimeHub.broadcast('verification:updated', request);

  db.save();
  return res.json({ message: `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}.`, request });
});

// -------------------------------------------------------------
// 4. ARTICLES MODERATION
// -------------------------------------------------------------
adminRouter.get('/articles', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { q, status, categoryId, page = '1', limit = '15' } = req.query;

  let filtered = [...data.articles];

  if (status && status !== 'all') {
    filtered = filtered.filter((a) => a.status === status);
  }

  if (categoryId && categoryId !== 'all') {
    filtered = filtered.filter((a) => a.categoryId === categoryId);
  }

  if (q) {
    const query = String(q).toLowerCase().trim();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.authorName.toLowerCase().includes(query) ||
        (a.mediaName && a.mediaName.toLowerCase().includes(query)) ||
        (a.tags && a.tags.some((t) => t.toLowerCase().includes(query)))
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit as string, 10) || 15);
  const total = filtered.length;
  const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return res.json({
    articles: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
});

// Update article status (Published, Hidden, Draft, Deleted)
adminRouter.put('/articles/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable.' });
  }

  const { status, reason } = req.body;
  if (!['published', 'hidden', 'draft', 'deleted'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  const prevStatus = article.status;
  article.status = status;
  article.updatedAt = new Date().toISOString();

  logAction(
    req,
    `moderate_article_${status}`,
    'article',
    article.id,
    article.title,
    `Statut de l’article changé de "${prevStatus}" à "${status}". Motif : ${reason || 'Décision de modération'}`
  );

  db.save();

  // Real-time synchronization: broadcast to all connected readers & media houses
  if (status === 'published') {
    realtimeHub.broadcast('article:created', article);
    realtimeHub.broadcast('article:updated', article);
  } else {
    realtimeHub.broadcast('article:deleted', { articleId: article.id, categoryId: article.categoryId });
    realtimeHub.broadcast('article:updated', article);
  }

  return res.json({ message: `Statut de l’article mis à jour : ${status}.`, article });
});

// Delete article (Logical or complete with audit trail)
adminRouter.delete('/articles/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { hardDelete } = req.query;
  const article = data.articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article introuvable.' });
  }

  const categoryId = article.categoryId;
  const articleId = article.id;

  if (hardDelete === 'true') {
    const idx = data.articles.findIndex((a) => a.id === req.params.id);
    data.articles.splice(idx, 1);
    // Cleanup associated entities
    data.likes = data.likes.filter((l) => l.articleId !== article.id);
    data.bookmarks = data.bookmarks.filter((b) => b.articleId !== article.id);
    data.comments = data.comments.filter((c) => c.articleId !== article.id);

    logAction(
      req,
      'hard_delete_article',
      'article',
      article.id,
      article.title,
      'Suppression définitive de l’article et des métadonnées associées'
    );
  } else {
    // Preferred safe logical delete
    article.status = 'deleted';
    article.updatedAt = new Date().toISOString();
    logAction(
      req,
      'soft_delete_article',
      'article',
      article.id,
      article.title,
      'Mise à la corbeille (suppression logique)'
    );
  }

  // Update house article count if applicable
  const house = (data.mediaHouses || []).find((m) => m.id === article.mediaId);
  if (house) {
    house.articlesCount = Math.max(0, (house.articlesCount || 1) - 1);
    realtimeHub.broadcast('mediaHouse:updated', house);
  }

  db.save();

  // Real-time synchronization broadcast of article deletion
  realtimeHub.broadcast('article:deleted', { articleId, categoryId });

  return res.json({ message: 'Article supprimé avec succès.' });
});

// -------------------------------------------------------------
// 5. COMMENTS MODERATION
// -------------------------------------------------------------
adminRouter.get('/comments', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { q, status, reportedOnly, page = '1', limit = '20' } = req.query;

  // Enrich comment records with article titles
  let commentsList = data.comments.map((c) => {
    const article = data.articles.find((a) => a.id === c.articleId);
    const reportsCount = data.reports.filter((r) => r.targetType === 'comment' && r.targetId === c.id).length;
    return {
      ...c,
      status: c.status || 'active',
      articleTitle: article ? article.title : 'Article supprimé',
      reportsCount,
    };
  });

  if (reportedOnly === 'true') {
    commentsList = commentsList.filter((c) => (c.reportsCount || 0) > 0);
  }

  if (status && status !== 'all') {
    commentsList = commentsList.filter((c) => c.status === status);
  }

  if (q) {
    const query = String(q).toLowerCase().trim();
    commentsList = commentsList.filter(
      (c) =>
        c.content.toLowerCase().includes(query) ||
        c.userName.toLowerCase().includes(query) ||
        c.articleTitle.toLowerCase().includes(query)
    );
  }

  commentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
  const total = commentsList.length;
  const paginated = commentsList.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return res.json({
    comments: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
});

// Hide or Restore Comment
adminRouter.put('/comments/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const comment = data.comments.find((c) => c.id === req.params.id);

  if (!comment) {
    return res.status(404).json({ error: 'Commentaire introuvable.' });
  }

  const { status, reason } = req.body;
  if (!['active', 'hidden'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  comment.status = status;
  logAction(
    req,
    status === 'hidden' ? 'hide_comment' : 'restore_comment',
    'comment',
    comment.id,
    `Commentaire de ${comment.userName}`,
    `Commentaire ${status === 'hidden' ? 'masqué' : 'restauré'}. Motif : ${reason || 'Modération'}`
  );

  db.save();
  return res.json({ message: `Commentaire ${status === 'hidden' ? 'masqué' : 'restauré'}.`, comment });
});

// Delete Comment
adminRouter.delete('/comments/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const commentIndex = data.comments.findIndex((c) => c.id === req.params.id);

  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Commentaire introuvable.' });
  }

  const comment = data.comments[commentIndex];
  const article = data.articles.find((a) => a.id === comment.articleId);

  // Remove comment and child replies
  const repliesToDelete = data.comments.filter((c) => c.parentId === comment.id);
  const totalCount = 1 + repliesToDelete.length;

  data.comments = data.comments.filter((c) => c.id !== comment.id && c.parentId !== comment.id);
  data.commentLikes = data.commentLikes.filter(
    (cl) => cl.commentId !== comment.id && !repliesToDelete.some((r) => r.id === cl.commentId)
  );

  if (article) {
    article.commentsCount = Math.max(0, article.commentsCount - totalCount);
  }

  logAction(
    req,
    'delete_comment',
    'comment',
    comment.id,
    `Commentaire de ${comment.userName}`,
    `Suppression du commentaire et de ses réponses (${totalCount} éléments)`
  );

  db.save();
  return res.json({ message: 'Commentaire supprimé définitivement.' });
});

// -------------------------------------------------------------
// 6. REPORTS (SIGNALEMENTS)
// -------------------------------------------------------------
adminRouter.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { status, targetType, q } = req.query;

  let reports = [...data.reports];

  if (status && status !== 'all') {
    reports = reports.filter((r) => r.status === status);
  }

  if (targetType && targetType !== 'all') {
    reports = reports.filter((r) => r.targetType === targetType);
  }

  if (q) {
    const query = String(q).toLowerCase().trim();
    reports = reports.filter(
      (r) =>
        r.reason.toLowerCase().includes(query) ||
        r.reporterName.toLowerCase().includes(query) ||
        (r.targetTitle && r.targetTitle.toLowerCase().includes(query)) ||
        (r.details && r.details.toLowerCase().includes(query))
    );
  }

  reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ reports });
});

// Process Report (Resolve / Dismiss / Reject with Action Dispatch)
adminRouter.put('/reports/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const report = data.reports.find((r) => r.id === req.params.id);

  if (!report) {
    return res.status(404).json({ error: 'Signalement introuvable.' });
  }

  const { status, action, adminNotes } = req.body;
  // status: 'resolved' | 'rejected' | 'dismissed' | 'reviewing'
  if (!['resolved', 'rejected', 'dismissed', 'reviewing'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  report.status = status;
  report.adminNotes = adminNotes || report.adminNotes;
  report.actionTaken = action || report.actionTaken;
  report.resolvedBy = req.user!.id;
  report.resolvedAt = new Date().toISOString();

  // Dispatch corrective actions
  if (action === 'hide_article' && report.targetType === 'article') {
    const article = data.articles.find((a) => a.id === report.targetId);
    if (article) {
      article.status = 'hidden';
      logAction(req, 'hide_article_from_report', 'article', article.id, article.title, `Article masqué suite au signalement ${report.id}`);
    }
  } else if (action === 'delete_comment' && report.targetType === 'comment') {
    const idx = data.comments.findIndex((c) => c.id === report.targetId);
    if (idx !== -1) {
      const comment = data.comments[idx];
      data.comments.splice(idx, 1);
      logAction(req, 'delete_comment_from_report', 'comment', comment.id, `Commentaire ${comment.id}`, `Commentaire supprimé suite au signalement ${report.id}`);
    }
  } else if (action === 'suspend_user' && report.targetType === 'user') {
    const user = data.users.find((u) => u.id === report.targetId);
    if (user && user.id !== req.user!.id) {
      user.status = 'suspended';
      logAction(req, 'suspend_user_from_report', 'user', user.id, user.name, `Utilisateur suspendu suite au signalement ${report.id}`);
    }
  }

  logAction(
    req,
    `process_report_${status}`,
    'report',
    report.id,
    `Signalement #${report.id.substring(0, 8)}`,
    `Statut : ${status}, Action appliquée : ${action || 'aucune'}. Notes : ${adminNotes || 'R.A.S'}`
  );

  db.save();
  return res.json({ message: 'Signalement traité avec succès.', report });
});

// -------------------------------------------------------------
// 7. CATEGORIES MANAGEMENT
// -------------------------------------------------------------
adminRouter.get('/categories', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const categoriesWithCount = data.categories.map((cat, idx) => {
    const count = data.articles.filter((a) => a.categoryId === cat.id && a.status === 'published').length;
    return {
      ...cat,
      status: cat.status || 'active',
      order: cat.order ?? idx + 1,
      articleCount: count,
    };
  });

  return res.json({ categories: categoriesWithCount });
});

// Create Category
adminRouter.post('/categories', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { name, slug, description, icon, status = 'active', order } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Le nom et le slug sont obligatoires.' });
  }

  const cleanSlug = slug.trim().toLowerCase();
  const existing = data.categories.find((c) => c.slug === cleanSlug);
  if (existing) {
    return res.status(400).json({ error: 'Une catégorie avec ce slug existe déjà.' });
  }

  const newCat: Category = {
    id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    slug: cleanSlug,
    description: description ? description.trim() : '',
    icon: icon || undefined,
    status: status === 'disabled' ? 'disabled' : 'active',
    order: order ? parseInt(order, 10) : data.categories.length + 1,
    createdAt: new Date().toISOString(),
  };

  data.categories.push(newCat);
  logAction(req, 'create_category', 'category', newCat.id, newCat.name, `Création de la rubrique "${newCat.name}"`);

  db.save();
  return res.status(201).json({ message: 'Rubrique créée avec succès.', category: newCat });
});

// Update Category
adminRouter.put('/categories/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const cat = data.categories.find((c) => c.id === req.params.id);

  if (!cat) {
    return res.status(404).json({ error: 'Rubrique introuvable.' });
  }

  const { name, description, icon, status, order } = req.body;
  if (name) cat.name = name.trim();
  if (description !== undefined) cat.description = description.trim();
  if (icon !== undefined) cat.icon = icon;
  if (status && ['active', 'disabled'].includes(status)) cat.status = status;
  if (order !== undefined) cat.order = parseInt(order, 10) || cat.order;

  logAction(req, 'update_category', 'category', cat.id, cat.name, `Mise à jour des informations de la rubrique`);

  db.save();
  return res.json({ message: 'Rubrique mise à jour.', category: cat });
});

// Delete Category
adminRouter.delete('/categories/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const idx = data.categories.findIndex((c) => c.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Rubrique introuvable.' });
  }

  const cat = data.categories[idx];
  const articlesCount = data.articles.filter((a) => a.categoryId === cat.id).length;

  if (articlesCount > 0) {
    return res.status(400).json({
      error: `Impossible de supprimer cette rubrique car ${articlesCount} article(s) y sont rattachés. Vous pouvez plutôt la désactiver.`,
    });
  }

  data.categories.splice(idx, 1);
  logAction(req, 'delete_category', 'category', cat.id, cat.name, `Suppression de la rubrique`);

  db.save();
  return res.json({ message: 'Rubrique supprimée avec succès.' });
});

// -------------------------------------------------------------
// 8. MEDIA HOUSES (MAISONS DE PRESSE & RÉDACTIONS)
// -------------------------------------------------------------
adminRouter.get('/media', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { q } = req.query;

  let mediaList = (data.mediaHouses || []).map((m) => {
    const journalists = data.users.filter((u) => u.mediaId === m.id || (u.mediaName && u.mediaName.toLowerCase() === m.name.toLowerCase()));
    const articles = data.articles.filter((a) => a.mediaId === m.id || (a.mediaName && a.mediaName.toLowerCase() === m.name.toLowerCase()));
    return {
      ...m,
      journalistsCount: Math.max(m.journalistsCount || 0, journalists.length),
      articlesCount: Math.max(m.articlesCount || 0, articles.length),
    };
  });

  if (q) {
    const query = String(q).toLowerCase().trim();
    mediaList = mediaList.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.ownerName.toLowerCase().includes(query)
    );
  }

  return res.json({ mediaHouses: mediaList });
});

// Create Media House
adminRouter.post('/media', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { name, slug, description, logo, coverImage, phone, email, website, address, ownerId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom du média est obligatoire.' });
  }

  const cleanSlug = slug ? slug.trim().toLowerCase() : name.trim().toLowerCase().replace(/\s+/g, '-');
  const existing = (data.mediaHouses || []).find((m) => m.slug === cleanSlug);
  if (existing) {
    return res.status(400).json({ error: 'Un média avec cet identifiant existe déjà.' });
  }

  const owner = ownerId ? data.users.find((u) => u.id === ownerId) : req.user!;

  const newMedia: MediaHouse = {
    id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    slug: cleanSlug,
    logo: logo || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
    coverImage: coverImage || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
    description: description ? description.trim() : 'Organe de presse accrédité sur purge-info',
    ownerId: owner ? owner.id : req.user!.id,
    ownerName: owner ? owner.name : req.user!.name,
    phone: phone ? phone.trim() : undefined,
    email: email ? email.trim() : undefined,
    website: website ? website.trim() : undefined,
    address: address ? address.trim() : 'Bureau Éditorial Central',
    status: 'active',
    isVerified: true,
    journalistsCount: 1,
    articlesCount: 0,
    createdAt: new Date().toISOString(),
  };

  if (!data.mediaHouses) data.mediaHouses = [];
  data.mediaHouses.push(newMedia);

  logAction(req, 'create_media', 'media', newMedia.id, newMedia.name, `Création de l’organe de presse "${newMedia.name}"`);

  db.save();
  return res.status(201).json({ message: 'Organe de presse créé avec succès.', media: newMedia });
});

// Update Media House
adminRouter.put('/media/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const media = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!media) {
    return res.status(404).json({ error: 'Média introuvable.' });
  }

  const { name, description, logo, coverImage, phone, email, website, address } = req.body;
  if (name) media.name = name.trim();
  if (description !== undefined) media.description = description.trim();
  if (logo) media.logo = logo;
  if (coverImage !== undefined) media.coverImage = coverImage;
  if (phone !== undefined) media.phone = phone.trim();
  if (email !== undefined) media.email = email.trim();
  if (website !== undefined) media.website = website.trim();
  if (address !== undefined) media.address = address.trim();

  logAction(req, 'update_media', 'media', media.id, media.name, `Mise à jour des informations administratives du média`);

  db.save();
  return res.json({ message: 'Informations du média mises à jour.', media });
});

// Toggle Media Verification Badge
adminRouter.put('/media/:id/verify', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const media = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!media) {
    return res.status(404).json({ error: 'Média introuvable.' });
  }

  const { isVerified } = req.body;
  media.isVerified = !!isVerified;

  logAction(
    req,
    isVerified ? 'verify_media' : 'unverify_media',
    'media',
    media.id,
    media.name,
    `Badge d’accréditation média ${isVerified ? 'accordé' : 'révoqué'}`
  );

  db.save();
  return res.json({ message: `Statut vérifié mis à jour : ${media.isVerified}`, media });
});

// Toggle Media Status (Active / Suspended)
adminRouter.put('/media/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const media = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!media) {
    return res.status(404).json({ error: 'Média introuvable.' });
  }

  const { status, reason } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  media.status = status;
  logAction(
    req,
    status === 'suspended' ? 'suspend_media' : 'reactivate_media',
    'media',
    media.id,
    media.name,
    `Média ${status === 'suspended' ? 'suspendu' : 'réactivé'}. Motif : ${reason || 'Décision administrative'}`
  );

  db.save();
  return res.json({ message: `Statut du média mis à jour : ${status}`, media });
});

// Delete Media House (Permanent dissolution by Master Admin)
adminRouter.delete('/media/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const houseIndex = (data.mediaHouses || []).findIndex((m) => m.id === req.params.id);

  if (houseIndex === -1) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  const media = data.mediaHouses[houseIndex];
  const { reason } = req.body || {};

  // Detach all journalist members cleanly
  const memberIds = media.members && Array.isArray(media.members) ? media.members : [media.ownerId];
  data.users.forEach((u) => {
    if (memberIds.includes(u.id) || u.mediaId === media.id) {
      u.mediaId = undefined;
      u.mediaName = undefined;

      // Dispatch system notification
      data.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: u.id,
        type: 'system',
        title: 'Maison de journalistes supprimée',
        message: `La maison de journalistes "${media.name}" a été définitivement supprimée par l'administrateur principal. Motif : ${reason || 'Régulation et respect de la charte de presse'}. Vous conservez votre statut de journaliste et pouvez fonder ou rejoindre une autre maison (max 5 membres).`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Remove house
  data.mediaHouses.splice(houseIndex, 1);

  logAction(
    req,
    'delete_media',
    'media',
    media.id,
    media.name,
    `Suppression définitive de la maison "${media.name}". Motif : ${reason || 'Régulation administrative'}`
  );

  db.save();
  return res.json({ message: `La maison de journalistes "${media.name}" a été supprimée avec succès.` });
});

// -------------------------------------------------------------
// 9. AUDIT LOGS (JOURNAL D'AUDIT ADMIN)
// -------------------------------------------------------------
adminRouter.get('/logs', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { targetType, action, q, page = '1', limit = '25' } = req.query;

  let logs = [...(data.adminLogs || [])];

  if (targetType && targetType !== 'all') {
    logs = logs.filter((l) => l.targetType === targetType);
  }

  if (action && action !== 'all') {
    logs = logs.filter((l) => l.action.toLowerCase().includes(String(action).toLowerCase()));
  }

  if (q) {
    const query = String(q).toLowerCase().trim();
    logs = logs.filter(
      (l) =>
        l.adminName.toLowerCase().includes(query) ||
        (l.targetTitle && l.targetTitle.toLowerCase().includes(query)) ||
        (l.details && l.details.toLowerCase().includes(query)) ||
        l.action.toLowerCase().includes(query)
    );
  }

  // Ensure chronological descending
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit as string, 10) || 25);
  const total = logs.length;
  const paginated = logs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return res.json({
    logs: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
});
