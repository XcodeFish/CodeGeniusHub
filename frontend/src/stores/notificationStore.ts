import { create } from 'zustand';
import { Notification } from '@/types/notification';

/**
 * 通知状态接口
 */
interface NotificationState {
  // 通知列表
  notifications: Notification[];
  // 未读通知数量
  unreadCount: number;
  // 加载状态
  loading: boolean;

  // 设置通知列表
  setNotifications: (notifications: Notification[]) => void;
  // 设置未读通知数量
  setUnreadCount: (count: number) => void;
  // 设置加载状态
  setLoading: (loading: boolean) => void;
  // 标记通知为已读
  markAsRead: (id: string) => void;
  // 标记所有通知为已读
  markAllAsRead: () => void;
  // 添加新通知
  addNotification: (notification: Notification) => void;
  // 删除通知
  removeNotification: (id: string) => void;
}

/**
 * 通知Store
 */
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  // 设置通知列表
  setNotifications: (notifications) => set({ notifications }),

  // 设置未读通知数量
  setUnreadCount: (unreadCount) => set({ unreadCount }),

  // 设置加载状态
  setLoading: (loading) => set({ loading }),

  // 标记通知为已读
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),

  // 标记所有通知为已读
  markAllAsRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0
  })),

  // 添加新通知
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.isRead ? 0 : 1)
  })),

  // 删除通知
  removeNotification: (id) => set((state) => {
    const notification = state.notifications.find(n => n.id === id);
    return {
      notifications: state.notifications.filter(n => n.id !== id),
      unreadCount: notification && !notification.isRead
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount
    };
  })
})); 