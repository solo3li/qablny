import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './axiosClient';

export interface JoinQueueRequest {
  GenderPref?: number;
  MinAge?: number;
  MaxAge?: number;
  CallType?: 'video' | 'voice';
}

class MatchSignalRService {
  private connection: signalR.HubConnection | null = null;
  
  // Callbacks
  private onQueueJoinedCallback: (() => void) | null = null;
  private onQueueLeftCallback: (() => void) | null = null;
  private onMatchSkippedCallback: (() => void) | null = null;
  private onMatchFoundCallback: ((payload: { RoomName: string, LiveKitToken: string, PartnerId: string, PartnerName: string, PartnerImage: string }) => void) | null = null;

  public getConnection() { return this.connection; }

  public async connect() {
    if (this.connection) return;

    const token = await AsyncStorage.getItem('accessToken');
    if (!token) throw new Error("No access token found");

    const hubUrl = API_BASE_URL.replace('/api', '') + '/hubs/match';

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on("QueueJoined", () => {
      console.log("Match Queue Joined");
      this.onQueueJoinedCallback?.();
    });

    this.connection.on("QueueLeft", () => {
      console.log("Match Queue Left");
      this.onQueueLeftCallback?.();
    });

    this.connection.on("MatchFound", (payload: any) => {
      console.log("Match Found!", payload);
      this.onMatchFoundCallback?.(payload);
    });

    this.connection.on("MatchSkipped", () => {
      console.log("Partner Skipped the match");
      this.onMatchSkippedCallback?.();
    });

    await this.connection.start();
    console.log("SignalR Connected to Match Hub");
  }

  // Setters for callbacks
  public setOnQueueJoined(cb: () => void) { this.onQueueJoinedCallback = cb; }
  public setOnQueueLeft(cb: () => void) { this.onQueueLeftCallback = cb; }
  public setOnMatchFound(cb: (payload: any) => void) { this.onMatchFoundCallback = cb; }
  public setOnMatchSkipped(cb: () => void) { this.onMatchSkippedCallback = cb; }

  // Actions
  public async joinQueue(filters: JoinQueueRequest) {
    if (!this.connection) await this.connect();
    await this.connection?.invoke("JoinQueue", filters);
  }

  public async leaveQueue() {
    if (!this.connection) return;
    await this.connection.invoke("LeaveQueue");
  }

  public async skip() {
    if (!this.connection) return;
    await this.connection.invoke("Skip");
  }

  public async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const matchSignalR = new MatchSignalRService();
