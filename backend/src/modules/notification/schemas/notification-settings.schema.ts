import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationSettingsDocument =
  HydratedDocument<NotificationSettings>;

@Schema({ timestamps: true }) // 添加时间戳，记录创建和更新时间
export class NotificationSettings {
  @Prop({ required: true, unique: true })
  userId: string; // 用户ID

  @Prop({ default: true })
  emailNotify: boolean; // 项目邀请邮件通知

  @Prop({ default: true })
  commentNotify: boolean; // 代码评论通知

  @Prop({ default: true })
  systemNotify: boolean; // 系统更新通知

  @Prop({ default: true })
  collaborationNotify: boolean; // 协作更新通知

  @Prop({ default: true })
  aiNotify: boolean; // AI任务完成通知
}

export const NotificationSettingsSchema =
  SchemaFactory.createForClass(NotificationSettings);

// 添加索引以优化查询
NotificationSettingsSchema.index({ userId: 1 }, { unique: true });
