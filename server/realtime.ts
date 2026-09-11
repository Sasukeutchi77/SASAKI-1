import http from 'http';
import express, { Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from './db';
import { isMasterAdmin } from './config/masterAccounts';

export interface RealtimeEvent<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
}

interface ClientMeta {
  ws: WebSocket;
  userId?: string;
  email?: string;
  role?: string;
  isAlive: boolean;
}

const recentEvents: RealtimeEvent[] = [];
const MAX_RECENT_EVENTS = 100;

export function getRecentEvents(since: number = 0): RealtimeEvent[] {
  return since > 0 ? recentEvents.filter((e) => e.timestamp > since) : recentEvents.slice(0, 30);
}

function recordEvent(type: string, payload: any): RealtimeEvent {
  const event: RealtimeEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
  };

  recentEvents.unshift(event);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.pop();
  }

  return event;
}

class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientMeta> = new Set();
  private sseClients: Set<{ res: Response; userId?: string; email?: string; role?: string }> = new Set();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  public registerRoutes(app: express.Application) {
    // 1. Server-Sent Events (SSE) route as fallback / complementary stream
    app.get('/api/sync/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      let userId: string | undefined = undefined;
      let email: string | undefined = undefined;
      let role: string | undefined = undefined;
      const token = req.query.token as string;
      if (token) {
        const verified = verifyToken(token);
        if (verified) {
          userId = verified.userId;
          email = verified.email;
          role = verified.role;
        }
      }

      const sseClient = { res, userId, email, role };
      this.sseClients.add(sseClient);

      // Initial connection ping
      res.write(`data: ${JSON.stringify({ type: 'connected', payload: { serverTime: Date.now() } })}\n\n`);

      req.on('close', () => {
        this.sseClients.delete(sseClient);
      });
    });

    // 2. Catch-up endpoint for reconnected clients
    app.get('/api/sync/latest', (req, res) => {
      const since = parseInt(String(req.query.since || '0'), 10);
      const filtered = since > 0 ? recentEvents.filter((e) => e.timestamp > since) : recentEvents.slice(0, 30);
      return res.json({ events: filtered, serverTime: Date.now() });
    });

    // 3. Stats endpoint
    app.get('/api/sync/stats', (_req, res) => {
      return res.json({
        wsClients: this.clients.size,
        sseClients: this.sseClients.size,
        totalEventsCached: recentEvents.length,
      });
    });
  }

  public attachServer(server: http.Server) {
    // WebSocket Server on /ws path
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const meta: ClientMeta = {
        ws,
        isAlive: true,
      };

      try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        if (token) {
          const verified = verifyToken(token);
          if (verified) {
            meta.userId = verified.userId;
            meta.email = verified.email;
            meta.role = verified.role;
          }
        }
      } catch {
        // Ignored
      }

      this.clients.add(meta);

      try {
        ws.send(
          JSON.stringify({
            type: 'connected',
            payload: {
              serverTime: Date.now(),
              activeConnections: this.clients.size,
            },
          })
        );
      } catch {
        // Ignored
      }

      ws.on('pong', () => {
        meta.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'auth' && data.token) {
            const verified = verifyToken(data.token);
            if (verified) {
              meta.userId = verified.userId;
              meta.email = verified.email;
              meta.role = verified.role;
              ws.send(JSON.stringify({ type: 'auth:confirmed', userId: verified.userId }));
            }
          } else if (data.type === 'ping') {
            meta.isAlive = true;
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch {
          // Ignored
        }
      });

      ws.on('close', () => {
        this.clients.delete(meta);
      });

      ws.on('error', () => {
        this.clients.delete(meta);
      });
    });

    // Periodic Heartbeat every 20 seconds
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        for (const meta of this.clients) {
          if (!meta.isAlive) {
            meta.ws.terminate();
            this.clients.delete(meta);
            continue;
          }
          meta.isAlive = false;
          try {
            meta.ws.ping();
          } catch {
            this.clients.delete(meta);
          }
        }

        for (const sse of this.sseClients) {
          try {
            sse.res.write(':keepalive\n\n');
          } catch {
            this.sseClients.delete(sse);
          }
        }
      }, 20000);
    }
  }

  /**
   * Broadcast an event to all connected clients (WebSocket + SSE)
   */
  public broadcast<T = any>(type: string, payload: T): RealtimeEvent<T> {
    const event = recordEvent(type, payload);
    const msgString = JSON.stringify(event);
    const sseString = `data: ${msgString}\n\n`;

    // 1. Deliver to all WebSocket clients
    for (const meta of this.clients) {
      if (meta.ws.readyState === WebSocket.OPEN) {
        try {
          meta.ws.send(msgString);
        } catch {
          this.clients.delete(meta);
        }
      }
    }

    // 2. Deliver to all SSE clients
    for (const sse of this.sseClients) {
      try {
        sse.res.write(sseString);
      } catch {
        this.sseClients.delete(sse);
      }
    }

    return event;
  }

  /**
   * Broadcast specifically to a user's connected sessions
   */
  public broadcastToUser<T = any>(userId: string, type: string, payload: T): RealtimeEvent<T> {
    const event = recordEvent(type, payload);
    const msgString = JSON.stringify(event);
    const sseString = `data: ${msgString}\n\n`;

    for (const meta of this.clients) {
      if (meta.userId === userId && meta.ws.readyState === WebSocket.OPEN) {
        try {
          meta.ws.send(msgString);
        } catch {
          this.clients.delete(meta);
        }
      }
    }

    for (const sse of this.sseClients) {
      if (sse.userId === userId) {
        try {
          sse.res.write(sseString);
        } catch {
          this.sseClients.delete(sse);
        }
      }
    }

    return event;
  }

  /**
   * Broadcast specifically to all connected administrators (WebSocket + SSE)
   */
  public broadcastToAdmins<T = any>(type: string, payload: T): RealtimeEvent<T> {
    const event = recordEvent(type, payload);
    const msgString = JSON.stringify(event);
    const sseString = `data: ${msgString}\n\n`;

    for (const meta of this.clients) {
      const isAdmin = meta.role === 'admin' || (meta.email && isMasterAdmin(meta.email));
      if (isAdmin && meta.ws.readyState === WebSocket.OPEN) {
        try {
          meta.ws.send(msgString);
        } catch {
          this.clients.delete(meta);
        }
      }
    }

    for (const sse of this.sseClients) {
      const isAdmin = sse.role === 'admin' || (sse.email && isMasterAdmin(sse.email));
      if (isAdmin) {
        try {
          sse.res.write(sseString);
        } catch {
          this.sseClients.delete(sse);
        }
      }
    }

    return event;
  }
}

export const realtimeHub = new RealtimeHub();
