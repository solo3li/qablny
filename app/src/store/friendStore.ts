import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';
import { FriendRequest } from '../../components/FriendRequestCard';

interface FriendStoreState {
  requests: FriendRequest[];
  friends: any[];
  isLoading: boolean;
  fetchRequests: () => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  fetchAllFriends: () => Promise<void>;
}

export const useFriendStore = create<FriendStoreState>((set, get) => ({
  requests: [],
  friends: [],
  isLoading: false,

  fetchRequests: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosClient.get('/users/friends/requests');
      // Backend returns list of pending requests with sender info
      const mapped: FriendRequest[] = res.data.map((r: any) => ({
        id: r.id,
        senderId: r.senderId || r.sender?.id,
        senderName: r.senderName || r.sender?.name || 'مستخدم',
        senderImage: r.senderImage || r.sender?.profileImageUrl,
        senderBio: r.senderBio || r.sender?.bio,
        createdAt: r.createdAt || new Date().toISOString(),
      }));
      set({ requests: mapped, isLoading: false });
    } catch (e) {
      console.error('friendStore: fetchRequests failed', e);
      set({ isLoading: false });
    }
  },

  acceptRequest: async (id: string) => {
    try {
      await axiosClient.put(`/users/friends/requests/${id}/accept`);
      set(state => ({
        requests: state.requests.filter(r => r.id !== id),
      }));
    } catch (e) {
      console.error('friendStore: acceptRequest failed', e);
    }
  },

  rejectRequest: async (id: string) => {
    try {
      await axiosClient.put(`/users/friends/requests/${id}/reject`);
      set(state => ({
        requests: state.requests.filter(r => r.id !== id),
      }));
    } catch (e) {
      console.error('friendStore: rejectRequest failed', e);
    }
  },

  fetchAllFriends: async () => {
    try {
      const res = await axiosClient.get('/users/friends');
      set({ friends: res.data });
    } catch (e) {
      console.error('friendStore: fetchAllFriends failed', e);
    }
  },
}));
