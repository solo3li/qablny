import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAgencyStore } from '../../agency-dashboard/src/store/useAgencyStore';

describe('Agency Store Tests', () => {
  beforeEach(() => {
    // Reset global fetch mock before each test
    global.fetch = vi.fn();
    useAgencyStore.setState({ 
      token: null, 
      agencyName: '',
      inviteCode: '',
      totalHosts: 0,
      totalEarnings: 0
    });
  });

  it('should initialize with correct default state', () => {
    const state = useAgencyStore.getState();
    expect(state.token).toBe(null);
    expect(state.totalHosts).toBe(0);
  });

  it('login should set token on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'mock-token', agencyName: 'Test', managerName: 'Test', inviteCode: '123' })
    });

    const success = await useAgencyStore.getState().login('admin', 'pass');
    
    expect(success).toBe(true);
    const state = useAgencyStore.getState();
    expect(state.token).toBe('mock-token');
    expect(state.inviteCode).toBe('123');
  });

  it('fetchDashboardStats should update earnings and hosts', async () => {
    // Force logged in state for testing
    useAgencyStore.setState({ token: 'mock-token' });
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalHosts: 10, totalEarnings: 5000, activeHosts: 2 })
    });

    await useAgencyStore.getState().fetchDashboardStats();
    
    const state = useAgencyStore.getState();
    expect(state.totalHosts).toBe(10);
    expect(state.totalEarnings).toBe(5000);
    expect(state.activeHosts).toBe(2);
  });
});
