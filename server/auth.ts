import { Request, Response, NextFunction } from 'express';
import { db, verifyToken, UserWithPassword } from './db';
import { UserRole } from '../src/types';
import { verifyFirebaseToken } from './firebaseAdmin';

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
    const user = db.getData().users.find((u) => u.id === payload.userId);
    if (user) {
      req.user = user;
    }
    return next();
  }

  // 2. Test Firebase ID token via Firebase Admin
  try {
    const decoded = await verifyFirebaseToken(token);
    if (decoded && decoded.uid) {
      const data = db.getData();
      let user = data.users.find((u) => u.id === decoded.uid || u.email.toLowerCase() === (decoded.email || '').toLowerCase());
      
      if (!user && decoded.email) {
        // Auto-provision user record in DB from Firebase user
        const now = new Date().toISOString();
        const customRole = (decoded.role as UserRole) || 'user';
        user = {
          id: decoded.uid,
          email: decoded.email.toLowerCase(),
          passwordHash: '',
          passwordSalt: '',
          name: decoded.name || decoded.email.split('@')[0],
          role: customRole === 'admin' ? 'admin' : (customRole === 'journalist' ? 'journalist' : 'user'),
          avatar: decoded.picture || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
          bio: 'Membre de la communauté purge-info',
          isVerified: false,
          verificationStatus: 'none',
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

export const requireAdmin = requireRole('admin');
export const requireJournalistOrAdmin = requireRole('journalist', 'admin');
