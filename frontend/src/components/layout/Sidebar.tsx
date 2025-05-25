import React, { useEffect } from 'react';
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

       // 处理AI助手相关菜单项
    if (item.moduleId === 'ai' || item.moduleId.startsWith('ai-')) {
      // 主菜单"AI助手"直接打开侧边栏
      if (item.moduleId === 'ai') {
        return {
          key: item.moduleId,
          icon: getIcon(item.moduleIcon),
          label: item.moduleName,
          onClick: (e: any) => {
            e.domEvent.preventDefault();
            openAIHelper();
          }
        };
      }
      
      // 子菜单项打开特定标签页
      const tabKey = item.moduleId.replace('ai-', '');
      return {
        key: item.moduleId,
        icon: getIcon(item.moduleIcon),
        label: item.moduleName,
        onClick: (e: any) => {
          e.domEvent.preventDefault();
          openAIHelper(tabKey);
        }
      };
    }

      if (item.children && item.children.length > 0) {
        return {
          key: item.moduleId,
          icon: getIcon(item.moduleIcon),
          label: item.moduleName,
          children: renderMenuItems(item.children)
        };
      }
      
      return {
        key: item.moduleId,
        icon: getIcon(item.moduleIcon),
        label: item.moduleName,
        onClick: () => handleMenuClick(item.modulePath)
      };
    });
  };

  // 当前选中的菜单项
  const selectedKey = router.pathname.split('/')[1] || 'dashboard';

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
          selectedKeys={[selectedKey]}
          className={styles.sidebarMenu}
          items={renderMenuItems(menus)}
        />
      )}
    </Sider>
  );
};

export default Sidebar; 