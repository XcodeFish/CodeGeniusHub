import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

// 通知类型枚举
export enum NotificationType {
  SYSTEM = 'system', // 系统通知
  PROJECT_INVITE = 'project_invite', // 项目邀请
  COMMENT = 'comment', // 评论通知
  COLLABORATION = 'collaboration', // 协作通知
  AI_TASK = 'ai_task', // AI任务完成通知
}

@Schema({ timestamps: true }) // 添加时间戳，记录创建和更新时间
export class Notification {
  @Prop({ required: true })
  userId: string; // 接收通知的用户ID

  @Prop({ required: true })
  title: string; // 通知标题

  @Prop({ required: true })
  content: string; // 通知内容

  @Prop({
    required: true,
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: string; // 通知类型

  @Prop({ default: false })
  isRead: boolean; // 是否已读

  @Prop({ required: true, default: Date.now })
  createTime: Date; // 创建时间

  @Prop()
  expireTime?: Date; // 过期时间，可选

  @Prop()
  link?: string; // 相关链接，可选

  @Prop({ type: Object })
  data?: any; // 额外数据，如projectId, fileId等
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// 添加索引以优化查询性能
NotificationSchema.index({ userId: 1 }); // 按用户ID索引
NotificationSchema.index({ userId: 1, isRead: 1 }); // 查询用户未读通知
NotificationSchema.index({ userId: 1, type: 1 }); // 按用户和通知类型查询
NotificationSchema.index({ createTime: -1 }); // 按创建时间倒序索引
// 添加过期时间索引，自动清理过期通知
NotificationSchema.index({ expireTime: 1 }, { expireAfterSeconds: 0 });
