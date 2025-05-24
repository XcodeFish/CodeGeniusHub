import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Dropdown, List, Button, Space, Tag, Empty, Spin, Typography, Result } from 'antd';
import { BellOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNotification } from '@/hooks/useNotification';
import { NotificationType } from '@/types/notification';
import dayjs from 'dayjs';
import styles from './NotificationDropdown.module.scss';
import { useRouter } from 'next/router';

const { Text } = Typography;

/**
 * 通知下拉菜单组件
 * 显示在页面顶部，点击后展示最近的通知列表
 */
const NotificationDropdown: React.FC = () => {
  // 下拉菜单开启状态
  const [open, setOpen] = useState(false);
  // 错误状态
  const [hasError, setHasError] = useState(false);
  
  // 使用通知Hook获取通知相关功能
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useNotification();
  
  // Next.js路由
  const router = useRouter();

  // 下拉菜单打开时获取通知列表
  useEffect(() => {
    if (open) {
      fetchNotificationsWithErrorHandling();
    }
  }, [open]);

  // 带错误处理的获取通知函数
  const fetchNotificationsWithErrorHandling = useCallback(async () => {
    setHasError(false);
    try {
      await fetchNotifications(1, 10);
    } catch (error) {
      setHasError(true);
      console.error('获取通知失败:', error);
    }
  }, [fetchNotifications]);

  // 重新加载通知
  const handleReload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fetchNotificationsWithErrorHandling();
  }, [fetchNotificationsWithErrorHandling]);

  /**
   * 获取通知类型对应的标签
   * @param type 通知类型
   * @returns 标签组件
   */
  const getTypeTag = useCallback((type: string) => {
    switch (type) {
      case NotificationType.SYSTEM:
        return <Tag color="blue">系统</Tag>;
      case NotificationType.PROJECT_INVITE:
        return <Tag color="green">邀请</Tag>;
      case NotificationType.COMMENT:
        return <Tag color="orange">评论</Tag>;
      case NotificationType.COLLABORATION:
        return <Tag color="purple">协作</Tag>;
      case NotificationType.AI_TASK:
        return <Tag color="cyan">AI</Tag>;
      default:
        return <Tag>其他</Tag>;
    }
  }, []);

  /**
   * 处理通知点击事件
   * @param notification 通知对象
   */
  const handleNotificationClick = useCallback(async (notification: any) => {
    // 如果未读，则标记为已读
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    // 如果有链接，则跳转
    if (notification.link) {
      router.push(notification.link);
    }
    // 关闭下拉菜单
    setOpen(false);
  }, [markNotificationAsRead, router]);

  // 通知内容组件
  const renderNotificationContent = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          <Spin tip="加载中...">
            <div className={styles.loadingContent} />
          </Spin>
        </div>
      );
    }
    
    if (hasError) {
      return (
        <Result
          status="warning"
          title="获取通知失败"
          extra={
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={handleReload}
            >
              重新加载
            </Button>
          }
        />
      );
    }
    
    if (!notifications || notifications.length === 0) {
      return <Empty description="暂无通知" />;
    }
    
    return (
      <List
        itemLayout="horizontal"
        dataSource={notifications}
        renderItem={(notification: any) => (
          <List.Item
            className={`${styles.item} ${notification.isRead ? '' : styles.unread}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <List.Item.Meta
              title={
                <Space>
                  {getTypeTag(notification.type)}
                  <span>{notification.title}</span>
                </Space>
              }
              description={
                <>
                  <div className={styles.content}>{notification.content}</div>
                  <div className={styles.time}>
                    {notification.createTime ? 
                      dayjs(notification.createTime).format('YYYY-MM-DD HH:mm') : 
                      '未知时间'}
                  </div>
                </>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  // 通知内容
  const notificationContent = (
    <div className={styles.dropdownContainer}>
      <div className={styles.header}>
        <Text strong>通知</Text>
        <Space>
          {loading && <Spin size="small" />}
          {unreadCount > 0 && !loading && (
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                markAllNotificationsAsRead();
              }}
            >
              全部已读
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleReload}
          >
            刷新
          </Button>
        </Space>
      </div>
      <div className={styles.content}>
        {renderNotificationContent()}
      </div>
      <div className={styles.footer}>
        <Button type="link" onClick={() => router.push('/notifications')}>
          查看全部
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      popupRender={() => notificationContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button type="text" icon={<BellOutlined />} className={styles.notificationButton} />
      </Badge>
    </Dropdown>
  );
};

export default NotificationDropdown; 