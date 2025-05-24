// frontend/src/modules/User/settings/AccountSettingModal.tsx
import React, { useState } from 'react';
import { Tabs } from 'antd';
import { UserOutlined, LockOutlined, BellOutlined, LayoutOutlined } from '@ant-design/icons';
import { useModalStore } from '@/stores/modalStore';
import SecurityForm from './components/SecurityForm';
import NotificationSettings from './components/NotificationSettings';
import UIPreferences from './components/UIPreferences';
import { User } from '@/types/user';
import styles from '@/components/modal/appModal.module.scss';

// 导入个人信息组件
import UserProfileContent from '@/modules/auth/profile/UserProfileContent';

interface AccountSettingModalProps {
  activeTab?: string;
  user: User;
  canEdit?: boolean;
}

const AccountSettingModal: React.FC<AccountSettingModalProps> = ({ 
  activeTab = 'profile',
  user,
  canEdit = true
}) => {
  const [currentTab, setCurrentTab] = useState(activeTab);
  
  return (
    <div className={styles.accountSettingModal}>
      <Tabs
        activeKey={currentTab}
        onChange={setCurrentTab}
        items={[
          {
            key: 'profile',
            label: <><UserOutlined /> 个人信息</>,
            children: <UserProfileContent.ViewMode user={user} canEdit={canEdit} />
          },
          {
            key: 'security',
            label: <><LockOutlined /> 密码安全</>,
            children: <SecurityForm />
          },
          {
            key: 'notification',
            label: <><BellOutlined /> 通知设置</>,
            children: <NotificationSettings />
          },
          {
            key: 'preferences',
            label: <><LayoutOutlined /> 界面偏好</>,
            children: <UIPreferences />
          }
        ]}
      />
    </div>
  );
};

// 导出打开Modal的函数
export const openAccountSettingModal = (
  user: User,
  activeTab: string = 'profile',
  canEdit: boolean = true
) => {
  const { openModal } = useModalStore.getState();
  openModal({
    title: '账号设置',
    content: <AccountSettingModal user={user} activeTab={activeTab} canEdit={canEdit} />,
    footer: null,
    width: 650, // 更宽一些以适应Tabs内容
  });
};

export default AccountSettingModal;