import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth';

interface RateLimitRecord {
  timestamps: number[];
  lastActionTimestamp?: number;
  lastActionContentHash?: string;
  blockedUntil?: number;
}

class MemoryStore {
  private store = new Map<string, RateLimitRecord>();

  constructor() {
    // Periodic garbage collection every 5 minutes to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        record.timestamps = record.timestamps.filter((t) => now - t < 3600000); // 1 hour retention
        if (record.timestamps.length === 0 && (!record.blockedUntil || record.blockedUntil < now)) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  get(key: string): RateLimitRecord {
    let rec = this.store.get(key);
    if (!rec) {
      rec = { timestamps: [] };
      this.store.set(key, rec);
    }
    return rec;
  }

  set(key: string, record: RateLimitRecord): void {
    this.store.set(key, record);
  }
}

const memoryStore = new MemoryStore();

function getClientIdentifier(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user && authReq.user.id) {
    return `user:${authReq.user.id}`;
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return `ip:${forwarded.split(',')[0].trim()}`;
  }
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

export interface RateLimitOptions {
  windowMs: number; // Time frame in milliseconds
  maxRequests: number; // Max requests within window
  message: string;
  cooldownMs?: number; // Minimum wait time between consecutive requests
  keyPrefix?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message,
    cooldownMs = 0,
    keyPrefix = 'rl',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const id = getClientIdentifier(req);
    const emailSuffix = req.body && typeof req.body.email === 'string' && req.body.email.trim()
      ? `:${req.body.email.trim().toLowerCase()}`
      : '';
    const key = `${keyPrefix}:${id}${emailSuffix}`;
    const now = Date.now();
    const record = memoryStore.get(key);

    // 1. Check if currently blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      const secondsLeft = Math.ceil((record.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', secondsLeft);
      return res.status(429).json({
        error: `${message} Veuillez réessayer dans ${secondsLeft} seconde(s).`,
        retryAfter: secondsLeft,
      });
    }

    // 2. Check cooldown between consecutive requests
    if (cooldownMs > 0 && record.lastActionTimestamp) {
      const elapsed = now - record.lastActionTimestamp;
      if (elapsed < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
        res.setHeader('Retry-After', waitSeconds);
        return res.status(429).json({
          error: `Action trop rapide. Veuillez patienter ${waitSeconds} seconde(s) avant de réessayer.`,
          retryAfter: waitSeconds,
        });
      }
    }

    // 3. Sliding window check
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

    if (record.timestamps.length >= maxRequests) {
      // Apply block penalty for window duration
      record.blockedUntil = now + Math.min(windowMs, 60000);
      const secondsLeft = Math.ceil((record.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', secondsLeft);
      return res.status(429).json({
        error: `${message} Trop de requêtes reçues.`,
        retryAfter: secondsLeft,
      });
    }

    // Record request
    record.timestamps.push(now);
    record.lastActionTimestamp = now;
    memoryStore.set(key, record);

    next();
  };
}

// 1. Global API rate limiter (300 req / min)
export const globalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'Limite globale de requêtes atteinte.',
  keyPrefix: 'global',
});

// 2. Authentication rate limiter (60 attempts / 15 min, no cooldown penalty)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 60,
  message: 'Trop de tentatives de connexion ou d’inscription.',
  cooldownMs: 0,
  keyPrefix: 'auth',
});

// 3. Comments anti-flood limiter (8 comments / 2 min, min 5 seconds between comments)
export const commentsRateLimiter = createRateLimiter({
  windowMs: 2 * 60 * 1000,
  maxRequests: 8,
  cooldownMs: 5000, // 5-second cooldown
  message: 'Vous commentez trop vite.',
  keyPrefix: 'comment',
});

// 4. Article creation limiter (5 articles / 10 min)
export const articleCreationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  cooldownMs: 10000, // 10-second cooldown
  message: 'Limite de publication d’articles atteinte.',
  keyPrefix: 'article_create',
});

// 5. Media upload limiter (15 uploads / 10 min)
export const mediaUploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  cooldownMs: 2000,
  message: 'Limite de téléversement de médias atteinte.',
  keyPrefix: 'media_upload',
});

// 6. Reports limiter (5 reports / 15 min)
export const reportRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  cooldownMs: 5000,
  message: 'Trop de signalements envoyés.',
  keyPrefix: 'report',
});

// 7. Likes limiter (30 likes / min)
export const likesRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 35,
  message: 'Action de mention j’aime trop fréquente.',
  keyPrefix: 'like',
});

// Helper to check for duplicate comment spam
export function checkDuplicateComment(userId: string, articleId: string, content: string): boolean {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ');
  const key = `dup_comment:${userId}:${articleId}`;
  const record = memoryStore.get(key);

  const now = Date.now();
  if (record.lastActionContentHash === normalized && record.lastActionTimestamp && now - record.lastActionTimestamp < 10 * 60 * 1000) {
    return true; // Duplicate detected within 10 minutes
  }

  record.lastActionContentHash = normalized;
  record.lastActionTimestamp = now;
  memoryStore.set(key, record);
  return false;
}
