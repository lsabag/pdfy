import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  plan: string;
  storageUsedBytes: number;
  storageQuotaBytes: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('pdfy-token') : null,
  isLoading: true,
  isAuthenticated: false,

  loginWithGoogle: async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    localStorage.setItem('pdfy-token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('pdfy-token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('pdfy-token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('pdfy-token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
