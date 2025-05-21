import { create } from 'zustand';
import { User } from '@/types/user';

interface UserState {
  user: User | null;
  token: string;
  permission: 'admin' | 'editor' | 'viewer';
  firstLogin: boolean;
  loading: boolean;
  setUser: (user: User | null, token: string, permission: 'admin' | 'editor' | 'viewer', firstLogin: boolean) => void;
  setFirstLogin: (firstLogin: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: '',
  permission: 'viewer',
  firstLogin: false,
  loading: false,
  setUser: (user, token, permission, firstLogin) => set({ user, token, permission, firstLogin }),
  setFirstLogin: (firstLogin) => set({ firstLogin }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, token: '', permission: 'viewer', firstLogin: false }),
})); 