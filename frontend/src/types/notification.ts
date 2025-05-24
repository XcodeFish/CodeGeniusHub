/**
 * 通知类型定义
 */

// 通知类型枚举
export enum NotificationType {
  SYSTEM = 'system',           // 系统通知
  PROJECT_INVITE = 'project_invite', // 项目邀请
  COMMENT = 'comment',         // 评论通知
  COLLABORATION = 'collaboration', // 协作通知
  AI_TASK = 'ai_task',         // AI任务完成通知
}

// 通知接口
export interface Notification {
  id: string;          // 通知ID
  userId: string;      // 接收通知的用户ID
  title: string;       // 通知标题
  content: string;     // 通知内容
  type: NotificationType; // 通知类型
  isRead: boolean;     // 是否已读
  createTime: Date;    // 创建时间
  expireTime?: Date;   // 过期时间
  link?: string;       // 相关链接
  data?: any;          // 额外数据，如projectId, fileId等
}

// 通知设置接口
export interface NotificationSettings {
  userId: string;               // 用户ID
  emailNotify: boolean;         // 项目邀请邮件通知
  commentNotify: boolean;       // 代码评论通知
  systemNotify: boolean;        // 系统更新通知
  collaborationNotify: boolean; // 协作更新通知
  aiNotify: boolean;            // AI任务完成通知
}

// 分页查询返回结果接口
export interface NotificationListResult {
  total: number;
  list: Notification[];
}

// 未读通知数量接口
export interface UnreadCountResult {
  count: number;
} 