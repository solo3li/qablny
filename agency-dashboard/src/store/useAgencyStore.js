import { create } from 'zustand';

const dummyHosts = [
  { id: 1, name: 'Ahmed M.', status: 'Online', earnings: 1500, hours: 4.5 },
  { id: 2, name: 'Sara K.', status: 'In Call', earnings: 3200, hours: 8.2 },
  { id: 3, name: 'Omar Y.', status: 'Offline', earnings: 850, hours: 2.1 },
  { id: 4, name: 'Lina A.', status: 'Online', earnings: 1100, hours: 3.0 },
  { id: 5, name: 'Tariq H.', status: 'Offline', earnings: 2400, hours: 6.5 },
];

export const useAgencyStore = create((set) => ({
  hosts: dummyHosts,
  agencyName: 'Qablny Top Agency',
  managerName: 'Admin',
  fixedSalary: 5000, // example fixed salary in coins/dollars
  
  // Computed values can just be functions or derived in components
  getStats: () => {
    return set((state) => {
      const activeHosts = state.hosts.filter(h => h.status !== 'Offline').length;
      const totalHosts = state.hosts.length;
      const totalEarnings = state.hosts.reduce((acc, h) => acc + h.earnings, 0);
      const agencyCut = totalEarnings * 0.20; // 20%
      return { activeHosts, totalHosts, totalEarnings, agencyCut };
    });
  },

  addHost: (name) => set((state) => ({
    hosts: [
      ...state.hosts,
      { id: Date.now(), name, status: 'Offline', earnings: 0, hours: 0 }
    ]
  })),

  updateHostStatus: (id, newStatus) => set((state) => ({
    hosts: state.hosts.map(h => h.id === id ? { ...h, status: newStatus } : h)
  }))
}));
