import { create } from 'zustand';

const API_BASE_URL = 'http://localhost:5000/api'; // Or the actual IP of the backend

export const useAgencyStore = create((set, get) => ({
  token: localStorage.getItem('agencyToken') || null,
  agencyName: localStorage.getItem('agencyName') || '',
  managerName: localStorage.getItem('managerName') || '',
  inviteCode: localStorage.getItem('inviteCode') || '',
  
  hosts: [],
  transactions: [],
  payouts: [],
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
    set({ token: null, hosts: [], transactions: [], payouts: [] });
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

  fetchPayouts: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/agency/payouts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ payouts: data });
      }
    } catch (err) {
      console.error("Failed to fetch payouts", err);
    }
  },

  requestWithdrawal: async (amount) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/agency/payouts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) })
      });
      if (res.ok) {
        const newPayout = await res.json();
        set(state => ({ payouts: [newPayout, ...state.payouts] }));
      } else {
        alert("Failed to request payout");
      }
    } catch (err) {
      console.error("Failed to request payout", err);
      alert("Failed to request payout");
    }
  },

  sendAnnouncement: (message) => set((state) => ({
    announcements: [
      { id: Date.now(), message, date: new Date().toLocaleString() },
      ...state.announcements
    ]
  }))
}));
