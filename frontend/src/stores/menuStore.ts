import { create } from 'zustand';

export interface MenuItem {
  moduleId: string;
  moduleName: string;
  modulePath: string;
  moduleIcon?: string;
  moduleOrder: number;
  parentId?: string;
  children?: MenuItem[];
}

interface MenuState {
  menus: MenuItem[];
  loading: boolean;
  setMenus: (menus: MenuItem[]) => void;
  setLoading: (loading: boolean) => void;
}

// 菜单全局状态管理
export const useMenuStore = create<MenuState>((set) => ({
  menus: [],
  loading: false,
  setMenus: (menus) => set({ menus }),
  setLoading: (loading) => set({ loading }),
}));