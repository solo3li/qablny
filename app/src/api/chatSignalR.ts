import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './axiosClient';

class ChatSignalRService {
  private connection: signalR.HubConnection | null = null;
  
  // Callbacks
  private onReceiveMessageCallback: ((msg: any) => void) | null = null;
  private onMessageSentCallback: ((msg: any) => void) | null = null;
  private onTypingStartedCallback: ((userId: string) => void) | null = null;
  private onTypingStoppedCallback: ((userId: string) => void) | null = null;
  private onMessagesReadCallback: ((userId: string) => void) | null = null;
  private onUserOnlineCallback: ((userId: string) => void) | null = null;
  private onUserOfflineCallback: ((userId: string) => void) | null = null;

  public async connect() {
    if (this.connection) return;

    const token = await AsyncStorage.getItem('accessToken');
    if (!token) throw new Error("No access token found");

    const hubUrl = API_BASE_URL.replace('/api', '') + '/hubs/chat';

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on("ReceiveMessage", (msg: any) => {
      console.log("🔥 SignalR ReceiveMessage:", msg);
      this.onReceiveMessageCallback?.(msg);
    });
    this.connection.on("MessageSent", (msg: any) => this.onMessageSentCallback?.(msg));
    this.connection.on("TypingStarted", (userId: string) => this.onTypingStartedCallback?.(userId));
    this.connection.on("TypingStopped", (userId: string) => this.onTypingStoppedCallback?.(userId));
    this.connection.on("MessagesRead", (userId: string) => this.onMessagesReadCallback?.(userId));
    this.connection.on("UserOnline", (userId: string) => this.onUserOnlineCallback?.(userId));
    this.connection.on("UserOffline", (userId: string) => this.onUserOfflineCallback?.(userId));

    await this.connection.start();
    console.log("SignalR Connected to Chat Hub");
  }

  // Setters for callbacks
  public setOnReceiveMessage(cb: (msg: any) => void) { this.onReceiveMessageCallback = cb; }
  public setOnMessageSent(cb: (msg: any) => void) { this.onMessageSentCallback = cb; }
  public setOnTypingStarted(cb: (userId: string) => void) { this.onTypingStartedCallback = cb; }
  public setOnTypingStopped(cb: (userId: string) => void) { this.onTypingStoppedCallback = cb; }
  public setOnMessagesRead(cb: (userId: string) => void) { this.onMessagesReadCallback = cb; }
  public setOnUserOnline(cb: (userId: string) => void) { this.onUserOnlineCallback = cb; }
  public setOnUserOffline(cb: (userId: string) => void) { this.onUserOfflineCallback = cb; }

  // Actions
  public async sendMessage(friendId: string, text: string) {
    if (!this.connection) await this.connect();
    // Assuming type 0 = Text
    await this.connection?.invoke("SendMessage", friendId, { type: 0, content: text });
  }

  public async startTyping(friendId: string) {
    if (!this.connection) return;
    await this.connection.invoke("StartTyping", friendId);
  }

  public async stopTyping(friendId: string) {
    if (!this.connection) return;
    await this.connection.invoke("StopTyping", friendId);
  }

  public async markRead(friendId: string) {
    if (!this.connection) return;
    await this.connection.invoke("MarkRead", friendId);
  }

  public async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const chatSignalR = new ChatSignalRService();
