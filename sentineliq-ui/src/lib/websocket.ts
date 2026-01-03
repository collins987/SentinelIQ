import { useEffect, useRef, useCallback } from 'react';
import { useJobsStore, useEventsStore, useNotificationsStore, useSystemHealthStore } from '@/stores';

type MessageHandler = (data: unknown) => void;

interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: string;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WS] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WS] Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('[WS] Connection closed');
          this.isConnecting = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message.payload));
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  subscribe(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  send(type: string, payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
    } else {
      console.warn('[WS] Cannot send message - not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
    wsManager = new WebSocketManager(wsUrl);
  }
  return wsManager;
}

// React hook for WebSocket subscriptions
export function useWebSocket() {
  const wsRef = useRef<WebSocketManager | null>(null);
  const addJob = useJobsStore((s) => s.addJob);
  const updateJob = useJobsStore((s) => s.updateJob);
  const addEvent = useEventsStore((s) => s.addEvent);
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const setServices = useSystemHealthStore((s) => s.setServices);

  useEffect(() => {
    wsRef.current = getWebSocketManager();
    
    wsRef.current.connect().catch(console.error);

    // Subscribe to different message types
    const unsubscribers = [
      wsRef.current.subscribe('job:created', (data) => {
        addJob(data as any);
      }),
      wsRef.current.subscribe('job:updated', (data: any) => {
        updateJob(data.id, data);
      }),
      wsRef.current.subscribe('event', (data) => {
        addEvent(data as any);
      }),
      wsRef.current.subscribe('notification', (data) => {
        addNotification(data as any);
      }),
      wsRef.current.subscribe('health:update', (data) => {
        setServices(data as any);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [addJob, updateJob, addEvent, addNotification, setServices]);

  const send = useCallback((type: string, payload: unknown) => {
    wsRef.current?.send(type, payload);
  }, []);

  return { send, isConnected: wsRef.current?.isConnected ?? false };
}
