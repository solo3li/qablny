import { create } from 'zustand';

const initialHosts = [
  { id: 1, name: 'Ahmed M.', status: 'Online', earnings: 1500, hours: 4.5, joined: '2026-05-12' },
  { id: 2, name: 'Sara K.', status: 'In Call', earnings: 3200, hours: 8.2, joined: '2026-06-01' },
  { id: 3, name: 'Omar Y.', status: 'Offline', earnings: 850, hours: 2.1, joined: '2026-06-15' },
  { id: 4, name: 'Lina A.', status: 'Online', earnings: 1100, hours: 3.0, joined: '2026-06-20' },
  { id: 5, name: 'Tariq H.', status: 'Offline', earnings: 2400, hours: 6.5, joined: '2026-07-01' },
];

const initialTransactions = [
  { id: 101, type: 'Gift Received', amount: +500, host: 'Sara K.', date: '2026-07-03 14:30' },
  { id: 102, type: 'Gift Received', amount: +1000, host: 'Ahmed M.', date: '2026-07-03 13:15' },
  { id: 103, type: 'Withdrawal', amount: -2000, host: 'Agency', date: '2026-07-01 09:00' },
  { id: 104, type: 'Gift Received', amount: +250, host: 'Lina A.', date: '2026-07-02 22:45' },
];

export const useAgencyStore = create((set) => ({
  agencyName: 'Qablny Top Agency',
  managerName: 'Admin',
  fixedSalary: 5000,
  
  hosts: initialHosts,
  transactions: initialTransactions,
  announcements: [],
  
  // Targets (KPIs)
  monthlyTarget: 100000,
  currentProgress: 75400,

  // Actions
  addHost: (name) => set((state) => ({
    hosts: [
      ...state.hosts,
      { id: Date.now(), name, status: 'Offline', earnings: 0, hours: 0, joined: new Date().toISOString().split('T')[0] }
    ]
  })),

  removeHost: (id) => set((state) => ({
    hosts: state.hosts.filter(h => h.id !== id)
  })),

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
  })),

  updateSettings: (newName, newManager) => set(() => ({
    agencyName: newName,
    managerName: newManager
  }))
}));
