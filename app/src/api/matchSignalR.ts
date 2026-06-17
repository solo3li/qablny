import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './axiosClient';

class MatchSignalRService {
  private connection: signalR.HubConnection | null = null;
  private onMatchFoundCallback: ((data: any) => void) | null = null;

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

    this.connection.on("MatchFound", (data: any) => {
      console.log("SignalR MatchFound:", data);
      if (this.onMatchFoundCallback) {
        this.onMatchFoundCallback(data);
      }
    });

    await this.connection.start();
    console.log("SignalR Connected to Match Hub");
  }

  public setOnMatchFound(callback: (data: any) => void) {
    this.onMatchFoundCallback = callback;
  }

  public async enterQueue(filters: { filterGender?: number; filterRegion?: string } = {}) {
    if (!this.connection) await this.connect();
    console.log("Entering queue with filters:", filters);
    await this.connection?.invoke("JoinQueue", filters);
  }

  public async leaveQueue() {
    if (!this.connection) return;
    await this.connection.invoke("LeaveQueue");
  }

  public async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const matchSignalR = new MatchSignalRService();
