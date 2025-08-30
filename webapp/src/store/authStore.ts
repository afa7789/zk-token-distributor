import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  address: string | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  connect: (address: string) => void;
  disconnect: () => void;
  setAuthenticated: (token: string) => void;
  clearAuthentication: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      address: null,
      isConnected: false,
      isAuthenticated: false,
      sessionToken: null,
      connect: (address: string) =>
        set({ address, isConnected: true }),
      disconnect: () =>
        set({ address: null, isConnected: false, isAuthenticated: false, sessionToken: null }),
      setAuthenticated: (token: string) =>
        set({ isAuthenticated: true, sessionToken: token }),
      clearAuthentication: () =>
        set({ isAuthenticated: false, sessionToken: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
