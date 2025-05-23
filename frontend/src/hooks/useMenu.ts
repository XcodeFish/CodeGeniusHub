import { useEffect } from 'react';
import { useMenuStore, MenuItem } from '@/stores/menuStore';
import { useUserStore } from '@/stores/userStore';
import { defaultMenus } from '@/constants/menu-data';

/**
 * 菜单相关Hook
 */
export function useMenu() {
  const { menus, loading, setMenus, setLoading } = useMenuStore();
  const { permission } = useUserStore();

  /**
   * 获取菜单列表，根据用户权限过滤
   */
  const fetchMenus = async () => {
    setLoading(true);
    try {
      // 基于权限构建菜单树
      let userMenus = [...defaultMenus.common];
      
      // 如果用户是editor或admin，添加对应菜单
      if (permission === 'editor' || permission === 'admin') {
        userMenus = mergeMenuItems(userMenus, defaultMenus.editorAndAdmin);
      }
      
      // 如果用户是admin，添加管理员菜单
      if (permission === 'admin') {
        userMenus = mergeMenuItems(userMenus, defaultMenus.adminOnly);
      }

      // 重新构建菜单树结构
      const menuTree = buildMenuTree(userMenus);
      
      // 更新菜单状态
      setMenus(menuTree);
    } catch (error) {
      console.error('处理菜单数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 合并菜单项，将带有parentId的菜单项合并到其父菜单的children中
  const mergeMenuItems = (baseMenus: MenuItem[], additionalMenus: MenuItem[]): MenuItem[] => {
    const result = [...baseMenus];
    
    additionalMenus.forEach(item => {
      if (item.parentId) {
        // 查找父菜单
        const parent = findMenuItem(result, item.parentId);
        if (parent) {
          // 检查是否已存在相同moduleId的子菜单项
          if (!parent.children) {
            parent.children = [];
          }
          
          // 检查是否已存在相同moduleId的菜单项，避免重复添加
          const existingItemIndex = parent.children.findIndex(child => child.moduleId === item.moduleId);
          if (existingItemIndex === -1) {
            // 不存在则添加
            parent.children.push({ ...item });
            parent.children.sort((a, b) => a.moduleOrder - b.moduleOrder);
          } else {
            // 存在则更新
            console.log(`菜单项 '${item.moduleId}' 已存在，跳过添加`);
          }
        }
      } else {
        // 检查顶级菜单是否已存在
        const existingIndex = result.findIndex(existing => existing.moduleId === item.moduleId);
        if (existingIndex === -1) {
          // 顶级菜单不存在，直接添加
          result.push({ ...item });
        } else {
          console.log(`顶级菜单项 '${item.moduleId}' 已存在，跳过添加`);
        }
      }
    });
    
    // 按moduleOrder排序
    result.sort((a, b) => a.moduleOrder - b.moduleOrder);
    return result;
  };

  // 递归查找菜单项
  const findMenuItem = (items: MenuItem[], moduleId: string): MenuItem | null => {
    for (const item of items) {
      if (item.moduleId === moduleId) {
        return item;
      }
      if (item.children?.length) {
        const found = findMenuItem(item.children, moduleId);
        if (found) return found;
      }
    }
    return null;
  };

  // 构建菜单树
  const buildMenuTree = (menuItems: MenuItem[]): MenuItem[] => {
    const topLevelItems = menuItems.filter(item => !item.parentId);
    return topLevelItems.sort((a, b) => a.moduleOrder - b.moduleOrder);
  };

  return { menus, loading, fetchMenus };
} 