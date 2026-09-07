import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth';
import { db } from '../db';

/**
 * Standard Security Headers Middleware
 * Protects against MIME-sniffing, XSS, and information leakage,
 * while preserving iframe compatibility for Google AI Studio preview.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy: Send full URL for same-origin, only origin for cross-origin
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Download options for Internet Explorer
  res.setHeader('X-Download-Options', 'noopen');

  // Disable client-side caching on sensitive API routes
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

/**
 * Suspended Account Guard
 * Ensures that any user with status === 'suspended' cannot perform write operations
 * (creating articles, posting comments, liking, reporting, or updating profile).
 */
export function requireActiveUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise pour effectuer cette action.' });
  }

  // Cross-check latest status in database to avoid stale JWT claims
  const data = db.getData();
  const latestUser = data.users.find((u) => u.id === req.user!.id);
  const currentStatus = latestUser ? latestUser.status : req.user.status;

  if (currentStatus === 'suspended') {
    return res.status(403).json({
      error: 'Votre compte a été suspendu par l’équipe de modération de purge-info. Vos droits de publication et d’interaction sont révoqués.',
      accountSuspended: true,
    });
  }

  next();
}

/**
 * Global Error Handler Middleware
 * Catches all uncaught exceptions without leaking internal stack traces or environment variables.
 */
export function safeErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled server error:', {
    path: req.path,
    method: req.method,
    message: err?.message || 'Unknown error',
  });

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: 'Une erreur interne est survenue sur le serveur. Veuillez réessayer ultérieurement.',
    status: 500,
  });
}
