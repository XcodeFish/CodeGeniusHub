import React from 'react';
import { Layout, Button, Avatar, Dropdown, Space, Badge } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/modules/auth/useAuth';
import styles from './layout.module.scss';
import type { MenuProps } from 'antd';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

/**
 * 顶部导航栏组件
 */
const Header: React.FC<HeaderProps> = ({ collapsed, toggleSidebar }) => {
  const { user } = useUserStore();
  const { logout } = useAuth();
  
  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />
    },
    {
      key: 'settings',
      label: '账号设置',
      icon: <SettingOutlined />
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: () => logout()
    }
  ];

  return (
    <AntHeader className={styles.header}>
      <div className={styles.headerLeft}>
        <Button 
          type="text" 
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} 
          onClick={toggleSidebar}
          className={styles.triggerButton}
        />
        <div className={styles.platformTitle}>AI智能代码生成与协作平台</div>
      </div>
      
      <div className={styles.headerRight}>
        <Badge dot className={styles.notification}>
          <Button 
            type="text"
            icon={<BellOutlined />} 
            className={styles.notificationButton}
          />
        </Badge>
        
        <Dropdown 
          menu={{ items }} 
          placement="bottomRight"
          trigger={['click']}
        >
          <Space className={styles.userDropdown}>
            <Avatar icon={<UserOutlined />} />
            <span className={styles.username}>{user?.username || '用户'}</span>
          </Space>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header; 