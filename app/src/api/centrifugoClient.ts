import { Centrifuge, Subscription } from 'centrifuge';
import { axiosClient } from './axiosClient';

type EventCallback = (data: any) => void;

class CentrifugoManager {
  private client: Centrifuge | null = null;
  private userSub: Subscription | null = null;
  private channelSubs: Map<string, Subscription> = new Map();
  private userChannel: string = '';
  private isConnecting: boolean = false;
  private eventHandlers: Map<string, Set<EventCallback>> = new Map();

  public isConnected(): boolean {
    return this.client !== null && this.client.state === 'connected';
  }

  public async connect(): Promise<void> {
    if (this.client && (this.client.state === 'connected' || this.client.state === 'connecting')) {
      return;
    }
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const res = await axiosClient.get('/realtime/token');
      const { token, wsUrl, channel } = res.data;
      this.userChannel = channel;

      console.log(`[Centrifugo] Connecting to ${wsUrl} on channel ${channel}...`);

      this.client = new Centrifuge(wsUrl, {
        token: token,
      });

      this.client.on('connected', (ctx) => {
        console.log('[Centrifugo] Connected successfully:', ctx);
      });

      this.client.on('disconnected', (ctx) => {
        console.log('[Centrifugo] Disconnected:', ctx);
      });

      this.client.on('error', (ctx) => {
        console.error('[Centrifugo] Connection error:', ctx);
      });

      // Subscribe to user channel
      this.userSub = this.client.newSubscription(channel);
      this.userSub.on('publication', (ctx) => {
        const payload = ctx.data;
        if (payload && payload.event) {
          this.dispatchEvent(payload.event, payload.data);
        }
      });
      this.userSub.subscribe();

      this.client.connect();
    } catch (e) {
      console.error('[Centrifugo] Failed to initialize connection:', e);
    } finally {
      this.isConnecting = false;
    }
  }

  public on(event: string, callback: EventCallback): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);

    return () => {
      this.eventHandlers.get(event)?.delete(callback);
    };
  }

  private dispatchEvent(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[Centrifugo] Error in handler for event ${event}:`, e);
        }
      });
    }
  }

  public subscribeChannel(channel: string, onPublication: EventCallback): () => void {
    if (!this.client) {
      this.connect().then(() => this.subscribeChannel(channel, onPublication));
    }

    let sub = this.channelSubs.get(channel);
    if (!sub && this.client) {
      sub = this.client.newSubscription(channel);
      this.channelSubs.set(channel, sub);
      sub.subscribe();
    }

    const handler = (ctx: any) => {
      const payload = ctx.data;
      if (payload && payload.event) {
        onPublication(payload.data || payload);
      } else {
        onPublication(payload);
      }
    };

    sub?.on('publication', handler);

    return () => {
      sub?.removeListener('publication', handler);
      if (sub?.listeners('publication').length === 0) {
        sub.unsubscribe();
        this.channelSubs.delete(channel);
      }
    };
  }

  public unsubscribeChannel(channel: string) {
    const sub = this.channelSubs.get(channel);
    if (sub) {
      sub.unsubscribe();
      this.channelSubs.delete(channel);
    }
  }

  public disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.userSub = null;
      this.channelSubs.clear();
    }
  }
}

export const centrifugoManager = new CentrifugoManager();
