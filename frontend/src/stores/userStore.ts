import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface UserState {
  user: User | null;
  token: string;
  role: 'admin' | 'editor' | 'viewer';
  firstLogin: boolean;
  loading: boolean;
  setUser: (user: User | null, token: string, role: 'admin' | 'editor' | 'viewer', firstLogin: boolean) => void;
  setFirstLogin: (firstLogin: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: '',
  role: 'viewer',
  firstLogin: false,
  loading: false,
  setUser: (user, token, role, firstLogin) => set({ user, token, role, firstLogin }),
  setFirstLogin: (firstLogin) => set({ firstLogin }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, token: '', role: 'viewer', firstLogin: false }),
})); 