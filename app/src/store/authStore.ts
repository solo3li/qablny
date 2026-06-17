import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { axiosClient } from '../api/axiosClient';

interface User {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  age: number;
  gender: number;
  location: string;
  coins: number;
  isVip: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (token: string, user: User) => {
    await AsyncStorage.setItem('accessToken', token);
    set({ token, user, isLoading: false });
  },

  logout: async () => {
    await AsyncStorage.removeItem('accessToken');
    set({ token: null, user: null, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      
      const response = await axiosClient.get('/users/me');
      set({ token, user: response.data, isLoading: false });
    } catch (error) {
      await AsyncStorage.removeItem('accessToken');
      set({ token: null, user: null, isLoading: false });
    }
  },
}));
