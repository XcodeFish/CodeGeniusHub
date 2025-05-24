import http from '@/utils/request';
import { 
  Notification, 
  NotificationSettings,
  NotificationListResult,
  UnreadCountResult
} from '@/types/notification';

/**
 * 通知服务
 */
class NotificationService {
  /**
   * 获取通知列表
   * @param page 页码(可选，默认1)
   * @param pageSize 每页数量(可选，默认10)
   * @param type 通知类型(可选)
   * @param isRead 是否已读(可选)
   * @returns 通知列表结果
   */
  async getNotifications(page = 1, pageSize = 10, type?: string, isRead?: boolean) {
    const params: Record<string, any> = { page, pageSize };
    if (type) params.type = type;
    if (isRead !== undefined) params.isRead = isRead;

    return http.get<{ code: number, message: string, data: NotificationListResult }>(
      '/notifications',
      params
    );
  }

  /**
   * 获取未读通知数量
   * @returns 未读通知数量
   */
  async getUnreadCount() {
    return http.get<{ code: number, message: string, data: UnreadCountResult }>(
      '/notifications/unread-count'
    );
  }

  /**
   * 标记通知为已读
   * @param id 通知ID
   * @returns 操作结果
   */
  async markAsRead(id: string) {
    return http.patch<{ code: number, message: string }>(
      `/notifications/${id}/read`
    );
  }

  /**
   * 批量标记通知为已读
   * @param ids 通知ID数组(可选，不提供则标记所有为已读)
   * @returns 操作结果
   */
  async markAllAsRead(ids?: string[]) {
    return http.patch<{ code: number, message: string }>(
      '/notifications/read-all',
      { ids }
    );
  }

  /**
   * 删除通知
   * @param id 通知ID
   * @returns 操作结果
   */
  async deleteNotification(id: string) {
    return http.delete<{ code: number, message: string }>(
      `/notifications/${id}`
    );
  }

  /**
   * 获取通知设置
   * @returns 通知设置
   */
  async getNotificationSettings() {
    return http.get<{ code: number, message: string, data: NotificationSettings }>(
      '/user/notification-settings'
    );
  }

  /**
   * 更新通知设置
   * @param settings 通知设置
   * @returns 操作结果
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>) {
    return http.put<{ code: number, message: string }>(
      '/user/notification-settings',
      settings
    );
  }
}

export default new NotificationService(); 