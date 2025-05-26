import React, { useEffect, useState } from 'react';
import { Layout, Menu, Spin } from 'antd';
import { useRouter } from 'next/router';
import * as Icons from '@ant-design/icons';
import { useMenu } from '@/hooks/useMenu';
import styles from './layout.module.scss';
import { MenuItem as MenuItemType } from '@/stores/menuStore';
import type { MenuProps } from 'antd';
import { useAIHelper } from '@/modules/AIHelper';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
}

type MenuItem = {
  key: string;
  icon?: React.ReactNode;
  label: string;
  children?: MenuItem[];
  onClick?: (e?: any) => void;
};

/**
 * 侧边栏导航组件
 */
const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const router = useRouter();
  const { menus, loading, fetchMenus } = useMenu();
  const { openAIHelper } = useAIHelper();
  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>([]);

  // 如果使用动态菜单，这部分应该由后端返回
  const handleAIHelperClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openAIHelper();
  };
  
  // 组件挂载时获取菜单数据
  useEffect(() => {
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 移除fetchMenus依赖，只在组件挂载时获取一次菜单数据

  /**
   * 获取菜单图标
   */
  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    
    // @ts-ignore - 动态导入图标
    const Icon = Icons[iconName + 'Outlined'] || Icons[iconName];
    return Icon ? React.createElement(Icon) : null;
  };

  /**
   * 处理菜单项点击事件
   */
  const handleMenuClick = (path: string) => {
    router.push(path);
  };

  /**
   * 渲染菜单项
   */
  const renderMenuItems = (menuItems: MenuItemType[]): MenuItem[] => {
    return menuItems.map(item => {
      // 为AI助手菜单项提供直接路由跳转，不再使用抽屉组件
      if (item.moduleId === 'ai') {
        return {
          key: item.moduleId,
          icon: getIcon(item.moduleIcon),
          label: item.moduleName,
          onClick: () => handleMenuClick('/ai')
        };
      }

      // 过滤掉AI助手的子菜单项
      if (item.children && item.children.length > 0) {
        const filteredChildren = item.children.filter(
          child => !child.moduleId.startsWith('ai-')
        );
        
        if (filteredChildren.length > 0) {
          return {
            key: item.moduleId,
            icon: getIcon(item.moduleIcon),
            label: item.moduleName,
            children: renderMenuItems(filteredChildren)
          };
        }
      }
      
      return {
        key: item.moduleId,
        icon: getIcon(item.moduleIcon),
        label: item.moduleName,
        onClick: () => handleMenuClick(item.modulePath)
      };
    });
  };

  // 当前选中的菜单项 - 处理URL路径与moduleId的映射
  const path = router.pathname;
  const pathSegments = path.split('/').filter(Boolean);
  
  // 映射URL路径到菜单key
  const mapPathToKeys = () => {
    // 根路径特殊处理
    if (pathSegments.length === 0) return { selectedKeys: ['dashboard'], openKeys: [] };
    
    // 一级菜单
    if (pathSegments.length === 1) {
      return { 
        selectedKeys: [pathSegments[0]], 
        openKeys: [] 
      };
    }
    
    // 二级菜单
    if (pathSegments.length >= 2) {
      const parentKey = pathSegments[0];
      const childKey = `${parentKey}-${pathSegments[1]}`;
      return { 
        selectedKeys: [childKey], 
        openKeys: [parentKey] 
      };
    }
    
    return { selectedKeys: [], openKeys: [] };
  };
  
  const { selectedKeys, openKeys } = mapPathToKeys();
  
  // 初始设置打开的菜单项
  useEffect(() => {
    if (!collapsed && openKeys.length > 0) {
      setMenuOpenKeys(openKeys);
    }
  }, [path, collapsed]);
  
  // 处理菜单展开/折叠
  const handleOpenChange = (newOpenKeys: string[]) => {
    setMenuOpenKeys(newOpenKeys);
  };

  return (
    <Sider 
      width={220} 
      collapsible 
      collapsed={collapsed}
      className={styles.sidebar}
      theme="light"
      trigger={null}
    >
      <div className={styles.logoContainer}>
        {collapsed ? (
          <div className={styles.logoSmall}>AI</div>
        ) : (
          <div className={styles.logoFull}>CodeGenius</div>
        )}
      </div>
      
      {loading ? (
        <div className={styles.menuLoading}>
          <Spin size="small" /> <span style={{ marginLeft: '8px' }}>加载中...</span>
        </div>
      ) : (
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={collapsed ? [] : menuOpenKeys}
          onOpenChange={handleOpenChange}
          className={styles.sidebarMenu}
          items={renderMenuItems(menus)}
        />
      )}
    </Sider>
  );
};

export default Sidebar; 