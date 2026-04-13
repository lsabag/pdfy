import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  storageUsedBytes: number;
  storageQuotaBytes: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('pdfy-token') : null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('pdfy-token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
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
