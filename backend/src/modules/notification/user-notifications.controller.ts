import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UpdateNotificationSettingsDto } from './dto/notification.dto';

@ApiTags('用户通知设置')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/user/notification-settings')
export class UserNotificationsController {
  constructor(private notificationService: NotificationService) {}

  /**
   * 获取用户通知设置
   * @param req 请求对象
   * @returns 用户通知设置
   */
  @Get()
  @ApiOperation({ summary: '获取通知设置' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      properties: {
        code: { type: 'number' },
        message: { type: 'string' },
        data: {
          properties: {
            emailNotify: { type: 'boolean' },
            commentNotify: { type: 'boolean' },
            systemNotify: { type: 'boolean' },
            collaborationNotify: { type: 'boolean' },
            aiNotify: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getNotificationSettings(@Request() req) {
    const userId = req.user.userId;
    const settings =
      await this.notificationService.getNotificationSettings(userId);

    return {
      code: 0,
      message: 'success',
      data: {
        emailNotify: settings.emailNotify,
        commentNotify: settings.commentNotify,
        systemNotify: settings.systemNotify,
        collaborationNotify: settings.collaborationNotify,
        aiNotify: settings.aiNotify,
      },
    };
  }

  /**
   * 更新用户通知设置
   * @param req 请求对象
   * @param updateDto 要更新的设置
   * @returns 操作结果
   */
  @Put()
  @ApiOperation({ summary: '更新通知设置' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
  })
  async updateNotificationSettings(
    @Request() req,
    @Body() updateDto: UpdateNotificationSettingsDto,
  ) {
    const userId = req.user.userId;
    await this.notificationService.updateNotificationSettings(
      userId,
      updateDto,
    );

    return {
      code: 0,
      message: 'success',
    };
  }
}
