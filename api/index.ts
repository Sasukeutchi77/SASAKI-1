import type { IncomingMessage, ServerResponse } from 'http';
import { createExpressApp } from '../server/app';
import { db } from '../server/db';

// Non-blocking initialization on container cold start
db.initCloudPersistence().catch((err) => {
  console.warn('[Vercel Serverless] Cloud persistence initialization check:', err);
});

const app = createExpressApp();

export default function handler(req: any, res: any) {
  // 1. CORS headers and OPTIONS preflight handler for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 2. Protect Express body-parser: if Vercel already consumed or provided req.body
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // preserve original string
      }
    }
    // Flag _body = true so express.json() doesn't attempt to read from the ended stream
    req._body = true;
  }

  // 3. Ensure socket and remoteAddress exist in serverless runtime
  if (!req.socket) {
    req.socket = {
      remoteAddress:
        (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '127.0.0.1',
    };
  }

  // 4. Robust URL reconstruction for Vercel Serverless Functions
  let resolvedUrl = req.url || '/';

  // If Vercel passed path parameters from dynamic route [...path] or rewrite query (?path=...)
  if (req.query && req.query.path) {
    const subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
    const queryIdx = resolvedUrl.indexOf('?');
    const queryString = queryIdx !== -1 ? resolvedUrl.slice(queryIdx) : '';
    resolvedUrl = `/api/${subpath.replace(/^\/+/, '')}${queryString}`;
    // Clean up internal query param so it doesn't pollute endpoint queries
    delete req.query.path;
  } else {
    // Check if original requested URI is stored in Vercel headers
    const forwardedUri = req.headers && (req.headers['x-forwarded-uri'] || req.headers['x-vercel-forwarded-for-path']);
    if (forwardedUri && typeof forwardedUri === 'string' && forwardedUri.startsWith('/api')) {
      resolvedUrl = forwardedUri;
    } else if (!resolvedUrl.startsWith('/api')) {
      resolvedUrl = `/api${resolvedUrl.startsWith('/') ? '' : '/'}${resolvedUrl}`;
    }
  }

  req.url = resolvedUrl;

  return app(req, res);
}
