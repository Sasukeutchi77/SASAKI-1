import type { IncomingMessage, ServerResponse } from 'http';
import { createExpressApp } from '../server/app';
import { db } from '../server/db';

// Non-blocking initialization on container cold start
db.initCloudPersistence().catch((err) => {
  console.warn('[Vercel Serverless] Cloud persistence initialization check:', err);
});

const app = createExpressApp();

export default function handler(req: any, res: any) {
  // If Vercel pre-parsed or provided body as a string, parse it into an object for Express
  if (req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // ignore
    }
  }

  // Ensure socket and connection exist in serverless environments to prevent Express getter issues
  if (!req.socket) {
    req.socket = { remoteAddress: (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '127.0.0.1' };
  }

  // Detect original path from Vercel headers if req.url was rewritten
  const matchedPath =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-vercel-matched-path'] as string) ||
    (req.headers['x-forwarded-uri'] as string);

  if (matchedPath && matchedPath.startsWith('/api')) {
    const queryIndex = req.url ? req.url.indexOf('?') : -1;
    const query = queryIndex !== -1 ? req.url.slice(queryIndex) : '';
    req.url = matchedPath.split('?')[0] + query;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
