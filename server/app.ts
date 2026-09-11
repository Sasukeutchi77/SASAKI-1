import express from 'express';
import path from 'path';
import { extractUser } from './auth';
import { authRouter } from './routes/auth';
import { articlesRouter } from './routes/articles';
import { categoriesRouter } from './routes/categories';
import { usersRouter } from './routes/users';
import { adminRouter } from './routes/admin';
import { mediaRouter } from './routes/media';
import { searchRouter } from './routes/search';
import { housesRouter } from './routes/houses';
import { realtimeHub } from './realtime';
import { securityHeaders, safeErrorHandler } from './security/middleware';
import { globalApiLimiter } from './security/rateLimiter';

export function createExpressApp() {
  const app = express();

  // Security HTTP headers
  app.use(securityHeaders);

  // JSON and urlencoded body parser with sensible payload limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Extract user authorization token
  app.use(extractUser);

  // Apply Global API rate limiting to all /api routes
  app.use('/api', globalApiLimiter);

  // Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      name: 'PurgeInfo API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      platform: process.env.NETLIFY ? 'netlify-serverless' : 'node-server',
    });
  });

  // Serve persistent uploads directly
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/articles', articlesRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/media-houses', housesRouter);
  app.use('/api/search', searchRouter);

  // Real-time synchronization routes (SSE stream and catch-up buffer)
  realtimeHub.registerRoutes(app);

  // Global safe error handler for API exceptions
  app.use('/api', safeErrorHandler);

  return app;
}
