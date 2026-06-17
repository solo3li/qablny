import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';
import { chatSignalR } from '../api/chatSignalR';
import { useCallStore } from './callStore';

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
  replyToId?: string;
}

// Reply preview embedded in message
export interface ReplyPreview {
  id: string;
  text?: string;
  type: string;
  isMe: boolean;
  senderName: string;
}

// UI format
export type MessageType = 'text' | 'voice' | 'image' | 'video' | 'location';
export type ReadStatus = 'sending' | 'sent' | 'delivered' | 'read';

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
  readStatus?: ReadStatus;
  replyTo?: ReplyPreview;
  isEdited?: boolean;
  isUploading?: boolean;
}

interface ChatState {
  friends: Friend[];
  chatMessages: Record<string, UIChatMessage[]>;
  isLoadingFriends: boolean;
  typingUsers: Record<string, boolean>;    // friendId -> is typing
  voiceUsers: Record<string, boolean>;     // friendId -> is recording voice
  onlineUsers: Record<string, { isOnline: boolean; lastSeen?: string }>; // friendId -> online status
  
  fetchFriends: () => Promise<void>;
  fetchMessages: (friendId: string, myUserId: string) => Promise<void>;
  sendMessage: (friendId: string, msg: UIChatMessage) => Promise<void>;
  addLocalMessage: (friendId: string, msg: UIChatMessage) => void;  // local only, no API
  addIncomingMessage: (msg: BackendChatMessage, myUserId: string) => void;
  updateFriendOnlineStatus: (friendId: string, isOnline: boolean, lastSeen?: string) => void;
  setTyping: (friendId: string, isTyping: boolean) => void;
  setVoiceRecording: (friendId: string, isRecording: boolean) => void;
  markMessagesRead: (friendId: string) => void;
  deleteMessage: (friendId: string, msgId: string) => Promise<void>;
  editMessage: (friendId: string, msgId: string, newText: string) => Promise<void>;
  updateMessageUrl: (friendId: string, msgId: string, mediaUrl: string) => void;
  replaceLocalMessage: (friendId: string, localId: string, newMsg: UIChatMessage) => void;
  initSignalR: (myUserId: string) => Promise<void>;
}

const mapBackendToUI = (msg: BackendChatMessage, myUserId: string): UIChatMessage => {
  const isMe = msg.senderId === myUserId;
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let type: MessageType = 'text';
  if (msg.type === 1) type = 'image';
  if (msg.type === 2) type = 'voice';
  if (msg.type === 3) type = 'video';
  
  return {
    id: msg.id,
    type,
    text: type === 'text' ? msg.content : undefined,
    translation: msg.translation,
    mediaUrl: msg.mediaUrl,
    isMe,
    time,
    readStatus: msg.isRead ? 'read' : isMe ? 'delivered' : undefined,
  };
};

