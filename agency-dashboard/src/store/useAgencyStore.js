import { create } from 'zustand';

const API_BASE_URL = 'http://localhost:5000/api'; // Or the actual IP of the backend

export const useAgencyStore = create((set, get) => ({
  token: localStorage.getItem('agencyToken') || null,
  agencyName: localStorage.getItem('agencyName') || '',
  managerName: localStorage.getItem('managerName') || '',
  inviteCode: localStorage.getItem('inviteCode') || '',
  
  hosts: [],
  transactions: [],
  announcements: [],
  
  activeHosts: 0,
  totalHosts: 0,
  totalEarnings: 0,
  agencyCut: 0,
  monthlyTarget: 100000,
  currentProgress: 0,
  
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/agency/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!res.ok) throw new Error('Invalid credentials');
      
      const data = await res.json();
      
      localStorage.setItem('agencyToken', data.token);
      localStorage.setItem('agencyName', data.agencyName);
      localStorage.setItem('managerName', data.managerName);
      localStorage.setItem('inviteCode', data.inviteCode);
      
      set({ 
        token: data.token,
        agencyName: data.agencyName,
        managerName: data.managerName,
        inviteCode: data.inviteCode,
        isLoading: false 
      });
      return true;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('agencyToken');
    localStorage.removeItem('agencyName');
    localStorage.removeItem('managerName');
    localStorage.removeItem('inviteCode');
    set({ token: null, hosts: [], transactions: [] });
  },

  fetchDashboardStats: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/agency/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({
          activeHosts: data.activeHosts,
          totalHosts: data.totalHosts,
          totalEarnings: data.totalEarnings,
          agencyCut: data.agencyCut,
          monthlyTarget: data.monthlyTarget,
          currentProgress: data.currentProgress
        });
      } else if (res.status === 401) {
        get().logout();
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    }
  },

  fetchHosts: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/agency/hosts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ hosts: data });
      }
    } catch (err) {
      console.error("Failed to fetch hosts", err);
    }
  },

  removeHost: async (id) => {
    const { token, hosts } = get();
    try {
      const res = await fetch(`${API_BASE_URL}/agency/hosts/${id}/remove`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        set({ hosts: hosts.filter(h => h.id !== id) });
      }
    } catch (err) {
      console.error("Failed to remove host", err);
    }
  },

  // Mocked for now since backend doesn't have withdrawal/announcement APIs yet
  requestWithdrawal: (amount) => set((state) => ({
    transactions: [
      { id: Date.now(), type: 'Withdrawal Pending', amount: -amount, host: 'Agency', date: new Date().toLocaleString() },
      ...state.transactions
    ]
  })),

  sendAnnouncement: (message) => set((state) => ({
    announcements: [
      { id: Date.now(), message, date: new Date().toLocaleString() },
      ...state.announcements
    ]
  }))
}));
