import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Category, Article, Comment, Notification, VerificationRequest, Report, MediaHouse, AdminLog, MediaRecord } from '../src/types';
import { MASTER_ADMIN_DEFAULT_PASSWORD } from './config/masterAccounts';
import {
  loadStateFromCloud,
  seedStateToCloud,
  persistDocToCloud,
  deleteDocFromCloud,
  queueCloudSync,
  CLOUD_COLLECTIONS,
  findUserByEmailInCloud,
  fetchUserByIdFromCloud,
} from './firestoreService';

export interface DBFollow {
  id: string;
  followerId: string;
  targetId: string; // userId or mediaId
  createdAt: string;
}

export interface DBLike {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export interface DBCommentLike {
  id: string;
  userId: string;
  commentId: string;
  createdAt: string;
}

export interface DBBookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export interface DBView {
  id: string;
  articleId: string;
  userId?: string;
  ip?: string;
  viewedAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
  passwordSalt: string;
}

export interface DatabaseSchema {
  users: UserWithPassword[];
  categories: Category[];
  articles: Article[];
  comments: Comment[];
  likes: DBLike[];
  commentLikes: DBCommentLike[];
  bookmarks: DBBookmark[];
  follows: DBFollow[];
  notifications: Notification[];
  verificationRequests: VerificationRequest[];
  reports: Report[];
  views: DBView[];
  mediaHouses: MediaHouse[];
  adminLogs: AdminLog[];
  mediaRecords: MediaRecord[];
}

const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const DATA_DIR = isServerless ? path.join('/tmp', 'purge_info_data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_FILE = path.join(process.cwd(), 'data', 'db.json');

// Security helper: Password hash using Node's crypto
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

// Token generator helper (HMAC SHA-256 based)
const JWT_SECRET = process.env.JWT_SECRET || 'purgeinfo-secure-secret-key-2026-global';

export function generateToken(payload: { userId: string; role: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { userId: string; role: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Initial Database Seeding
function createInitialData(): DatabaseSchema {
  const adminPass = hashPassword(MASTER_ADMIN_DEFAULT_PASSWORD);
  const mediaPass = hashPassword('media123');
  const journPass = hashPassword('journ123');
  const readerPass = hashPassword('user123');

  const users: UserWithPassword[] = [
    {
      id: 'usr_admin_naruto',
      email: 'naruto455t@gmail.com',
      passwordHash: adminPass.hash,
      passwordSalt: adminPass.salt,
      name: 'Naruto Admin',
      role: 'admin',
      isVerified: true,
      verificationStatus: 'approved',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Compte Administrateur Officiel de la plateforme PURGE-INFO.',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'usr_admin_itachi',
      email: 'itachi45t@gmail.com',
      passwordHash: adminPass.hash,
      passwordSalt: adminPass.salt,
      name: 'Itachi Admin',
      role: 'admin',
      isVerified: true,
      verificationStatus: 'approved',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Compte Administrateur Officiel de la plateforme PURGE-INFO.',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'usr_admin_nami',
      email: 'nami45tt@gmail.com',
      passwordHash: adminPass.hash,
      passwordSalt: adminPass.salt,
      name: 'Nami Admin',
      role: 'admin',
      isVerified: true,
      verificationStatus: 'approved',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Compte Administrateur Officiel de la plateforme PURGE-INFO.',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'usr_admin_minato',
      email: 'minato45tt@gmail.com',
      passwordHash: adminPass.hash,
      passwordSalt: adminPass.salt,
      name: 'Minato Namikaze',
      role: 'admin',
      isVerified: true,
      verificationStatus: 'approved',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      bio: 'Chroniqueur en Chef & Observateur des Décrets de Sécurité de la Purge.',
      followersCount: 0,
      articlesCount: 0,
      createdAt: '2026-01-01T08:00:00Z',
    },
  ];

  const categories: Category[] = [
    {
      id: 'cat_purgeur',
      name: 'PURGEUR',
      slug: 'purgeur',
      description: 'Actualités, profils, faits d’armes et chroniques des Purgeurs',
      status: 'active',
    },
    {
      id: 'cat_clans',
      name: 'CLANS',
      slug: 'clans',
      description: 'Alliances, territoires, rivalités et opérations des clans',
      status: 'active',
    },
    {
      id: 'cat_familles',
      name: 'FAMILLES',
      slug: 'familles',
      description: 'Lignées historiques, grandes dynasties et actualités des familles',
      status: 'active',
    },
    {
      id: 'cat_purge',
      name: 'PURGE',
      slug: 'purge',
      description: 'Déroulement, décrets officiels, règles et alertes de la Purge',
      status: 'active',
    },
    {
      id: 'cat_competition',
      name: 'COMPÉTITION',
      slug: 'competition',
      description: 'Tournois, duels d’élite, arènes, classements et compétitions',
      status: 'active',
    },
    {
      id: 'cat_celebrites',
      name: 'CÉLÉBRITÉS',
      slug: 'celebrites',
      description: 'Figures publiques, icônes, légendes et personnalités influentes',
      status: 'active',
    },
  ];

  // All reference articles permanently removed — real journalists handle all content
  const articles: Article[] = [];
  const comments: Comment[] = [];
  const likes: DBLike[] = [];
  const bookmarks: DBBookmark[] = [];
  const follows: DBFollow[] = [];
  const notifications: Notification[] = [];
  const verificationRequests: VerificationRequest[] = [];
  const reports: Report[] = [];
  const views: DBView[] = [];
  const mediaHouses: MediaHouse[] = [];
  const adminLogs: AdminLog[] = [
    {
      id: 'log_init',
      adminId: 'usr_admin_naruto',
      adminName: 'Naruto Admin',
      action: 'init_platform',
      targetType: 'system',
      targetId: 'prod_env',
      targetTitle: 'PURGE-INFO Production',
      details: 'Initialisation de la plateforme de production avec les 4 comptes administrateurs officiels et les 6 rubriques officielles.',
      timestamp: new Date().toISOString(),
    },
  ];

  return {
    users,
    categories,
    articles,
    comments,
    likes,
    commentLikes: [],
    bookmarks,
    follows,
    notifications,
    verificationRequests,
    reports,
    views,
    mediaHouses,
    adminLogs,
    mediaRecords: [],
  };
}

/**
 * Intelligently merges local database state with authoritative Cloud Firestore state.
 * Guarantees zero data loss: combines records, preserves the newest changes, and never overwrites with empty sets.
 */
function mergeDatabaseState(local: DatabaseSchema, cloud: DatabaseSchema): DatabaseSchema {
  const userById = new Map<string, UserWithPassword>();
  const userByEmail = new Map<string, UserWithPassword>();

  const isDefaultAvatar = (av?: string) =>
    !av ||
    av.includes('photo-1534528741775-53994a69daeb') ||
    av.includes('photo-150700') ||
    av.includes('photo-150064');

  const addOrMergeUser = (u: UserWithPassword) => {
    if (!u || !u.id) return;
    const cleanEmail = u.email ? u.email.trim().toLowerCase() : '';
    const existing = userById.get(u.id) || (cleanEmail ? userByEmail.get(cleanEmail) : null);

    if (!existing) {
      const copy = { ...u };
      userById.set(u.id, copy);
      if (cleanEmail) userByEmail.set(cleanEmail, copy);
    } else {
      const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const incomingUpdated = u.updatedAt ? new Date(u.updatedAt).getTime() : 0;

      // Role: admin > journalist > user
      const preferAdmin = existing.role === 'admin' || u.role === 'admin';
      const preferJournalist = !preferAdmin && (existing.role === 'journalist' || u.role === 'journalist');
      existing.role = preferAdmin ? 'admin' : preferJournalist ? 'journalist' : (existing.role || u.role || 'user');
      if (existing.role === 'journalist') {
        existing.accountType = 'journalist';
      }

      if (u.isVerified || existing.isVerified || existing.role === 'journalist') {
        existing.isVerified = true;
        existing.verificationStatus = 'approved';
      }

      if (u.name && (!existing.name || incomingUpdated >= existingUpdated)) {
        existing.name = u.name;
      }
      if (u.username && (!existing.username || incomingUpdated >= existingUpdated)) {
        existing.username = u.username;
      }

      // Preserve custom uploaded avatar over default placeholder
      if (u.avatar) {
        if (!isDefaultAvatar(u.avatar)) {
          if (isDefaultAvatar(existing.avatar) || incomingUpdated >= existingUpdated || !existing.avatar) {
            existing.avatar = u.avatar;
            if (u.avatarMedia) existing.avatarMedia = u.avatarMedia;
          }
        }
      }

      if (u.coverImage) {
        if (incomingUpdated >= existingUpdated || !existing.coverImage) {
          existing.coverImage = u.coverImage;
          if (u.coverMedia) existing.coverMedia = u.coverMedia;
        }
      }

      if (u.bio && (!existing.bio || incomingUpdated >= existingUpdated)) {
        existing.bio = u.bio;
      }
      if (u.phone && (!existing.phone || incomingUpdated >= existingUpdated)) {
        existing.phone = u.phone;
      }
      if (u.mediaId) existing.mediaId = u.mediaId;
      if (u.mediaName) existing.mediaName = u.mediaName;
      if (u.passwordHash && !existing.passwordHash) {
        existing.passwordHash = u.passwordHash;
        existing.passwordSalt = u.passwordSalt;
      }
      if (u.lastLoginAt && (!existing.lastLoginAt || new Date(u.lastLoginAt) > new Date(existing.lastLoginAt))) {
        existing.lastLoginAt = u.lastLoginAt;
      }
      if (u.updatedAt && incomingUpdated > existingUpdated) {
        existing.updatedAt = u.updatedAt;
      }
    }
  };

  (local.users || []).forEach(addOrMergeUser);
  (cloud.users || []).forEach(addOrMergeUser);
  const mergedUsers = Array.from(userById.values());

  // Articles: union by ID, keep newest version
  const articleMap = new Map<string, Article>();
  const addOrMergeArticle = (a: Article) => {
    if (!a || !a.id) return;
    const existing = articleMap.get(a.id);
    if (!existing) {
      articleMap.set(a.id, { ...a });
    } else {
      const existingTime = new Date(existing.updatedAt || existing.publishedAt || 0).getTime();
      const newTime = new Date(a.updatedAt || a.publishedAt || 0).getTime();
      if (newTime >= existingTime) {
        articleMap.set(a.id, { ...existing, ...a });
      }
    }
  };
  (local.articles || []).forEach(addOrMergeArticle);
  (cloud.articles || []).forEach(addOrMergeArticle);
  const mergedArticles = Array.from(articleMap.values());

  // Media Houses: union by ID, preserve newest updates
  const houseMap = new Map<string, MediaHouse>();
  const addOrMergeHouse = (h: MediaHouse) => {
    if (!h || !h.id) return;
    const existing = houseMap.get(h.id);
    if (!existing) {
      houseMap.set(h.id, { ...h });
    } else {
      houseMap.set(h.id, {
        ...existing,
        ...h,
        members: Array.from(new Set([...(existing.members || []), ...(h.members || [])])),
      });
    }
  };
  (local.mediaHouses || []).forEach(addOrMergeHouse);
  (cloud.mediaHouses || []).forEach(addOrMergeHouse);
  const mergedHouses = Array.from(houseMap.values());

  // Comments: union by ID
  const commentMap = new Map<string, Comment>();
  (local.comments || []).forEach((c) => { if (c && c.id) commentMap.set(c.id, c); });
  (cloud.comments || []).forEach((c) => { if (c && c.id) commentMap.set(c.id, c); });
  const mergedComments = Array.from(commentMap.values());

  const unionById = <T extends { id: string }>(arr1: T[] = [], arr2: T[] = []): T[] => {
    const map = new Map<string, T>();
    arr1.forEach((item) => { if (item && item.id) map.set(item.id, item); });
    arr2.forEach((item) => { if (item && item.id) map.set(item.id, item); });
    return Array.from(map.values());
  };

  const unionNotifications = (arr1: Notification[] = [], arr2: Notification[] = []): Notification[] => {
    const map = new Map<string, Notification>();
    [...arr1, ...arr2].forEach((notif) => {
      if (!notif || !notif.id) return;
      const existing = map.get(notif.id);
      const isRead = Boolean(notif.read || notif.isRead);
      if (!existing) {
        map.set(notif.id, { ...notif, read: isRead, isRead });
      } else {
        const mergedRead = Boolean(existing.read || existing.isRead || isRead);
        map.set(notif.id, {
          ...existing,
          ...notif,
          read: mergedRead,
          isRead: mergedRead,
        });
      }
    });
    return Array.from(map.values());
  };

  const mergedLikes = unionById(local.likes, cloud.likes);
  const mergedCommentLikes = unionById(local.commentLikes, cloud.commentLikes);
  const mergedBookmarks = unionById(local.bookmarks, cloud.bookmarks);
  const mergedFollows = unionById(local.follows, cloud.follows);

  // Reconcile article like counts with definitive likes records
  mergedArticles.forEach((art) => {
    const matchingLikesCount = mergedLikes.filter((l) => l.articleId === art.id).length;
    art.likesCount = Math.max(art.likesCount || 0, matchingLikesCount);
  });

  return {
    users: mergedUsers,
    categories: local.categories?.length ? local.categories : cloud.categories,
    articles: mergedArticles,
    comments: mergedComments,
    mediaHouses: mergedHouses,
    likes: mergedLikes,
    commentLikes: mergedCommentLikes,
    bookmarks: mergedBookmarks,
    follows: mergedFollows,
    notifications: unionNotifications(local.notifications, cloud.notifications),
    verificationRequests: unionById(local.verificationRequests, cloud.verificationRequests),
    reports: unionById(local.reports, cloud.reports),
    views: unionById(local.views, cloud.views),
    adminLogs: unionById(local.adminLogs, cloud.adminLogs),
    mediaRecords: unionById(local.mediaRecords, cloud.mediaRecords),
  };
}

class Database {
  private data: DatabaseSchema;
  private isCloudReady = false;

  constructor() {
    this.data = this.loadData();
    this.ensureMasterAdmins();
    this.ensureApprovedJournalists();
    // Automatically initialize Cloud Firestore persistence in the background
    this.initCloudPersistence().catch((err) => {
      console.warn('[DB] Cloud persistence initial check failed:', err);
    });
  }

  public async initCloudPersistence(): Promise<void> {
    try {
      const cloudData = await loadStateFromCloud();
      if (cloudData && ((cloudData.users && cloudData.users.length > 0) || (cloudData.articles && cloudData.articles.length > 0))) {
        console.log('[DB] Synchronizing state with Cloud Firestore authoritative source (intelligent merge)...');
        // Merge non-destructively: keep both local and cloud items so newly created articles, houses, comments are NEVER lost
        this.data = mergeDatabaseState(this.data, cloudData);
        this.ensureMasterAdmins();
        this.ensureApprovedJournalists();
        this.isCloudReady = true;
        this.saveDataDirect(this.data);
        // Immediately sync back merged set so Cloud Firestore receives any items that were only local
        queueCloudSync(this.data);
        console.log(
          `[DB] Cloud Firestore synchronization active. Unified ${this.data.users.length} users, ${this.data.articles.length} articles, ${this.data.mediaHouses.length} houses, ${this.data.comments.length} comments.`
        );
      } else {
        console.log('[DB] Cloud Firestore is unseeded. Migrating local initial dataset to Cloud Firestore...');
        await seedStateToCloud(this.data);
        this.isCloudReady = true;
        console.log('[DB] Initial seeding to Cloud Firestore completed successfully.');
      }
    } catch (err) {
      console.error('[DB] Cloud Firestore connection error:', err);
    }
  }

  public ensureMasterAdmins() {
    const initial = createInitialData();
    const existingAdminEmails = new Set(this.data.users.map((u) => u.email.toLowerCase()));
    for (const adminUser of initial.users) {
      if (!existingAdminEmails.has(adminUser.email.toLowerCase())) {
        this.data.users.unshift(adminUser);
      } else {
        // Guarantee proper admin role, verification, and master connection code (Madara45)
        const user = this.data.users.find((u) => u.email.toLowerCase() === adminUser.email.toLowerCase());
        if (user) {
          user.role = 'admin';
          user.isVerified = true;
          user.verificationStatus = 'approved';
          user.status = 'active';
          user.passwordHash = adminUser.passwordHash;
          user.passwordSalt = adminUser.passwordSalt;
        }
      }
    }
  }

  public ensureApprovedJournalists() {
    if (!this.data.verificationRequests || !this.data.users) return;
    (this.data.verificationRequests || []).forEach((req) => {
      if (req.status === 'approved') {
        const user = this.data.users.find(
          (u) =>
            u.id === req.userId ||
            (req.userEmail && u.email && u.email.toLowerCase() === req.userEmail.toLowerCase())
        );
        if (user && user.role !== 'admin') {
          if (user.role !== 'journalist' || !user.isVerified || user.verificationStatus !== 'approved') {
            console.log(`[DB] Reconciling approved journalist user: ${user.email} (${user.id}) -> role: journalist`);
            user.role = 'journalist';
            user.accountType = 'journalist';
            user.isVerified = true;
            user.verificationStatus = 'approved';
            if (req.mediaName && !user.mediaName) {
              user.mediaName = req.mediaName;
            }
          }
        }
      }
    });
  }

  public async persistUser(user: UserWithPassword): Promise<void> {
    user.updatedAt = user.updatedAt || new Date().toISOString();
    const existingIndex = this.data.users.findIndex(
      (u) => u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
    );
    if (existingIndex >= 0) {
      this.data.users[existingIndex] = user;
    } else {
      this.data.users.push(user);
    }
    this.saveDataDirect(this.data);

    // Compute Firestore attributes guaranteeing explicit 'citoyen' -> 'journaliste' transition
    const isJournalist =
      user.role === 'journalist' ||
      user.role === 'journaliste' ||
      user.verificationStatus === 'approved' ||
      user.isVerified === true;
    const isMaster = user.role === 'admin';

    const firestoreRole = isMaster ? 'admin' : isJournalist ? 'journaliste' : 'citoyen';
    const firestoreAccountType = isMaster ? 'admin' : isJournalist ? 'journaliste' : 'citoyen';

    const cloudUserPayload = {
      ...user,
      role: firestoreRole,
      accountType: firestoreAccountType,
      standardRole: isJournalist ? 'journalist' : user.role,
      isJournalist: Boolean(isJournalist),
      isVerified: Boolean(isMaster || isJournalist),
      verificationStatus: isMaster || isJournalist ? 'approved' : user.verificationStatus || 'none',
      updatedAt: user.updatedAt,
    };

    // 1. Sync to backend cloud collection (cloud_users)
    await persistDocToCloud(CLOUD_COLLECTIONS.users, user.id, cloudUserPayload);

    // 2. Sync to direct 'users' collection in Cloud Firestore
    await persistDocToCloud('users', user.id, cloudUserPayload);

    // 3. If user has a Firebase UID distinct from user.id, sync both documents as well
    if (user.uid && user.uid !== user.id) {
      await persistDocToCloud(CLOUD_COLLECTIONS.users, user.uid, cloudUserPayload);
      await persistDocToCloud('users', user.uid, cloudUserPayload);
    }
  }

  public async findUserById(id: string): Promise<UserWithPassword | null> {
    if (!id) return null;
    const user = this.data.users.find((u) => u.id === id);
    if (user) return user;

    // Check Cloud Firestore directly
    const cloudUser = await fetchUserByIdFromCloud(id);
    if (cloudUser) {
      this.data.users.push(cloudUser);
      this.saveDataDirect(this.data);
      return cloudUser;
    }
    return null;
  }

  public async findUser(email: string): Promise<UserWithPassword | null> {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.data.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (user) return user;

    // Check Cloud Firestore directly
    const cloudUser = await findUserByEmailInCloud(cleanEmail);
    if (cloudUser) {
      this.data.users.push(cloudUser);
      this.saveDataDirect(this.data);
      return cloudUser;
    }
    return null;
  }

  public async persistLike(like: DBLike): Promise<void> {
    if (!this.data.likes) this.data.likes = [];
    const index = this.data.likes.findIndex((l) => l.id === like.id);
    if (index >= 0) {
      this.data.likes[index] = like;
    } else {
      this.data.likes.push(like);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.likes, like.id, like);
  }

  public async deleteLike(likeId: string): Promise<void> {
    if (!this.data.likes) this.data.likes = [];
    this.data.likes = this.data.likes.filter((l) => l.id !== likeId);
    this.saveDataDirect(this.data);
    await deleteDocFromCloud(CLOUD_COLLECTIONS.likes, likeId);
  }

  public async persistCommentLike(like: DBCommentLike): Promise<void> {
    if (!this.data.commentLikes) this.data.commentLikes = [];
    const index = this.data.commentLikes.findIndex((cl) => cl.id === like.id);
    if (index >= 0) {
      this.data.commentLikes[index] = like;
    } else {
      this.data.commentLikes.push(like);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.commentLikes, like.id, like);
  }

  public async deleteCommentLike(likeId: string): Promise<void> {
    if (!this.data.commentLikes) this.data.commentLikes = [];
    this.data.commentLikes = this.data.commentLikes.filter((cl) => cl.id !== likeId);
    this.saveDataDirect(this.data);
    await deleteDocFromCloud(CLOUD_COLLECTIONS.commentLikes, likeId);
  }

  public async persistBookmark(bookmark: DBBookmark): Promise<void> {
    if (!this.data.bookmarks) this.data.bookmarks = [];
    const index = this.data.bookmarks.findIndex((b) => b.id === bookmark.id);
    if (index >= 0) {
      this.data.bookmarks[index] = bookmark;
    } else {
      this.data.bookmarks.push(bookmark);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.bookmarks, bookmark.id, bookmark);
  }

  public async deleteBookmark(bookmarkId: string): Promise<void> {
    if (!this.data.bookmarks) this.data.bookmarks = [];
    this.data.bookmarks = this.data.bookmarks.filter((b) => b.id !== bookmarkId);
    this.saveDataDirect(this.data);
    await deleteDocFromCloud(CLOUD_COLLECTIONS.bookmarks, bookmarkId);
  }

  public async persistFollow(follow: DBFollow): Promise<void> {
    if (!this.data.follows) this.data.follows = [];
    const index = this.data.follows.findIndex((f) => f.id === follow.id);
    if (index >= 0) {
      this.data.follows[index] = follow;
    } else {
      this.data.follows.push(follow);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.follows, follow.id, follow);
  }

  public async deleteFollow(followId: string): Promise<void> {
    if (!this.data.follows) this.data.follows = [];
    this.data.follows = this.data.follows.filter((f) => f.id !== followId);
    this.saveDataDirect(this.data);
    await deleteDocFromCloud(CLOUD_COLLECTIONS.follows, followId);
  }

  public async persistArticle(article: Article): Promise<void> {
    const index = this.data.articles.findIndex((a) => a.id === article.id);
    if (index >= 0) {
      this.data.articles[index] = article;
    } else {
      this.data.articles.unshift(article);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.articles, article.id, article);
  }

  public async deleteArticle(articleId: string): Promise<void> {
    this.data.articles = this.data.articles.filter((a) => a.id !== articleId);
    this.saveDataDirect(this.data);
    await deleteDocFromCloud(CLOUD_COLLECTIONS.articles, articleId);
  }

  public async persistMediaHouse(house: MediaHouse): Promise<void> {
    if (!this.data.mediaHouses) this.data.mediaHouses = [];
    const index = this.data.mediaHouses.findIndex((h) => h.id === house.id);
    if (index >= 0) {
      this.data.mediaHouses[index] = house;
    } else {
      this.data.mediaHouses.push(house);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.mediaHouses, house.id, house);
  }

  public async deleteMediaHouse(houseId: string): Promise<void> {
    if (!this.data.mediaHouses) this.data.mediaHouses = [];
    this.data.mediaHouses = this.data.mediaHouses.filter((h) => h.id !== houseId);
    this.saveDataDirect(this.data);
    await deleteDocFromCloud(CLOUD_COLLECTIONS.mediaHouses, houseId);
  }

  public async persistComment(comment: Comment): Promise<void> {
    if (!this.data.comments) this.data.comments = [];
    const index = this.data.comments.findIndex((c) => c.id === comment.id);
    if (index >= 0) {
      this.data.comments[index] = comment;
    } else {
      this.data.comments.push(comment);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.comments, comment.id, comment);
  }

  public async deleteComment(commentId: string): Promise<void> {
    if (!this.data.comments) this.data.comments = [];
    this.data.comments = this.data.comments.filter((c) => c.id !== commentId);
    this.saveDataDirect(this.data);
    await deleteDocFromCloud(CLOUD_COLLECTIONS.comments, commentId);
  }

  public async persistVerificationRequest(request: VerificationRequest): Promise<void> {
    const index = this.data.verificationRequests.findIndex((r) => r.id === request.id);
    if (index >= 0) {
      this.data.verificationRequests[index] = request;
    } else {
      this.data.verificationRequests.unshift(request);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.verificationRequests, request.id, request);
  }

  public async persistNotification(notification: Notification): Promise<void> {
    const index = this.data.notifications.findIndex((n) => n.id === notification.id);
    if (index >= 0) {
      this.data.notifications[index] = notification;
    } else {
      this.data.notifications.unshift(notification);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.notifications, notification.id, notification);
  }

  public async persistMediaRecord(record: MediaRecord): Promise<void> {
    if (!this.data.mediaRecords) this.data.mediaRecords = [];
    const index = this.data.mediaRecords.findIndex((m) => m.id === record.id);
    if (index >= 0) {
      this.data.mediaRecords[index] = record;
    } else {
      this.data.mediaRecords.unshift(record);
    }
    this.saveDataDirect(this.data);
    await persistDocToCloud(CLOUD_COLLECTIONS.mediaRecords, record.id, record);
  }

  public async deleteMediaRecord(recordId: string): Promise<void> {
    if (!this.data.mediaRecords) this.data.mediaRecords = [];
    this.data.mediaRecords = this.data.mediaRecords.filter((m) => m.id !== recordId);
    this.saveDataDirect(this.data);
    await deleteDocFromCloud(CLOUD_COLLECTIONS.mediaRecords, recordId);
  }

  public save() {
    this.saveDataDirect(this.data);
    queueCloudSync(this.data);
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  private loadData(): DatabaseSchema {
    const initial = createInitialData();
    try {
      if (!fs.existsSync(DATA_DIR)) {
        try {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        } catch (e) {
          console.warn('[DB] Could not create DATA_DIR:', e);
        }
      }

      // If running on Netlify/Serverless and /tmp DB does not exist yet, copy initial seed from project bundle
      if (!fs.existsSync(DB_FILE) && fs.existsSync(SEED_FILE)) {
        try {
          const seedContent = fs.readFileSync(SEED_FILE, 'utf-8');
          fs.writeFileSync(DB_FILE, seedContent, 'utf-8');
        } catch (e) {
          console.warn('[DB] Could not copy seed file to /tmp, will load directly:', e);
        }
      }

      const activeDbPath = fs.existsSync(DB_FILE) ? DB_FILE : (fs.existsSync(SEED_FILE) ? SEED_FILE : null);
      if (activeDbPath) {
        const content = fs.readFileSync(activeDbPath, 'utf-8');
        const parsed = JSON.parse(content);

        // Check if database contains old demo data or outdated categories
        const hasOldDemoData =
          parsed.users?.some((u: any) => u.email === 'admin@purgeinfo.com' || u.email === 'medianews@purgeinfo.com') ||
          parsed.categories?.some((c: any) => c.slug === 'international' || c.slug === 'politique') ||
          parsed.articles?.some((a: any) => a.id === 'art_1') ||
          parsed.mediaHouses?.some((m: any) => m.id === 'media_globalnews');

        if (hasOldDemoData) {
          console.log('[DB] Resetting database to clean initial state...');
          this.saveDataDirect(initial);
          return initial;
        }

        // Ensure 6 official categories are always maintained
        parsed.categories = initial.categories;

        const referenceUserIds = new Set(['usr_journ_jiraya', 'usr_journ_shikamaru', 'usr_journ_tsunade']);
        const referenceHouseIds = new Set(['media_arene_mag', 'media_sentinelle_citoyenne']);

        // Purge reference journalist accounts
        parsed.users = (parsed.users || [])
          .filter((u: any) => !referenceUserIds.has(u.id) && !u.email?.includes('@purgeinfo.net'));

        // Always ensure the 4 master admin accounts exist
        const existingAdminIds = new Set(parsed.users.map((u: any) => u.id));
        const missingAdmins = initial.users.filter((adm) => !existingAdminIds.has(adm.id));
        if (missingAdmins.length > 0) {
          parsed.users = [...parsed.users, ...missingAdmins];
        }

        // Purge only exact reference seed articles permanently
        const referenceArticleIds = new Set([
          'art_purgeur_1',
          'art_clans_1',
          'art_familles_1',
          'art_purge_1',
          'art_competition_1',
          'art_celebrites_1',
          'art_sentinelle_1',
        ]);
        parsed.articles = (parsed.articles || []).filter((a: any) => {
          if (referenceUserIds.has(a.authorId)) return false;
          if (referenceArticleIds.has(a.id)) return false;
          return true;
        });

        // Purge orphan comments, likes, bookmarks, and views
        const remainingArticleIds = new Set(parsed.articles.map((a: any) => a.id));
        parsed.comments = (parsed.comments || []).filter((c: any) => remainingArticleIds.has(c.articleId));
        parsed.likes = (parsed.likes || []).filter((l: any) => remainingArticleIds.has(l.articleId));
        parsed.bookmarks = (parsed.bookmarks || []).filter((b: any) => remainingArticleIds.has(b.articleId));
        parsed.views = (parsed.views || []).filter((v: any) => remainingArticleIds.has(v.articleId));

        // Purge reference media houses & member references
        parsed.mediaHouses = (parsed.mediaHouses || [])
          .filter((h: any) => !referenceHouseIds.has(h.id))
          .map((h: any) => {
            const validMembers = (h.members || []).filter((mId: string) => !referenceUserIds.has(mId));
            const houseArticles = parsed.articles.filter((a: any) => a.mediaId === h.id);
            return {
              ...h,
              members: validMembers.length > 0 ? validMembers : [h.ownerId],
              articlesCount: houseArticles.length,
            };
          });

        // Ensure official base media houses exist
        const existingHouseIds = new Set(parsed.mediaHouses.map((m: any) => m.id));
        const missingHouses = initial.mediaHouses.filter((m) => !existingHouseIds.has(m.id));
        if (missingHouses.length > 0) {
          parsed.mediaHouses = [...parsed.mediaHouses, ...missingHouses];
        }

        // Sync article counts on users
        parsed.users = parsed.users.map((u: any) => {
          const userArticles = parsed.articles.filter((a: any) => a.authorId === u.id);
          return {
            ...u,
            articlesCount: userArticles.length,
          };
        });

        if (!parsed.adminLogs) parsed.adminLogs = [];
        if (!parsed.reports) parsed.reports = [];
        if (!parsed.mediaRecords) parsed.mediaRecords = [];
        if (!parsed.commentLikes) parsed.commentLikes = [];

        this.saveDataDirect(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Error reading db.json, generating default data:', err);
    }
    this.saveDataDirect(initial);
    return initial;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        try {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        } catch (e) {
          console.warn('[DB] Could not create DATA_DIR:', e);
        }
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[DB] Could not write to disk (read-only environment), preserving state in-memory:', err);
    }
  }
}

export const db = new Database();
