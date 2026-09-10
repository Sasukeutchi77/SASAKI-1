import { Request, Response, NextFunction } from 'express';
import { db, verifyToken, UserWithPassword } from './db';
import { UserRole } from '../src/types';
import { verifyFirebaseToken } from './firebaseAdmin';
import { isMasterAdmin } from './config/masterAccounts';

export interface AuthenticatedRequest extends Request {
  user?: UserWithPassword;
}

export async function extractUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  
  // 1. First test internal JWT token
  const payload = verifyToken(token);
  if (payload) {
    const data = db.getData();
    let user = data.users.find(
      (u) =>
        (payload.userId && u.id === payload.userId) ||
        (payload.email && u.email.toLowerCase() === payload.email.toLowerCase())
    );

    const isSuperAdminEmail = payload.email ? isMasterAdmin(payload.email) : false;

    if (!user && payload.email) {
      // Auto-restore / provision user if memory or /tmp DB was recycled on serverless
      const now = new Date().toISOString();
      user = {
        id: payload.userId || `usr_${Date.now()}`,
        email: payload.email.toLowerCase(),
        passwordHash: '',
        passwordSalt: '',
        name: payload.email.split('@')[0],
        role: isSuperAdminEmail ? 'admin' : (payload.role as UserRole) || 'user',
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        bio: isSuperAdminEmail
          ? 'Compte Principal PURGE-INFO'
          : 'Citoyen et lecteur sur PURGE-INFO.',
        isVerified: isSuperAdminEmail,
        verificationStatus: isSuperAdminEmail ? 'approved' : 'none',
        status: 'active',
        followersCount: 0,
        followingCount: 0,
        createdAt: now,
        lastLoginAt: now,
      };
      data.users.push(user);
      db.save();
    }

    if (user) {
      if (isMasterAdmin(user.email)) {
        if (user.role !== 'admin') {
          user.role = 'admin';
          user.isVerified = true;
          user.verificationStatus = 'approved';
          db.save();
        }
      } else if (user.role === 'admin') {
        user.role = 'user';
        db.save();
      }
      req.user = user;
    }
    return next();
  }

  // 2. Test Firebase ID token via Firebase Admin or fallback parser
  try {
    const decoded = await verifyFirebaseToken(token);
    if (decoded && (decoded.uid || decoded.email)) {
      const data = db.getData();
      let user = data.users.find(
        (u) =>
          (decoded.uid && u.id === decoded.uid) ||
          (decoded.email && u.email.toLowerCase() === decoded.email.toLowerCase())
      );

      const isSuperAdminEmail = decoded.email ? isMasterAdmin(decoded.email) : false;

      if (!user && decoded.email) {
        // Auto-provision user record in DB from Firebase user
        const now = new Date().toISOString();
        user = {
          id: decoded.uid || `usr_fb_${Date.now()}`,
          email: decoded.email.toLowerCase(),
          passwordHash: '',
          passwordSalt: '',
          name: decoded.name || decoded.email.split('@')[0],
          role: isSuperAdminEmail ? 'admin' : 'user',
          avatar:
            decoded.picture ||
            `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
          bio: isSuperAdminEmail
            ? 'Compte Principal de la plateforme PURGE-INFO.'
            : 'Citoyen et lecteur sur PURGE-INFO.',
          isVerified: isSuperAdminEmail,
          verificationStatus: isSuperAdminEmail ? 'approved' : 'none',
          status: 'active',
          followersCount: 0,
          followingCount: 0,
          createdAt: now,
          lastLoginAt: now,
        };
        data.users.push(user);
        db.save();
      } else if (user && isSuperAdminEmail && user.role !== 'admin') {
        user.role = 'admin';
        user.isVerified = true;
        db.save();
      }

      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore invalid token
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise pour cette action.' });
  }
  if (req.user.status === 'suspended') {
    return res.status(403).json({
      error: 'Votre compte a été suspendu par l’administration. Vos droits de publication et d’interaction sont révoqués.',
      accountSuspended: true,
    });
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise.' });
    }
    if (req.user.status === 'suspended') {
      return res.status(403).json({
        error: 'Votre compte a été suspendu par l’administration.',
        accountSuspended: true,
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Accès non autorisé. Rôle requis: ${roles.join(' ou ')}. Votre rôle actuel: ${req.user.role}`,
      });
    }
    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  if (req.user.status === 'suspended') {
    return res.status(403).json({
      error: 'Votre compte a été suspendu par l’administration.',
      accountSuspended: true,
    });
  }
  if (!isMasterAdmin(req.user.email)) {
    return res.status(403).json({
      error: 'Accès strictement réservé aux 4 comptes administrateurs officiels de la plateforme.',
    });
  }
  next();
}

export const requireJournalistOrAdmin = requireRole('journalist', 'admin');
