import type { IncomingMessage, ServerResponse } from 'http';
import { createExpressApp } from '../server/app';
import { db } from '../server/db';

let initialized = false;
let appInstance: any = null;

function getApp() {
  if (!appInstance) {
    appInstance = createExpressApp();
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  // Ensure Cloud Firestore persistence & seed data are initialized
  if (!initialized) {
    try {
      await db.initCloudPersistence();
    } catch (err) {
      console.warn('[Vercel Serverless] Cloud persistence initialization check:', err);
    }
    initialized = true;
  }

  const app = getApp();

  // Ensure socket and connection exist in serverless environments to prevent Express getter issues
  if (!req.socket) {
    req.socket = { remoteAddress: (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '127.0.0.1' };
  }

  // Normalize path if Vercel strips the /api prefix or passes relative route
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
