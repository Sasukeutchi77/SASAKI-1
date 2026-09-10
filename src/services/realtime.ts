import { getToken } from './api';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

export type RealtimeEventHandler<T = any> = (payload: T) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private status: RealtimeStatus = 'disconnected';
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  private statusListeners: Set<(status: RealtimeStatus) => void> = new Set();
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private lastEventTimestamp = Date.now() - 120000;
  private processedEventIds = new Set<string>();
  private isExplicitlyClosed = false;
  private isCatchingUp = false;

  constructor() {
    // Listen for tab focus/visibility change to catch up on any missed articles/comments
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.catchUp();
          if (this.status === 'disconnected') {
            this.connect();
          }
        }
      });
      window.addEventListener('online', () => {
        this.catchUp();
        this.connect();
      });

      // Background periodic synchronization heartbeat to guarantee no missed publications
      setInterval(() => {
        if (document.visibilityState === 'visible' || this.status !== 'connected') {
          this.catchUp();
        }
      }, 20000);
    }
  }

  public getStatus(): RealtimeStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: RealtimeStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(status: RealtimeStatus) {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((cb) => cb(status));
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    this.isExplicitlyClosed = false;

    // Clear any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Try WebSocket first
    this.connectWebSocket();
  }

  private connectWebSocket() {
    try {
      this.setStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = getToken();
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
      const wsUrl = `${protocol}//${window.location.host}/ws${tokenQuery}`;

      if (this.ws) {
        try {
          this.ws.close();
        } catch {
          // Ignored
        }
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;

        // Catch up on any events that might have occurred while disconnected
        this.catchUp();

        // If authenticated, send token handshake as well
        const currentToken = getToken();
        if (currentToken && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'auth', token: currentToken }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingEvent(data);
        } catch {
          // Ignored
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.setStatus('disconnected');
          // Start SSE fallback while WS reconnects
          this.ensureSseFallback();
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        if (!this.isExplicitlyClosed) {
          this.setStatus('disconnected');
          this.ensureSseFallback();
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.warn('[Realtime] WebSocket init failed, falling back to SSE:', err);
      this.ensureSseFallback();
      this.scheduleReconnect();
    }
  }

  private ensureSseFallback() {
    if (this.sse && this.sse.readyState !== EventSource.CLOSED) return;

    try {
      const token = getToken();
      const sseUrl = `/api/sync/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      this.sse = new EventSource(sseUrl);

      this.sse.onopen = () => {
        if (this.status !== 'connected') {
          this.setStatus('connected');
        }
        this.catchUp();
      };

      this.sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingEvent(data);
        } catch {
          // Ignored
        }
      };

      this.sse.onerror = () => {
        try {
          this.sse?.close();
          this.sse = null;
        } catch {
          // Ignored
        }
      };
    } catch {
      // Ignored
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;
    this.reconnectAttempts++;
    const delay = Math.min(15000, Math.pow(1.5, this.reconnectAttempts) * 1000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, delay);
  }

  private handleIncomingEvent(data: any) {
    if (!data || !data.type) return;

    // Skip duplicate events
    if (data.id) {
      if (this.processedEventIds.has(data.id)) return;
      this.processedEventIds.add(data.id);
      if (this.processedEventIds.size > 1000) {
        // Clean oldest IDs
        const first = Array.from(this.processedEventIds).slice(0, 200);
        first.forEach((id) => this.processedEventIds.delete(id));
      }
    }

    if (data.timestamp) {
      this.lastEventTimestamp = Math.max(this.lastEventTimestamp, data.timestamp);
    }

    // Dispatch to registered event listeners
    const handlers = this.listeners.get(data.type);
    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => {
        try {
          handler(data.payload);
        } catch (err) {
          console.error(`[Realtime] Handler error for ${data.type}:`, err);
        }
      });
    }

    // Also dispatch wildcard listeners
    const wildcardHandlers = this.listeners.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error('[Realtime] Wildcard handler error:', err);
        }
      });
    }
  }

  /**
   * Catch up on any events missed while disconnected or backgrounded
   */
  public async catchUp() {
    if (this.isCatchingUp) return;
    this.isCatchingUp = true;
    try {
      const since = this.lastEventTimestamp > 0 ? this.lastEventTimestamp : Date.now() - 60000;
      const res = await fetch(`/api/sync/latest?since=${since}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.events)) {
        // Process events in chronological order
        const sorted = [...data.events].sort((a, b) => a.timestamp - b.timestamp);
        sorted.forEach((event) => this.handleIncomingEvent(event));
      }
      if (data.serverTime) {
        this.lastEventTimestamp = Math.max(this.lastEventTimestamp, data.serverTime);
      }
    } catch {
      // Ignored
    } finally {
      this.isCatchingUp = false;
    }
  }

  public on<T = any>(eventType: string, handler: RealtimeEventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Auto-connect on first listener registration
    if (this.status === 'disconnected') {
      this.connect();
    }

    return () => this.off(eventType, handler);
  }

  public off<T = any>(eventType: string, handler: RealtimeEventHandler<T>) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignored
      }
      this.ws = null;
    }
    if (this.sse) {
      try {
        this.sse.close();
      } catch {
        // Ignored
      }
      this.sse = null;
    }
    this.setStatus('disconnected');
  }
}

export const realtime = new RealtimeService();
