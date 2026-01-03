// ============================================================================
// Real-time WebSocket Service for Live Updates
// ============================================================================

import { RiskEvent, Alert, DashboardStats } from '../types';

type MessageHandler = (data: any) => void;

interface WebSocketHandlers {
  onRiskEvent?: (event: RiskEvent) => void;
  onAlert?: (alert: Alert) => void;
  onStatsUpdate?: (stats: Partial<DashboardStats>) => void;
  onRuleChange?: (data: { version: string; changes: string[] }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: WebSocketHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionalClose = false;
  private messageQueue: any[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  private get wsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_HOST || window.location.host;
    return `${protocol}//${host}/ws/events`;
  }

  connect(token: string, handlers: WebSocketHandlers = {}): void {
    this.handlers = handlers;
    this.isIntentionalClose = false;

    try {
      this.ws = new WebSocket(`${this.wsUrl}?token=${token}`);
      
      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.handlers.onConnect?.();
        
        // Flush message queue
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          this.send(msg);
        }
        
        // Start ping interval
        this.pingInterval = setInterval(() => {
          this.send({ type: 'ping' });
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.handlers.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.handlers.onDisconnect?.();
        
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        }
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
    }
  }

  private handleMessage(message: { type: string; payload: any; timestamp: string }): void {
    switch (message.type) {
      case 'risk_event':
        this.handlers.onRiskEvent?.(message.payload);
        break;
      case 'alert':
        this.handlers.onAlert?.(message.payload);
        break;
      case 'stats_update':
        this.handlers.onStatsUpdate?.(message.payload);
        break;
      case 'rule_change':
        this.handlers.onRuleChange?.(message.payload);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        console.log('[WS] Unknown message type:', message.type);
    }
  }

  private scheduleReconnect(token: string): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(token, this.handlers);
    }, delay);
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
    }
  }

  subscribe(channels: string[]): void {
    this.send({ type: 'subscribe', channels });
  }

  unsubscribe(channels: string[]): void {
    this.send({ type: 'unsubscribe', channels });
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
export default wsService;
