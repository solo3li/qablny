import { axiosClient } from './axiosClient';
import { centrifugoManager } from './centrifugoClient';

class ChatSignalRService {
  // Callbacks
  private onReceiveMessageCallback: ((msg: any) => void) | null = null;
  private onMessageSentCallback: ((msg: any) => void) | null = null;
  private onTypingStartedCallback: ((userId: string) => void) | null = null;
  private onTypingStoppedCallback: ((userId: string) => void) | null = null;
  private onMessagesReadCallback: ((userId: string) => void) | null = null;
  private onUserOnlineCallback: ((userId: string) => void) | null = null;
  private onUserOfflineCallback: ((userId: string) => void) | null = null;
  private onRecordingStartedCallback: ((userId: string) => void) | null = null;
  private onRecordingStoppedCallback: ((userId: string) => void) | null = null;
  private onReceiveGiftCallback: ((payload: any) => void) | null = null;
  private onReceiveSupportMessageCallback: ((msg: any) => void) | null = null;
  private onStreakUpdatedCallback: ((payload: any) => void) | null = null;
  private onStreakRestoredCallback: ((payload: any) => void) | null = null;
  private onSnapOpenedCallback: ((payload: any) => void) | null = null;
  
  // Call Callbacks
  private onIncomingCallCallback: ((payload: any) => void) | null = null;
  private onCallAcceptedCallback: ((payload: any) => void) | null = null;
  private onCallDeclinedCallback: ((friendId: string) => void) | null = null;
  private onCallEndedCallback: ((friendId: string) => void) | null = null;

  private isConnected = false;
  private ticketUnsubs: Map<string, () => void> = new Map();

  // Synthetic connection wrapper for backwards-compatibility with callStore and other components
  public getConnection() {
    return {
      state: this.isConnected ? 'Connected' : 'Disconnected',
      invoke: async (methodName: string, ...args: any[]) => {
        switch (methodName) {
          case 'InitiateCall':
            return await this.initiateCall(args[0], args[1]);
          case 'AcceptCall':
            return await this.acceptCall(args[0], args[1]);
          case 'DeclineCall':
            return await this.declineCall(args[0]);
          case 'EndCall':
            return await this.endCall(args[0], args[1], args[2]);
          case 'SendMessage':
            return await this.sendMessage(args[0], args[1]?.content || args[1]);
          case 'StartTyping':
            return await this.startTyping(args[0]);
          case 'StopTyping':
            return await this.stopTyping(args[0]);
          case 'MarkRead':
            return await this.markRead(args[0]);
          case 'JoinTicketGroup':
            return await this.joinTicketGroup(args[0]);
          case 'LeaveTicketGroup':
            return await this.leaveTicketGroup(args[0]);
          case 'SendSupportMessage':
            return await this.sendSupportMessage(args[0], args[1], args[2], args[3], args[4], args[5]);
          default:
            console.warn(`[Centrifugo] Unknown invoke method: ${methodName}`);
        }
      }
    };
  }

  public async connect() {
    if (this.isConnected) return;

    await centrifugoManager.connect();
    this.isConnected = true;

    // Register event listeners from personal Centrifugo channel
    centrifugoManager.on('ReceiveMessage', (msg: any) => {
      console.log('🔥 Centrifugo ReceiveMessage:', msg);
      this.onReceiveMessageCallback?.(msg);
    });

    centrifugoManager.on('MessageSent', (msg: any) => this.onMessageSentCallback?.(msg));
    centrifugoManager.on('TypingStarted', (data: any) => this.onTypingStartedCallback?.(data?.userId || data));
    centrifugoManager.on('TypingStopped', (data: any) => this.onTypingStoppedCallback?.(data?.userId || data));
    centrifugoManager.on('MessagesRead', (data: any) => this.onMessagesReadCallback?.(data?.userId || data));
    centrifugoManager.on('UserOnline', (data: any) => this.onUserOnlineCallback?.(data?.userId || data));
    centrifugoManager.on('UserOffline', (data: any) => this.onUserOfflineCallback?.(data?.userId || data));
    centrifugoManager.on('RecordingStarted', (data: any) => this.onRecordingStartedCallback?.(data?.userId || data));
    centrifugoManager.on('RecordingStopped', (data: any) => this.onRecordingStoppedCallback?.(data?.userId || data));
    centrifugoManager.on('ReceiveGift', (payload: any) => this.onReceiveGiftCallback?.(payload));

    centrifugoManager.on('ReceiveSupportMessage', (msg: any) => {
      console.log('🔥 Centrifugo ReceiveSupportMessage:', msg);
      this.onReceiveSupportMessageCallback?.(msg);
    });

    centrifugoManager.on('StreakUpdated', (payload: any) => {
      console.log('🔥 Centrifugo StreakUpdated:', payload);
      this.onStreakUpdatedCallback?.(payload);
    });

    centrifugoManager.on('StreakRestored', (payload: any) => {
      console.log('🔥 Centrifugo StreakRestored:', payload);
      this.onStreakRestoredCallback?.(payload);
    });

    centrifugoManager.on('SnapOpened', (payload: any) => {
      console.log('🔥 Centrifugo SnapOpened:', payload);
      this.onSnapOpenedCallback?.(payload);
    });

    // Call Events
    centrifugoManager.on('IncomingCall', (payload: any) => this.onIncomingCallCallback?.(payload));
    centrifugoManager.on('CallAccepted', (payload: any) => this.onCallAcceptedCallback?.(payload));
    centrifugoManager.on('CallDeclined', (data: any) => this.onCallDeclinedCallback?.(data?.friendId || data));
    centrifugoManager.on('CallEnded', (data: any) => this.onCallEndedCallback?.(data?.friendId || data));

    console.log('Centrifugo Connected to Chat Realtime Channel');
  }

