import { create } from 'zustand';

export interface VoiceRoomSeatData {
  seatIndex: number;
  userId: string | null;
  userName: string | null;
  userAvatar: string | null;
  vipLevel: number;
  isLocked: boolean;
  isMuted: boolean;
  isSpeaking?: boolean;
}

export interface VoiceRoomData {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string | null;
  hostVipLevel: number;
  liveKitRoomName: string;
  title: string;
  category: string;
  coverImageUrl: string | null;
  hasPassword: boolean;
  listenersCount: number;
  speakersCount: number;
  isActive: boolean;
  createdAt?: string;
}

export interface RoomMessage {
  id: string;
  type: 'text' | 'gift' | 'join' | 'system';
  senderId?: string;
  senderName?: string;
  senderAvatar?: string | null;
  vipLevel?: number;
  message?: string;
  giftName?: string;
  giftEmoji?: string;
  coinsSpent?: number;
  recipientName?: string;
  timestamp?: string;
}

interface VoiceRoomStore {
  currentRoom: VoiceRoomData | null;
  seats: VoiceRoomSeatData[];
  isHost: boolean;
  isSeated: boolean;
  mySeatIndex: number | null;
  isMuted: boolean;
  isMinimized: boolean;
  livekitToken: string | null;
  livekitServerUrl: string;
  activeSpeakers: string[];
  messages: RoomMessage[];
  activeGiftEffect: RoomMessage | null;
  myUserId: string | null;

  // Actions
  setRoom: (room: VoiceRoomData, seats: VoiceRoomSeatData[], token: string, serverUrl: string, myUserId: string) => void;
  updateSeats: (seats: VoiceRoomSeatData[]) => void;
  setListenersCount: (count: number) => void;
  setMuted: (muted: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setActiveSpeakers: (speakers: string[]) => void;
  addMessage: (msg: RoomMessage) => void;
  triggerGiftEffect: (gift: RoomMessage) => void;
  clearGiftEffect: () => void;
  leaveRoom: () => void;
}

export const useVoiceRoomStore = create<VoiceRoomStore>((set, get) => ({
  currentRoom: null,
  seats: [],
  isHost: false,
  isSeated: false,
  mySeatIndex: null,
  isMuted: false,
  isMinimized: false,
  livekitToken: null,
  livekitServerUrl: '',
  activeSpeakers: [],
  messages: [],
  activeGiftEffect: null,
  myUserId: null,

  setRoom: (room, seats, token, serverUrl, myUserId) => {
    const isHost = room.hostId === myUserId;
    const mySeat = seats.find(s => s.userId === myUserId);
    set({
      currentRoom: room,
      seats,
      isHost,
      isSeated: isHost || !!mySeat,
      mySeatIndex: mySeat ? mySeat.seatIndex : null,
      isMuted: false,
      isMinimized: false,
      livekitToken: token,
      livekitServerUrl: serverUrl,
      activeSpeakers: [],
      messages: [
        {
          id: `welcome-${Date.now()}`,
          type: 'system',
          message: `مرحباً بك في غرفة ${room.title}. يرجى الالتزام بقواعد الاحترام المتبادل.`,
          timestamp: new Date().toISOString()
        }
      ],
      myUserId
    });
  },

  updateSeats: (seats) => {
    const { currentRoom, myUserId } = get();
    const isHost = currentRoom?.hostId === myUserId;
    const mySeat = seats.find(s => s.userId === myUserId);
    set({
      seats,
      isSeated: isHost || !!mySeat,
      mySeatIndex: mySeat ? mySeat.seatIndex : null
    });
  },

  setListenersCount: (count) => {
    set((state) => ({
      currentRoom: state.currentRoom ? { ...state.currentRoom, listenersCount: count } : null
    }));
  },

  setMuted: (isMuted) => set({ isMuted }),

  setMinimized: (isMinimized) => set({ isMinimized }),

  setActiveSpeakers: (activeSpeakers) => set({ activeSpeakers }),

  addMessage: (msg) => {
    set((state) => ({
      messages: [...state.messages.slice(-50), msg]
    }));
  },

  triggerGiftEffect: (gift) => {
    set({ activeGiftEffect: gift });
    setTimeout(() => {
      if (get().activeGiftEffect?.id === gift.id) {
        set({ activeGiftEffect: null });
      }
    }, 4000);
  },

  clearGiftEffect: () => set({ activeGiftEffect: null }),

  leaveRoom: () => {
    set({
      currentRoom: null,
      seats: [],
      isHost: false,
      isSeated: false,
      mySeatIndex: null,
      isMuted: false,
      isMinimized: false,
      livekitToken: null,
      livekitServerUrl: '',
      activeSpeakers: [],
      messages: [],
      activeGiftEffect: null
    });
  }
}));
