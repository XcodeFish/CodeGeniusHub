import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  Notification,
  NotificationType,
  NotificationDocument,
} from './schemas/notification.schema';
import {
  NotificationSettings,
  NotificationSettingsDocument,
} from './schemas/notification-settings.schema';
import { NotificationResponseDto } from './dto/notification.dto';
import { Cron } from '@nestjs/schedule';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationService {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationService.name);
  private readonly maxRetries = 3; // 最大重试次数

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationSettings.name)
    private notificationSettingsModel: Model<NotificationSettingsDocument>,
  ) {}

  /**
   * 带重试的数据库操作包装器
   * @param operation 数据库操作函数
   * @param maxRetries 最大重试次数
   * @returns 操作结果
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = this.maxRetries,
  ): Promise<T> {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `数据库操作失败(尝试 ${attempt}/${maxRetries}): ${error.message}`,
        );

        // 如果不是最后一次尝试，则等待一段时间再重试
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // 指数退避策略
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * 创建通知
   * @param userId 接收通知的用户ID
   * @param title 通知标题
   * @param content 通知内容
   * @param type 通知类型
   * @param link 相关链接
   * @param data 额外数据
   * @returns 创建的通知对象
   */
  async createNotification(
    userId: string,
    title: string,
    content: string,
    type: NotificationType,
    link?: string,
    data?: any,
  ): Promise<NotificationDocument | null> {
    try {
      // 检查用户通知设置
      const settings = await this.getNotificationSettings(userId);

      // 根据通知类型和设置决定是否发送通知
      let shouldSendNotification = true;
      switch (type) {
        case NotificationType.SYSTEM:
          shouldSendNotification = settings.systemNotify;
          break;
        case NotificationType.PROJECT_INVITE:
          shouldSendNotification = settings.emailNotify;
          break;
        case NotificationType.COMMENT:
          shouldSendNotification = settings.commentNotify;
          break;
        case NotificationType.COLLABORATION:
          shouldSendNotification = settings.collaborationNotify;
          break;
        case NotificationType.AI_TASK:
          shouldSendNotification = settings.aiNotify;
          break;
      }

      if (!shouldSendNotification) {
        return null;
      }

      // 创建通知
      const notification = new this.notificationModel({
        userId,
        title,
        content,
        type,
        isRead: false,
        createTime: new Date(),
        link,
        data,
      });

      const savedNotification = await notification.save();

      // 发送WebSocket通知
      this.sendNotificationToUser(userId, savedNotification);

      return savedNotification;
    } catch (error) {
      console.error('创建通知失败:', error);
      return null;
    }
  }

  /**
   * 获取用户通知列表
   * @param userId 用户ID
   * @param page 页码
   * @param pageSize 每页数量
   * @param type 通知类型
   * @param isRead 是否已读
   * @returns 通知列表和总数
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
    type?: NotificationType,
    isRead?: boolean,
  ) {
    const query: any = { userId };

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    try {
      const [total, notifications] = await Promise.all([
        this.withRetry(() => this.notificationModel.countDocuments(query)),
        this.withRetry(() =>
          this.notificationModel
            .find(query)
            .sort({ createTime: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .exec(),
        ),
      ]);

      return {
        total,
        list: notifications.map((notification) =>
          NotificationResponseDto.fromNotification(notification),
        ),
      };
    } catch (error) {
      this.logger.error(`获取用户通知失败: ${error.message}`, error.stack);
      // 返回空结果，防止前端报错
      return {
        total: 0,
        list: [],
      };
    }
  }

  /**
   * 获取未读通知数量
   * @param userId 用户ID
   * @returns 未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.withRetry(() =>
        this.notificationModel.countDocuments({ userId, isRead: false }),
      );
    } catch (error) {
      this.logger.error(`获取未读通知数量失败: ${error.message}`, error.stack);
      return 0; // 出错时返回0，避免前端显示问题
    }
  }

  /**
   * 标记通知为已读
   * @param userId 用户ID
   * @param notificationId 通知ID
   * @returns 是否标记成功
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const result = await this.withRetry(() =>
        this.notificationModel.updateOne(
          { _id: notificationId, userId },
          { isRead: true },
        ),
      );
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`标记通知已读失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 批量标记通知为已读
   * @param userId 用户ID
   * @param ids 通知ID列表
   * @returns 标记的通知数量
   */
  async markAllAsRead(userId: string, ids?: string[]): Promise<number> {
    try {
      const query: any = { userId, isRead: false };

      if (ids && ids.length > 0) {
        query._id = { $in: ids };
      }

      const result = await this.withRetry(() =>
        this.notificationModel.updateMany(query, {
          isRead: true,
        }),
      );
      return result.modifiedCount;
    } catch (error) {
      this.logger.error(`批量标记通知已读失败: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 删除通知
   * @param userId 用户ID
   * @param notificationId 通知ID
   * @returns 是否删除成功
   */
  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<boolean> {
    try {
      const result = await this.withRetry(() =>
        this.notificationModel.deleteOne({
          _id: notificationId,
          userId,
        }),
      );
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(`删除通知失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 获取用户通知设置
   * @param userId 用户ID
   * @returns 通知设置对象
   */
  async getNotificationSettings(
    userId: string,
  ): Promise<NotificationSettingsDocument> {
    try {
      let settings = await this.withRetry(() =>
        this.notificationSettingsModel.findOne({ userId }).exec(),
      );

      // 如果不存在，创建默认设置
      if (!settings) {
        settings = new this.notificationSettingsModel({
          userId,
          emailNotify: true,
          commentNotify: true,
          systemNotify: true,
          collaborationNotify: true,
          aiNotify: true,
        });
        // 这里settings已经是一个新对象，不会为null
        await this.withRetry(() => settings!.save());
      }

      return settings;
    } catch (error) {
      this.logger.error(`获取通知设置失败: ${error.message}`, error.stack);
      // 返回默认设置
      const defaultSettings = new this.notificationSettingsModel({
        userId,
        emailNotify: true,
        commentNotify: true,
        systemNotify: true,
        collaborationNotify: true,
        aiNotify: true,
      });
      return defaultSettings;
    }
  }

  /**
   * 防止通知数据无限增长
   * 提高数据库性能
   * 减少存储成本
   */
  @Cron('0 0 * * *') // 每天凌晨执行
  async cleanupOldNotifications() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    try {
      const result = await this.notificationModel.deleteMany({
        createTime: { $lt: threeMonthsAgo },
        isRead: true,
      });
      console.log(`已清理 ${result.deletedCount} 条旧通知`);
    } catch (error) {
      console.error('清理旧通知失败:', error);
    }
  }

  /**
   * 更新用户通知设置
   * @param userId 用户ID
   * @param settings 要更新的设置
   * @returns 更新后的通知设置
   */
  async updateNotificationSettings(
    userId: string,
    settings: {
      emailNotify?: boolean;
      commentNotify?: boolean;
      systemNotify?: boolean;
      collaborationNotify?: boolean;
      aiNotify?: boolean;
    },
  ): Promise<NotificationSettingsDocument> {
    const existingSettings = await this.getNotificationSettings(userId);

    // 更新设置
    if (settings.emailNotify !== undefined)
      existingSettings.emailNotify = settings.emailNotify;
    if (settings.commentNotify !== undefined)
      existingSettings.commentNotify = settings.commentNotify;
    if (settings.systemNotify !== undefined)
      existingSettings.systemNotify = settings.systemNotify;
    if (settings.collaborationNotify !== undefined)
      existingSettings.collaborationNotify = settings.collaborationNotify;
    if (settings.aiNotify !== undefined)
      existingSettings.aiNotify = settings.aiNotify;

    return existingSettings.save();
  }

  /**
   * 通过WebSocket发送通知
   * @param userId 用户ID
   * @param notification 通知对象
   * 优化后：增加通知投递的可靠性跟踪，提供详细的调试信息
   */
  private sendNotificationToUser(
    userId: string,
    notification: NotificationDocument,
  ): void {
    try {
      // 检查用户是否在线
      const userRoom = `user:${userId}`;
      const socketsInRoom = this.server.sockets.adapter.rooms.get(userRoom);

      // 发送WebSocket通知
      this.server.to(userRoom).emit('notification', {
        type: 'notification',
        data: NotificationResponseDto.fromNotification(notification),
      });

      // 记录通知状态
      const isDelivered = socketsInRoom && socketsInRoom.size > 0;
      console.log(
        `通知 ${notification._id} 发送给用户 ${userId}, 送达状态: ${isDelivered}`,
      );
    } catch (error) {
      console.error('发送WebSocket通知失败:', error);
      // 错误不会影响流程
    }
  }
}
