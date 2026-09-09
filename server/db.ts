import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Category, Article, Comment, Notification, VerificationRequest, Report, MediaHouse, AdminLog, MediaRecord } from '../src/types';

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

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

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
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
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
  const adminPass = hashPassword('admin123');
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
      name: 'Minato Admin',
      role: 'admin',
      isVerified: true,
      verificationStatus: 'approved',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      bio: 'Compte Administrateur Officiel de la plateforme PURGE-INFO.',
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

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    const initial = createInitialData();
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);

        // Check if database contains old demo data or outdated categories
        const hasOldDemoData =
          parsed.users?.some((u: any) => u.email === 'admin@purgeinfo.com' || u.email === 'medianews@purgeinfo.com') ||
          parsed.categories?.some((c: any) => c.slug === 'international' || c.slug === 'politique') ||
          parsed.articles?.some((a: any) => a.id === 'art_1') ||
          parsed.mediaHouses?.some((m: any) => m.id === 'media_globalnews');

        if (hasOldDemoData) {
          console.log('[DB] Migrated database to production clean state (resetting mock data & setting 6 official categories)...');
          this.saveDataDirect(initial);
          return initial;
        }

        // Ensure 6 official categories are always maintained
        parsed.categories = initial.categories;
        if (!parsed.mediaHouses) parsed.mediaHouses = [];
        if (!parsed.adminLogs) parsed.adminLogs = [];
        if (!parsed.reports) parsed.reports = [];
        if (!parsed.mediaRecords) parsed.mediaRecords = [];
        if (!parsed.commentLikes) parsed.commentLikes = [];

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
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing db.json:', err);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  public getData(): DatabaseSchema {
    return this.data;
  }
}

export const db = new Database();
