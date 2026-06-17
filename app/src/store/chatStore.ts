import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';
import { chatSignalR } from '../api/chatSignalR';

export interface Friend {
  id: string;
  name: string;
  profileImageUrl: string;
  lastMessage: string;
  lastSeen: string;
  isOnline: boolean;
  unread: number;
}

// Backend format
export interface BackendChatMessage {
  id: string;
  type: number; // 0: Text, 1: Image, 2: Audio, 3: Video, 4: System
  content: string;
  translation?: string;
  mediaUrl?: string;
  senderId: string;
  isRead: boolean;
  createdAt: string;
}

// UI format
export type MessageType = 'text' | 'voice' | 'image' | 'video' | 'location';
export interface UIChatMessage {
  id: string;
  type: MessageType;
  text?: string;
  translation?: string;
  duration?: number;
  mediaUrl?: string;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  isMe: boolean;
  time: string;
}

interface ChatState {
  friends: Friend[];
  chatMessages: Record<string, UIChatMessage[]>;
  isLoadingFriends: boolean;
  
  fetchFriends: () => Promise<void>;
  fetchMessages: (friendId: string, myUserId: string) => Promise<void>;
  sendMessage: (friendId: string, msg: UIChatMessage) => Promise<void>;
  addIncomingMessage: (msg: BackendChatMessage, myUserId: string) => void;
  updateFriendOnlineStatus: (friendId: string, isOnline: boolean) => void;
  initSignalR: (myUserId: string) => Promise<void>;
}

const mapBackendToUI = (msg: BackendChatMessage, myUserId: string): UIChatMessage => {
  const isMe = msg.senderId === myUserId;
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let type: MessageType = 'text';
  if (msg.type === 1) type = 'image';
  if (msg.type === 2) type = 'voice';
  if (msg.type === 3) type = 'video';
  // Note: we can parse content if it's JSON for location, but for now we map basic
  
  return {
    id: msg.id,
    type,
    text: type === 'text' ? msg.content : undefined,
    translation: msg.translation,
    mediaUrl: msg.mediaUrl,
    isMe,
    time
  };
};

export const useChatStore = create<ChatState>((set, get) => ({
  friends: [],
  chatMessages: {},
  isLoadingFriends: false,

  fetchFriends: async () => {
    set({ isLoadingFriends: true });
    try {
      const res = await axiosClient.get('/friends');
      set({ friends: res.data, isLoadingFriends: false });
    } catch (e) {
      console.error('Failed to fetch friends', e);
      set({ isLoadingFriends: false });
    }
  },

  fetchMessages: async (friendId: string, myUserId: string) => {
    try {
      const res = await axiosClient.get(`/conversations/${friendId}/messages`);
      const mapped = res.data.map((m: BackendChatMessage) => mapBackendToUI(m, myUserId));
      set((state) => ({
        chatMessages: {
          ...state.chatMessages,
          [friendId]: mapped
        }
      }));
    } catch (e) {
      console.error('Failed to fetch messages for', friendId, e);
    }
  },

  sendMessage: async (friendId: string, msg: UIChatMessage) => {
    // Add optimistically
    set((state) => {
      const msgs = state.chatMessages[friendId] || [];
      return { chatMessages: { ...state.chatMessages, [friendId]: [...msgs, msg] } };
    });
    try {
      let typeInt = 0;
      if (msg.type === 'image') typeInt = 1;
      if (msg.type === 'voice') typeInt = 2;
      if (msg.type === 'video') typeInt = 3;
      
      const content = msg.text || (msg.type === 'location' ? msg.locationName : 'Media');
      await axiosClient.post(`/conversations/${friendId}/messages`, { type: typeInt, content, mediaUrl: msg.mediaUrl });
      
      // We rely on SignalR 'MessageSent' for confirmation or just leave it optimistic.
    } catch (e) {
      console.error('Failed to send message', e);
    }
  },

  addIncomingMessage: (msg: BackendChatMessage, myUserId: string) => {
    set((state) => {
      const isMe = msg.senderId === myUserId;
      return state;
    });
  },

  updateFriendOnlineStatus: (friendId: string, isOnline: boolean) => {
    set((state) => ({
      friends: state.friends.map(f => f.id === friendId ? { ...f, isOnline } : f)
    }));
  },

  initSignalR: async (myUserId: string) => {
    await chatSignalR.connect();
    
    chatSignalR.setOnReceiveMessage((msg: BackendChatMessage) => {
      set((state) => {
        const friendId = msg.senderId;
        const uiMsg = mapBackendToUI(msg, myUserId);
        const msgs = state.chatMessages[friendId] || [];
        return {
          chatMessages: { ...state.chatMessages, [friendId]: [...msgs, uiMsg] },
          friends: state.friends.map(f => f.id === friendId ? { ...f, lastMessage: uiMsg.text || 'رسالة', unread: (f.unread||0) + 1 } : f)
        };
      });
    });

    chatSignalR.setOnMessageSent((msg: BackendChatMessage) => {
      // Note: backend 'MessageSent' currently returns the message sent, we might ignore to avoid dupes since we added optimistically
    });

    chatSignalR.setOnUserOnline((userId: string) => get().updateFriendOnlineStatus(userId, true));
    chatSignalR.setOnUserOffline((userId: string) => get().updateFriendOnlineStatus(userId, false));
  }
}));
