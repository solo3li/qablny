import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './axiosClient';

class ChatSignalRService {
  private connection: signalR.HubConnection | null = null;
  
  // Callbacks
  private onReceiveMessageCallback: ((msg: any) => void) | null = null;
  private onMessageSentCallback: ((msg: any) => void) | null = null;
  private onMessageEditedCallback: ((msg: any) => void) | null = null;
  private onMessageDeletedCallback: ((messageId: string) => void) | null = null;
  private onTypingStartedCallback: ((userId: string) => void) | null = null;
  private onTypingStoppedCallback: ((userId: string) => void) | null = null;
  private onMessagesReadCallback: ((userId: string) => void) | null = null;
  private onUserOnlineCallback: ((userId: string) => void) | null = null;
  private onUserOfflineCallback: ((userId: string) => void) | null = null;
  private onRecordingStartedCallback: ((userId: string) => void) | null = null;
  private onRecordingStoppedCallback: ((userId: string) => void) | null = null;
  private onReceiveGiftCallback: ((payload: any) => void) | null = null;
  
  // Call Callbacks
  private onIncomingCallCallback: ((payload: any) => void) | null = null;
  private onCallAcceptedCallback: ((payload: any) => void) | null = null;
  private onCallDeclinedCallback: ((friendId: string) => void) | null = null;
  private onCallEndedCallback: ((friendId: string) => void) | null = null;

  public getConnection() { return this.connection; }

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
    this.connection.on("MessageEdited", (msg: any) => this.onMessageEditedCallback?.(msg));
    this.connection.on("MessageDeleted", (messageId: string) => this.onMessageDeletedCallback?.(messageId));
    this.connection.on("TypingStarted", (userId: string) => this.onTypingStartedCallback?.(userId));
    this.connection.on("TypingStopped", (userId: string) => this.onTypingStoppedCallback?.(userId));
    this.connection.on("MessagesRead", (userId: string) => this.onMessagesReadCallback?.(userId));
    this.connection.on("UserOnline", (userId: string) => this.onUserOnlineCallback?.(userId));
    this.connection.on("UserOffline", (userId: string) => this.onUserOfflineCallback?.(userId));
    this.connection.on("RecordingStarted", (userId: string) => this.onRecordingStartedCallback?.(userId));
    this.connection.on("RecordingStopped", (userId: string) => this.onRecordingStoppedCallback?.(userId));
    this.connection.on("ReceiveGift", (payload: any) => this.onReceiveGiftCallback?.(payload));

    // Call Events
    this.connection.on("IncomingCall", (payload: any) => this.onIncomingCallCallback?.(payload));
    this.connection.on("CallAccepted", (payload: any) => this.onCallAcceptedCallback?.(payload));
    this.connection.on("CallDeclined", (friendId: string) => this.onCallDeclinedCallback?.(friendId));
    this.connection.on("CallEnded", (friendId: string) => this.onCallEndedCallback?.(friendId));

    await this.connection.start();
    console.log("SignalR Connected to Chat Hub");
  }

  // Setters for callbacks
  public setOnReceiveMessage(cb: (msg: any) => void) { this.onReceiveMessageCallback = cb; }
  public setOnMessageSent(cb: (msg: any) => void) { this.onMessageSentCallback = cb; }
  public setOnMessageEdited(cb: (msg: any) => void) { this.onMessageEditedCallback = cb; }
  public setOnMessageDeleted(cb: (messageId: string) => void) { this.onMessageDeletedCallback = cb; }
  public setOnTypingStarted(cb: (userId: string) => void) { this.onTypingStartedCallback = cb; }
  public setOnTypingStopped(cb: (userId: string) => void) { this.onTypingStoppedCallback = cb; }
  public setOnMessagesRead(cb: (userId: string) => void) { this.onMessagesReadCallback = cb; }
  public setOnUserOnline(cb: (userId: string) => void) { this.onUserOnlineCallback = cb; }
  public setOnUserOffline(cb: (userId: string) => void) { this.onUserOfflineCallback = cb; }
  public setOnRecordingStarted(cb: (userId: string) => void) { this.onRecordingStartedCallback = cb; }
  public setOnRecordingStopped(cb: (userId: string) => void) { this.onRecordingStoppedCallback = cb; }
  public setOnReceiveGift(cb: (payload: any) => void) { this.onReceiveGiftCallback = cb; }

  // Call Callbacks Setters
  public setOnIncomingCall(cb: (payload: any) => void) { this.onIncomingCallCallback = cb; }
  public setOnCallAccepted(cb: (payload: any) => void) { this.onCallAcceptedCallback = cb; }
  public setOnCallDeclined(cb: (friendId: string) => void) { this.onCallDeclinedCallback = cb; }
  public setOnCallEnded(cb: (friendId: string) => void) { this.onCallEndedCallback = cb; }

  // Actions
  public async sendMessage(friendId: string, text: string) {
    if (!this.connection) await this.connect();
    // Assuming type 0 = Text
    await this.connection?.invoke("SendMessage", friendId, { type: 0, content: text });
  }

  public async editMessage(messageId: string, friendId: string, newContent: string) {
    if (!this.connection) return;
    await this.connection.invoke("EditMessage", messageId, friendId, newContent);
  }

  public async deleteMessage(messageId: string, friendId: string) {
    if (!this.connection) return;
    await this.connection.invoke("DeleteMessage", messageId, friendId);
  }

  public async startTyping(friendId: string) {
    if (!this.connection) return;
    await this.connection.invoke("StartTyping", friendId);
  }

  public async stopTyping(friendId: string) {
    if (!this.connection) return;
    await this.connection.invoke("StopTyping", friendId);
  }

  public async startRecording(friendId: string) {
    if (!this.connection) return;
    try { await this.connection.invoke("StartRecording", friendId); } catch(e) {}
  }

  public async stopRecording(friendId: string) {
    if (!this.connection) return;
    try { await this.connection.invoke("StopRecording", friendId); } catch(e) {}
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

  // Debounced typing - call this whenever user types
  private typingDebounceTimers: Record<string, any> = {};
  public notifyTyping(friendId: string) {
    // Send startTyping immediately on first call
    if (!this.typingDebounceTimers[friendId]) {
      this.startTyping(friendId).catch(() => {});
    }
    // Clear existing debounce timer
    clearTimeout(this.typingDebounceTimers[friendId]);
    // After 2 seconds of no typing, send stopTyping
    this.typingDebounceTimers[friendId] = setTimeout(() => {
      this.stopTyping(friendId).catch(() => {});
      delete this.typingDebounceTimers[friendId];
    }, 2000);
  }
}

export const chatSignalR = new ChatSignalRService();