  // Setters for callbacks
  public setOnReceiveMessage(cb: (msg: any) => void) { this.onReceiveMessageCallback = cb; }
  public setOnMessageSent(cb: (msg: any) => void) { this.onMessageSentCallback = cb; }
  public setOnTypingStarted(cb: (userId: string) => void) { this.onTypingStartedCallback = cb; }
  public setOnTypingStopped(cb: (userId: string) => void) { this.onTypingStoppedCallback = cb; }
  public setOnMessagesRead(cb: (userId: string) => void) { this.onMessagesReadCallback = cb; }
  public setOnUserOnline(cb: (userId: string) => void) { this.onUserOnlineCallback = cb; }
  public setOnUserOffline(cb: (userId: string) => void) { this.onUserOfflineCallback = cb; }
  public setOnRecordingStarted(cb: (userId: string) => void) { this.onRecordingStartedCallback = cb; }
  public setOnRecordingStopped(cb: (userId: string) => void) { this.onRecordingStoppedCallback = cb; }
  public setOnReceiveGift(cb: (payload: any) => void) { this.onReceiveGiftCallback = cb; }
  public setOnReceiveSupportMessage(cb: (msg: any) => void) { this.onReceiveSupportMessageCallback = cb; }
  public setOnStreakUpdated(cb: (payload: any) => void) { this.onStreakUpdatedCallback = cb; }
  public setOnStreakRestored(cb: (payload: any) => void) { this.onStreakRestoredCallback = cb; }
  public setOnSnapOpened(cb: (payload: any) => void) { this.onSnapOpenedCallback = cb; }

  // Call Callbacks Setters
  public setOnIncomingCall(cb: (payload: any) => void) { this.onIncomingCallCallback = cb; }
  public setOnCallAccepted(cb: (payload: any) => void) { this.onCallAcceptedCallback = cb; }
  public setOnCallDeclined(cb: (friendId: string) => void) { this.onCallDeclinedCallback = cb; }
  public setOnCallEnded(cb: (friendId: string) => void) { this.onCallEndedCallback = cb; }

  // Actions
  public async sendMessage(friendId: string, text: string) {
    if (!this.isConnected) await this.connect();
    const res = await axiosClient.post(`/conversations/${friendId}/messages`, {
      type: 0,
      content: text
    });
    this.onMessageSentCallback?.(res.data);
    return res.data;
  }

  public async startTyping(friendId: string) {
    try {
      await axiosClient.post('/realtime/typing/start', { friendId });
    } catch (e) {}
  }

  public async stopTyping(friendId: string) {
    try {
      await axiosClient.post('/realtime/typing/stop', { friendId });
    } catch (e) {}
  }

  public async startRecording(friendId: string) {
    try {
      await axiosClient.post('/realtime/recording/start', { friendId });
    } catch (e) {}
  }

  public async stopRecording(friendId: string) {
    try {
      await axiosClient.post('/realtime/recording/stop', { friendId });
    } catch (e) {}
  }

  public async markRead(friendId: string) {
    try {
      await axiosClient.put(`/conversations/${friendId}/read`);
    } catch (e) {}
  }

  // Call Actions
  public async initiateCall(friendId: string, callType: string = 'video') {
    const res = await axiosClient.post('/realtime/call/initiate', {
      friendId,
      callType
    });
    return res.data;
  }

  public async acceptCall(callerId: string, roomName: string) {
    const res = await axiosClient.post('/realtime/call/accept', {
      callerId,
      roomName
    });
    return res.data;
  }

  public async declineCall(callerId: string) {
    const res = await axiosClient.post('/realtime/call/decline', {
      callerId
    });
    return res.data;
  }

  public async endCall(friendId: string, roomName: string, callType: string = 'video') {
    const res = await axiosClient.post('/realtime/call/end', {
      friendId,
      roomName,
      callType
    });
    return res.data;
  }

  public async disconnect() {
    this.isConnected = false;
    centrifugoManager.disconnect();
  }

  // Support Actions
  public async joinTicketGroup(ticketId: string) {
    if (!this.isConnected) await this.connect();
    const channel = `tickets:${ticketId}`;
    const unsub = centrifugoManager.subscribeChannel(channel, (msg: any) => {
      this.onReceiveSupportMessageCallback?.(msg);
    });
    this.ticketUnsubs.set(ticketId, unsub);
  }

  public async leaveTicketGroup(ticketId: string) {
    const unsub = this.ticketUnsubs.get(ticketId);
    if (unsub) {
      unsub();
      this.ticketUnsubs.delete(ticketId);
    }
  }

  public async sendSupportMessage(ticketId: string, isAdmin: boolean, type: number, content: string | null, duration: number | null, mediaUrl: string | null) {
    const res = await axiosClient.post(`/support/tickets/${ticketId}/messages`, {
      message: content,
      type,
      durationSeconds: duration,
      mediaUrl
    });
    return res.data;
  }

  // Debounced typing
  private typingDebounceTimers: Record<string, any> = {};
  public notifyTyping(friendId: string) {
    if (!this.typingDebounceTimers[friendId]) {
      this.startTyping(friendId).catch(() => {});
    }
    clearTimeout(this.typingDebounceTimers[friendId]);
    this.typingDebounceTimers[friendId] = setTimeout(() => {
      this.stopTyping(friendId).catch(() => {});
      delete this.typingDebounceTimers[friendId];
    }, 2000);
  }
}

export const chatSignalR = new ChatSignalRService();
