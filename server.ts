import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { extractUser } from './server/auth';
import { authRouter } from './server/routes/auth';
import { articlesRouter } from './server/routes/articles';
import { categoriesRouter } from './server/routes/categories';
import { usersRouter } from './server/routes/users';
import { adminRouter } from './server/routes/admin';
import { mediaRouter } from './server/routes/media';
import { searchRouter } from './server/routes/search';
import { housesRouter } from './server/routes/houses';
import { realtimeHub } from './server/realtime';
import { securityHeaders, safeErrorHandler } from './server/security/middleware';
import { globalApiLimiter } from './server/security/rateLimiter';

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    res.json({ status: 'ok', name: 'PurgeInfo API', version: '1.0.0' });
  });

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

  // Vite Middleware or Static Production Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Attach WebSocket server for real-time synchronization
  realtimeHub.attachServer(server);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
