import { create } from 'zustand';
import { User } from '@/types/user';
const defaultUser: User = {
  id: '',
  username: '',
  email: '',
  permission: 'viewer',
  phone: '',
  avatar: '',
}
interface UserState {
  user: User | typeof defaultUser;
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
  user: defaultUser,
  token: '',
  permission: 'viewer',
  firstLogin: false,
  loading: false,
  setUser: (user, token, permission, firstLogin) => set({ user: user || defaultUser, token, permission, firstLogin }),
  setFirstLogin: (firstLogin) => set({ firstLogin }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: defaultUser, token: '', permission: 'viewer', firstLogin: false }),
})); 