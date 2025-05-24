import React from 'react';
import { Layout, Button, Avatar, Dropdown, Space } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/modules/auth/useAuth';
import styles from './layout.module.scss';
import type { MenuProps } from 'antd';
import { openUserProfileModal } from '@/modules/auth/profile/UserProfileContent';
import { useRouter } from 'next/router';
import { NotificationDropdown } from '@/components/notification';
import { openAccountSettingModal } from '@/modules/User/settings/AccountSettingModal';


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
  const router = useRouter();
  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
      onClick: () => handleProfileClick()
    },
    {
      key: 'settings',
      label: '账号设置',
      icon: <SettingOutlined />,
      onClick: () => {
        // 调用打开Modal的函数
        openAccountSettingModal(user, 'profile', true);
      }
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

  const handleProfileClick = () => {
    openUserProfileModal(user, true);
  };

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
        <div className={styles.notification}>
          <NotificationDropdown />
        </div>
        
        <Dropdown 
          menu={{ items }} 
          placement="bottomRight"
          trigger={['click']}
        >
          <Space className={styles.userDropdown} onClick={(e) => {
            e.stopPropagation();
          }}>
            <Avatar icon={<UserOutlined />} />
            <span className={styles.username}>{user?.username || '用户'}</span>
          </Space>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header; 