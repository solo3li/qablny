import { create } from 'zustand';
import { chatSignalR } from '../api/chatSignalR';

interface IncomingCallPayload {
  callerId: string;
  roomName: string;
  callType: 'voice' | 'video';
}

interface ActiveCallPayload {
  friendId: string;
  roomName: string;
  callType: 'voice' | 'video';
}

interface CallState {
  incomingCall: IncomingCallPayload | null;
  activeCall: ActiveCallPayload | null;
  callStatus: 'idle' | 'ringing' | 'connected';
  
  setIncomingCall: (payload: IncomingCallPayload | null) => void;
  setActiveCall: (payload: ActiveCallPayload | null) => void;
  setCallStatus: (status: 'idle' | 'ringing' | 'connected') => void;

  initiateCall: (friendId: string, callType: 'voice' | 'video') => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  handleCallDeclined: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  incomingCall: null,
  activeCall: null,
  callStatus: 'idle',

  setIncomingCall: (payload) => set({ incomingCall: payload }),
  setActiveCall: (payload) => set({ activeCall: payload }),
  setCallStatus: (status) => set({ callStatus: status }),

  initiateCall: (friendId, callType) => {
    // Optimistically set active call but ringing
    set({
      activeCall: { friendId, roomName: '', callType },
      callStatus: 'ringing'
    });
    // Send via SignalR
    const connection = chatSignalR.getConnection();
    if (connection) {
      connection.invoke('InitiateCall', friendId, callType).catch(console.error);
    }
  },

  acceptCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;
    
    set({
      activeCall: { friendId: incomingCall.callerId, roomName: incomingCall.roomName, callType: incomingCall.callType },
      incomingCall: null,
      callStatus: 'connected'
    });

    // Notify backend
    const connection = chatSignalR.getConnection();
    if (connection) {
      connection.invoke('AcceptCall', incomingCall.callerId, incomingCall.roomName).catch(console.error);
    }
  },

  declineCall: () => {
    const { incomingCall } = get();
    if (incomingCall) {
      const connection = chatSignalR.getConnection();
      if (connection) {
        connection.invoke('DeclineCall', incomingCall.callerId).catch(console.error);
      }
    }
    set({ incomingCall: null, callStatus: 'idle', activeCall: null });
  },

  endCall: () => {
    const { activeCall } = get();
    if (activeCall) {
      const connection = chatSignalR.getConnection();
      if (connection) {
        connection.invoke('EndCall', activeCall.friendId).catch(console.error);
      }
    }
    set({ activeCall: null, incomingCall: null, callStatus: 'idle' });
  },

  handleCallDeclined: () => {
    set({ activeCall: null, callStatus: 'idle' });
  }
}));
