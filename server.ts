import express from 'express';
import path from 'path';
import { createExpressApp } from './server/app';
import { realtimeHub } from './server/realtime';
import { db } from './server/db';

async function startServer() {
  // Initialize Cloud Firestore synchronization before accepting incoming traffic
  try {
    await db.initCloudPersistence();
  } catch (err) {
    console.warn('[Server] Cloud Firestore initialization deferred:', err);
  }

  const app = createExpressApp();
  // In production (Render, Cloud Run, etc.), use the PORT assigned by the environment (e.g. 10000).
  // In local development, default to 3000.
  const PORT = process.env.NODE_ENV === 'production' && process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : (process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : 3000);

  // Vite Middleware or Static Production Serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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
