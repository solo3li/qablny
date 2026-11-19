import { axiosClient } from './axiosClient';
import { centrifugoManager } from './centrifugoClient';

export interface JoinQueueRequest {
  GenderPref?: number;
  MinAge?: number;
  MaxAge?: number;
  CallType?: 'video' | 'voice';
}

class MatchSignalRService {
  // Callbacks
  private onQueueJoinedCallback: (() => void) | null = null;
  private onQueueLeftCallback: (() => void) | null = null;
  private onMatchFoundCallback: ((payload: {
    RoomName: string;
    LiveKitToken: string;
    PartnerId: string;
    PartnerName: string;
    PartnerImage: string;
  }) => void) | null = null;
  private onMatchSkippedCallback: (() => void) | null = null;
  private onBoostActivatedCallback: ((payload: any) => void) | null = null;
  private onQueueTimeoutCallback: ((payload: any) => void) | null = null;

  private isConnected = false;

  public getConnection() {
    return {
      state: this.isConnected ? 'Connected' : 'Disconnected',
      invoke: async (methodName: string, ...args: any[]) => {
        switch (methodName) {
          case 'JoinQueue':
            return await this.joinQueue(args[0]);
          case 'LeaveQueue':
            return await this.leaveQueue();
          case 'Skip':
            return await this.skip();
          case 'Boost':
            return await this.boost();
          default:
            console.warn(`[Centrifugo Match] Unknown invoke method: ${methodName}`);
        }
      }
    };
  }

  public async connect() {
    if (this.isConnected) return;

    await centrifugoManager.connect();
    this.isConnected = true;

    // Listen to personal channel match events
    centrifugoManager.on('MatchFound', (payload: any) => {
      console.log('Centrifugo Match Found!', payload);
      const matchObj = payload.match || payload;
      const normalized = {
        RoomName: matchObj.roomName || matchObj.RoomName || payload.roomName || payload.RoomName,
        LiveKitToken: matchObj.liveKitToken || matchObj.LiveKitToken || payload.liveKitToken || payload.LiveKitToken,
        PartnerId: matchObj.matchedUser?.id || payload.matchedUser?.id || payload.partnerId || payload.PartnerId,
        PartnerName: matchObj.matchedUser?.name || payload.matchedUser?.name || payload.partnerName || payload.PartnerName || 'مستخدم',
        PartnerImage: matchObj.matchedUser?.profileImageUrl || payload.matchedUser?.profileImageUrl || payload.partnerImage || payload.PartnerImage || '',
        ...payload,
        ...matchObj
      };
      this.onMatchFoundCallback?.(normalized);
    });

    centrifugoManager.on('MatchSkipped', () => {
      console.log('Centrifugo Match Skipped by Partner');
      this.onMatchSkippedCallback?.();
    });

    centrifugoManager.on('BoostActivated', (payload: any) => {
      console.log('Centrifugo Boost Activated!', payload);
      this.onBoostActivatedCallback?.(payload);
    });

    centrifugoManager.on('QueueTimeout', (payload: any) => {
      console.log('Centrifugo Queue Timeout:', payload);
      this.onQueueTimeoutCallback?.(payload);
    });

    console.log('Centrifugo Connected to Match Channel');
  }

  // Setters for callbacks
  public setOnQueueJoined(cb: () => void) { this.onQueueJoinedCallback = cb; }
  public setOnQueueLeft(cb: () => void) { this.onQueueLeftCallback = cb; }
  public setOnMatchFound(cb: (payload: any) => void) { this.onMatchFoundCallback = cb; }
  public setOnMatchSkipped(cb: () => void) { this.onMatchSkippedCallback = cb; }
  public setOnBoostActivated(cb: (payload: any) => void) { this.onBoostActivatedCallback = cb; }
  public setOnQueueTimeout(cb: (payload: any) => void) { this.onQueueTimeoutCallback = cb; }

  // Actions
  public async joinQueue(filters: JoinQueueRequest) {
    if (!this.isConnected) await this.connect();

    try {
      const res = await axiosClient.post('/match/queue/join', {
        preferredGender: filters.GenderPref,
        minAge: filters.MinAge,
        maxAge: filters.MaxAge,
        callType: filters.CallType
      });

      const data = res.data;
      const matchObj = data.match || data;
      if (data.status === 'queued') {
        this.onQueueJoinedCallback?.();
      } else if (matchObj.roomName) {
        // Instant match from Redis Lua
        const normalized = {
          RoomName: matchObj.roomName,
          LiveKitToken: matchObj.liveKitToken,
          PartnerId: matchObj.matchedUser?.id,
          PartnerName: matchObj.matchedUser?.name || 'مستخدم',
          PartnerImage: matchObj.matchedUser?.profileImageUrl || '',
          ...data,
          ...matchObj
        };
        this.onMatchFoundCallback?.(normalized);
      }
      return data;
    } catch (e) {
      console.error('joinQueue failed:', e);
      throw e;
    }
  }

  public async leaveQueue() {
    try {
      await axiosClient.post('/match/queue/leave');
      this.onQueueLeftCallback?.();
    } catch (e) {
      console.error('leaveQueue failed:', e);
    }
  }

  public async skip() {
    try {
      const res = await axiosClient.post('/match/skip');
      return res.data;
    } catch (e) {
      console.error('skip failed:', e);
    }
  }

  public async boost() {
    if (!this.isConnected) await this.connect();
    try {
      const res = await axiosClient.post('/match/boost');
      return res.data;
    } catch (e) {
      console.error('boost failed:', e);
      throw e;
    }
  }

  public async getBoostStatus() {
    try {
      const res = await axiosClient.get('/match/boost/status');
      return res.data;
    } catch (e) {
      console.error('getBoostStatus failed:', e);
      throw e;
    }
  }

  public async disconnect() {
    this.isConnected = false;
  }
}

export const matchSignalR = new MatchSignalRService();
