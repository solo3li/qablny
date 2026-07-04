import { describe, it, expect, beforeEach, vi } from 'vitest';
import useAgencyStore from '../../agency-dashboard/src/store/useAgencyStore';

describe('Agency Store Tests', () => {
  beforeEach(() => {
    // Reset global fetch mock before each test
    global.fetch = vi.fn();
    useAgencyStore.setState({ 
      isLoggedIn: false, 
      agencyId: null, 
      totalHosts: 0,
      totalEarnings: 0
    });
  });

  it('should initialize with correct default state', () => {
    const state = useAgencyStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.agencyId).toBe(null);
  });

  it('login should set isLoggedIn to true on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'mock-token', agencyId: '123' })
    });

    const success = await useAgencyStore.getState().login('admin', 'pass');
    
    expect(success).toBe(true);
    const state = useAgencyStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.agencyId).toBe('123');
  });

  it('fetchStats should update earnings and hosts', async () => {
    // Force logged in state for testing
    useAgencyStore.setState({ isLoggedIn: true, agencyId: '123' });
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalHosts: 10, totalEarnings: 5000 })
    });

    await useAgencyStore.getState().fetchStats();
    
    const state = useAgencyStore.getState();
    expect(state.totalHosts).toBe(10);
    expect(state.totalEarnings).toBe(5000);
  });
});
