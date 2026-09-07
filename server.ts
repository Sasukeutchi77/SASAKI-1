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
    res.json({ status: 'ok', name: 'FasoInfo API', version: '1.0.0' });
  });

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/articles', articlesRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/search', searchRouter);

  // Global safe error handler for API exceptions
  app.use('/api', safeErrorHandler);

  // Vite Middleware or Static Production Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FasoInfo platform running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