export const useChatStore = create<ChatState>((set, get) => ({
  friends: [],
  chatMessages: {},
  isLoadingFriends: false,
  typingUsers: {},
  voiceUsers: {},
  onlineUsers: {},

  fetchFriends: async () => {
    set({ isLoadingFriends: true });
    try {
      const res = await axiosClient.get('/conversations');
      const mapped = res.data.map((c: any) => ({
        id: c.friend.id,
        name: c.friend.name,
        profileImageUrl: c.friend.profileImageUrl,
        lastMessage: c.lastMessage?.content || c.lastMessage?.translation || 'رسالة',
        lastSeen: c.friend.lastSeen,
        isOnline: c.friend.isOnline,
        unread: c.unreadCount
      }));
      
      const newOnlineUsers = { ...get().onlineUsers };
      mapped.forEach((f: any) => {
        newOnlineUsers[f.id] = { isOnline: f.isOnline, lastSeen: f.lastSeen };
      });

      set({ friends: mapped, onlineUsers: newOnlineUsers, isLoadingFriends: false });
    } catch (e) {
      console.error('Failed to fetch conversations', e);
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
    const skip = (msg as any)._skipLocalAdd === true;

    // Add optimistically to UI ONLY if not skipped
    // (skip = true when caller already used addLocalMessage + replaceLocalMessage for media)
    if (!skip) {
      const msgWithStatus: UIChatMessage = { ...msg, readStatus: 'sending' };
      set((state) => {
        const msgs = state.chatMessages[friendId] || [];
        return { chatMessages: { ...state.chatMessages, [friendId]: [...msgs, msgWithStatus] } };
      });
    }

    try {
      let typeInt = 0;
      if (msg.type === 'image') typeInt = 1;
      if (msg.type === 'voice') typeInt = 2;
      if (msg.type === 'video') typeInt = 3;

      const content = msg.text || (msg.type === 'location' ? msg.locationName : 'Media');
      await axiosClient.post(`/conversations/${friendId}/messages`, {
        type: typeInt,
        content,
        mediaUrl: msg.mediaUrl,
        replyToId: msg.replyTo?.id,
      });

      // Update status to 'sent' using msg.id
      set((state) => ({
        chatMessages: {
          ...state.chatMessages,
          [friendId]: (state.chatMessages[friendId] || []).map(m =>
            m.id === msg.id ? { ...m, readStatus: 'sent' as ReadStatus } : m
          )
        }
      }));
    } catch (e) {
      console.error('Failed to send message', e);
    }
  },

  addIncomingMessage: (msg: BackendChatMessage, myUserId: string) => {
    // This is handled inside initSignalR's setOnReceiveMessage
  },

  updateFriendOnlineStatus: (friendId: string, isOnline: boolean, lastSeen?: string) => {
    set((state) => {
      const now = new Date();
      // Format: 10:30 PM
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const finalLastSeen = lastSeen || (isOnline ? undefined : `اليوم ${timeStr}`);

      return {
        onlineUsers: {
          ...state.onlineUsers,
          [friendId]: { isOnline, lastSeen: finalLastSeen }
        },
        friends: state.friends.map(f => {
          if (f.id === friendId) {
            return { ...f, isOnline, lastSeen: !isOnline ? finalLastSeen : f.lastSeen };
          }
          return f;
        })
      };
    });
  },

  setTyping: (friendId: string, isTyping: boolean) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [friendId]: isTyping }
    }));
  },

  setVoiceRecording: (friendId: string, isRecording: boolean) => {
    set((state) => ({
      voiceUsers: { ...state.voiceUsers, [friendId]: isRecording }
    }));
  },

  // Add a message to local UI only - does NOT send to API
  addLocalMessage: (friendId: string, msg: UIChatMessage) => {
    set((state) => {
      const msgs = state.chatMessages[friendId] || [];
      // Avoid duplicates
      if (msgs.some(m => m.id === msg.id)) return {};
      return { chatMessages: { ...state.chatMessages, [friendId]: [...msgs, msg] } };
    });
  },

  // Replace a local placeholder message with the real message after upload
  replaceLocalMessage: (friendId: string, localId: string, newMsg: UIChatMessage) => {
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [friendId]: (state.chatMessages[friendId] || []).map(m =>
          m.id === localId ? { ...newMsg } : m
        )
      }
    }));
  },

  markMessagesRead: (friendId: string) => {
    // Mark all messages from that friend as read in UI
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [friendId]: (state.chatMessages[friendId] || []).map(m =>
          !m.isMe ? { ...m, readStatus: 'read' as ReadStatus } : m
        )
      },
      friends: state.friends.map(f => f.id === friendId ? { ...f, unread: 0 } : f)
    }));
    // Tell server
    chatSignalR.markRead(friendId).catch(() => {});
  },

  deleteMessage: async (friendId: string, msgId: string) => {
    // Optimistically remove from UI
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [friendId]: (state.chatMessages[friendId] || []).filter(m => m.id !== msgId)
      }
    }));
    try {
      await axiosClient.delete(`/conversations/${friendId}/messages/${msgId}`);
    } catch (e) {
      console.error('deleteMessage failed', e);
      // Could restore message here if needed
    }
  },

  editMessage: async (friendId: string, msgId: string, newText: string) => {
    // Optimistically update in UI
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [friendId]: (state.chatMessages[friendId] || []).map(m =>
          m.id === msgId ? { ...m, text: newText, isEdited: true } : m
        )
      }
    }));
    try {
      await axiosClient.put(`/conversations/${friendId}/messages/${msgId}`, { content: newText });
    } catch (e) {
      console.error('editMessage failed', e);
    }
  },

  updateMessageUrl: (friendId: string, msgId: string, mediaUrl: string) => {
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [friendId]: (state.chatMessages[friendId] || []).map(m =>
          m.id === msgId ? { ...m, mediaUrl, readStatus: 'sending' as ReadStatus } : m
        )
      }
    }));
  },

  initSignalR: async (myUserId: string) => {
    await chatSignalR.connect();
    
    chatSignalR.setOnReceiveMessage((msg: BackendChatMessage) => {
      set((state) => {
        const friendId = msg.senderId;
        const uiMsg = mapBackendToUI(msg, myUserId);
        const msgs = state.chatMessages[friendId] || [];
        
        const friendExists = state.friends.some(f => f.id === friendId);
        if (!friendExists) {
          setTimeout(() => get().fetchFriends(), 100);
          return {
            chatMessages: { ...state.chatMessages, [friendId]: [...msgs, uiMsg] }
          };
        }

        return {
          chatMessages: { ...state.chatMessages, [friendId]: [...msgs, uiMsg] },
          friends: state.friends.map(f => f.id === friendId
            ? { ...f, lastMessage: uiMsg.text || 'رسالة', unread: (f.unread || 0) + 1 }
            : f
          )
        };
      });
    });

    chatSignalR.setOnMessageSent((msg: BackendChatMessage) => {
      // Update optimistic message to 'delivered'
      set((state) => {
        const friendId = msg.senderId === myUserId ? '' : msg.senderId;
        // Find the conversation - it's our own message, update last pending 'sent' to 'delivered'
        const allConvs = { ...state.chatMessages };
        for (const fid of Object.keys(allConvs)) {
          allConvs[fid] = allConvs[fid].map(m =>
            m.readStatus === 'sent' ? { ...m, readStatus: 'delivered' as ReadStatus } : m
          );
        }
        return { chatMessages: allConvs };
      });
    });

    chatSignalR.setOnTypingStarted((userId: string) => get().setTyping(userId, true));
    chatSignalR.setOnTypingStopped((userId: string) => get().setTyping(userId, false));

    chatSignalR.setOnRecordingStarted((userId: string) => get().setVoiceRecording(userId, true));
    chatSignalR.setOnRecordingStopped((userId: string) => get().setVoiceRecording(userId, false));

    chatSignalR.setOnMessagesRead((userId: string) => {
      // Our messages to that user have been read
      set((state) => ({
        chatMessages: {
          ...state.chatMessages,
          [userId]: (state.chatMessages[userId] || []).map(m =>
            m.isMe ? { ...m, readStatus: 'read' as ReadStatus } : m
          )
        }
      }));
    });

    chatSignalR.setOnUserOnline((userId: string) => get().updateFriendOnlineStatus(userId, true));
    chatSignalR.setOnUserOffline((userId: string) => get().updateFriendOnlineStatus(userId, false));

    // Call Events Setup
    chatSignalR.setOnIncomingCall((payload) => {
      useCallStore.getState().setIncomingCall({
        callerId: payload.callerId,
        roomName: payload.roomName,
        callType: payload.callType
      });
    });

    chatSignalR.setOnCallAccepted((payload) => {
      const state = useCallStore.getState();
      if (state.activeCall && state.activeCall.friendId === payload.friendId) {
        state.setActiveCall({ ...state.activeCall, roomName: payload.roomName });
        state.setCallStatus('connected');
      }
    });

    chatSignalR.setOnCallDeclined(() => useCallStore.getState().handleCallDeclined());
    chatSignalR.setOnCallEnded(() => useCallStore.getState().handleCallDeclined());
  }
}));
