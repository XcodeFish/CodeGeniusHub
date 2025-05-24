import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSocketStore } from '@/stores/socketStore';
import { useUserStore } from '@/stores/userStore';
import notificationService from '@/services/notification';
import { NotificationType, Notification } from '@/types/notification';
import { message } from 'antd';

/**
 * 通知业务Hook
 * 处理通知相关的所有业务逻辑，包括获取通知列表、标记已读、删除通知以及通知设置
 */
export function useNotification() {
  // 获取通知状态
  const {
    notifications,
    unreadCount,
    loading,
    setNotifications,
    setUnreadCount,
    setLoading,
    markAsRead,
    markAllAsRead: markAllNotificationsAsReadInStore,
    addNotification,
    removeNotification: removeNotificationFromStore
  } = useNotificationStore();

  // 获取Socket状态
  const { socket } = useSocketStore();

  // 获取用户信息
  const { token } = useUserStore();

  /**
   * 获取通知列表
   * @param page 页码
   * @param pageSize 每页数量
   * @param type 通知类型
   * @param isRead 是否已读
   */
  const fetchNotifications = useCallback(async (page = 1, pageSize = 10, type?: string, isRead?: boolean) => {
    setLoading(true);
    let retries = 0;
    const maxRetries = 2;
    
    const tryFetch = async (): Promise<any> => {
      try {
        // 添加10秒超时
        return await Promise.race([
          notificationService.getNotifications(page, pageSize, type, isRead),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时')), 10000)
          )
        ]);
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          console.log(`获取通知列表重试 (${retries}/${maxRetries})...`);
          return tryFetch(); // 递归重试
        }
        throw error; // 重试次数用完，抛出错误
      }
    };
    
    try {
      const res = await tryFetch();
      if (res.code === 0) {
        setNotifications(res.data.list);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
      // 避免UI卡在加载状态
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setNotifications]);

  /**
   * 获取未读通知数量
   */
  const fetchUnreadCount = useCallback(async () => {
    let retries = 0;
    const maxRetries = 2;
    
    const tryFetch = async (): Promise<any> => {
      try {
        // 添加5秒超时，这个请求应该很快
        return await Promise.race([
          notificationService.getUnreadCount(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时')), 5000)
          )
        ]);
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          console.log(`获取未读通知数量重试 (${retries}/${maxRetries})...`);
          return tryFetch(); // 递归重试
        }
        throw error; // 重试次数用完，抛出错误
      }
    };
    
    try {
      const res = await tryFetch();
      if (res.code === 0) {
        setUnreadCount(res.data.count);
      }
    } catch (error) {
      console.error('获取未读通知数量失败:', error);
    }
  }, [setUnreadCount]);

  /**
   * 标记通知为已读
   * @param id 通知ID
   */
  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      const res = await notificationService.markAsRead(id);
      if (res.code === 0) {
        markAsRead(id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('标记通知已读失败:', error);
      message.error('操作失败，请稍后再试');
      return false;
    }
  }, [markAsRead]);

  /**
   * 标记所有通知为已读
   * @param ids 通知ID数组(可选，不提供则标记所有为已读)
   */
  const markAllNotificationsAsRead = useCallback(async (ids?: string[]) => {
    try {
      const res = await notificationService.markAllAsRead(ids);
      if (res.code === 0) {
        markAllNotificationsAsReadInStore();
        return true;
      }
      return false;
    } catch (error) {
      console.error('标记所有通知已读失败:', error);
      message.error('操作失败，请稍后再试');
      return false;
    }
  }, [markAllNotificationsAsReadInStore]);

  /**
   * 删除通知
   * @param id 通知ID
   */
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const res = await notificationService.deleteNotification(id);
      if (res.code === 0) {
        removeNotificationFromStore(id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除通知失败:', error);
      message.error('删除失败，请稍后再试');
      return false;
    }
  }, [removeNotificationFromStore]);

  /**
   * 获取通知设置
   */
  const fetchNotificationSettings = useCallback(async () => {
    try {
      const res = await notificationService.getNotificationSettings();
      return res.code === 0 ? res.data : null;
    } catch (error) {
      console.error('获取通知设置失败:', error);
      message.error('获取通知设置失败');
      return null;
    }
  }, []);

  /**
   * 更新通知设置
   * @param settings 通知设置
   */
  const updateNotificationSettings = useCallback(async (settings: {
    emailNotify?: boolean;
    commentNotify?: boolean;
    systemNotify?: boolean;
    collaborationNotify?: boolean;
    aiNotify?: boolean;
  }) => {
    try {
      const res = await notificationService.updateNotificationSettings(settings);
      if (res.code === 0) {
        message.success('设置已更新');
      }
      return res.code === 0;
    } catch (error) {
      console.error('更新通知设置失败:', error);
      message.error('更新通知设置失败');
      return false;
    }
  }, []);

  // 监听Socket通知事件
  useEffect(() => {
    if (socket) {
      const handleNotification = (data: { type: string, data: Notification }) => {
        if (data.type === 'notification') {
          addNotification(data.data);
          // 收到新通知时，更新未读数量
          fetchUnreadCount();
        }
      };

      // 注册通知事件监听
      socket.on('notification', handleNotification);

      // 清理函数
      return () => {
        socket.off('notification', handleNotification);
      };
    }
  }, [socket, addNotification, fetchUnreadCount]);

  // 初始化时获取未读通知数量
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
    }
  }, [token, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    fetchNotificationSettings,
    updateNotificationSettings
  };
} 