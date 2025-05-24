import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../schemas/notification.schema';

// 通知响应DTO
export class NotificationResponseDto {
  @ApiProperty({ description: '通知ID' })
  id: string;

  @ApiProperty({ description: '通知标题' })
  title: string;

  @ApiProperty({ description: '通知内容' })
  content: string;

  @ApiProperty({
    description: '通知类型',
    enum: NotificationType,
    example: NotificationType.SYSTEM,
  })
  type: string;

  @ApiProperty({ description: '是否已读', type: Boolean })
  isRead: boolean;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiPropertyOptional({ description: '过期时间' })
  expireTime?: Date;

  @ApiPropertyOptional({ description: '相关链接' })
  link?: string;

  @ApiPropertyOptional({ description: '额外数据', type: Object })
  data?: any;

  // 从Notification实体映射到DTO的静态方法
  static fromNotification(notification: any): NotificationResponseDto {
    const dto = new NotificationResponseDto();

    // 安全获取ID，处理可能的不同格式
    if (notification) {
      dto.id =
        notification._id?.toString() || notification.id?.toString() || '';
      dto.title = notification.title || '';
      dto.content = notification.content || '';
      dto.type = notification.type || NotificationType.SYSTEM;
      dto.isRead = !!notification.isRead;
      dto.createTime = notification.createTime || new Date();
      dto.expireTime = notification.expireTime;
      dto.link = notification.link;
      dto.data = notification.data;
    }

    return dto;
  }
}

// 批量标记已读DTO
export class MarkReadDto {
  @ApiPropertyOptional({
    description: '要标记为已读的通知ID列表',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  ids?: string[];
}

// 通知设置更新DTO
export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: '项目邀请邮件通知', type: Boolean })
  @IsBoolean()
  @IsOptional()
  emailNotify?: boolean;

  @ApiPropertyOptional({ description: '代码评论通知', type: Boolean })
  @IsBoolean()
  @IsOptional()
  commentNotify?: boolean;

  @ApiPropertyOptional({ description: '系统更新通知', type: Boolean })
  @IsBoolean()
  @IsOptional()
  systemNotify?: boolean;

  @ApiPropertyOptional({ description: '协作更新通知', type: Boolean })
  @IsBoolean()
  @IsOptional()
  collaborationNotify?: boolean;

  @ApiPropertyOptional({ description: 'AI任务完成通知', type: Boolean })
  @IsBoolean()
  @IsOptional()
  aiNotify?: boolean;
}

// 通知查询参数DTO
export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({
    description: '通知类型',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({ description: '是否已读' })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

// 通知创建DTO
export class CreateNotificationDto {
  @ApiProperty({ description: '接收通知的用户ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '通知标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '通知内容' })
  @IsString()
  content: string;

  @ApiProperty({
    description: '通知类型',
    enum: NotificationType,
    example: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ description: '相关链接' })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({ description: '额外数据', type: Object })
  @IsOptional()
  data?: any;
}
