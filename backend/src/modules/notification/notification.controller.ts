import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseBoolPipe,
  BadRequestException,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationType } from './schemas/notification.schema';
import {
  NotificationResponseDto,
  MarkReadDto,
  GetNotificationsQueryDto,
} from './dto/notification.dto';

@ApiTags('通知')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * 获取用户通知列表
   * @param req 请求对象
   * @param query 查询参数
   * @returns 通知列表和总数
   */
  @Get()
  @ApiOperation({ summary: '获取用户通知列表' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: Object,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  async getNotifications(
    @Request() req,
    @Query() query: GetNotificationsQueryDto,
  ) {
    const userId = req.user.userId;

    // 使用转换管道简化参数处理
    const page = +(query.page ?? 1);
    const pageSize = +(query.pageSize ?? 10);

    // 如果isRead是字符串，需要转换为布尔值
    let isRead: boolean | undefined = undefined;
    if (query.isRead !== undefined) {
      isRead = this.parseBooleanQuery(query.isRead);
    }

    const result = await this.notificationService.getUserNotifications(
      userId,
      page,
      pageSize,
      query.type,
      isRead,
    );

    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  /**
   * 获取未读通知数量
   * @param req 请求对象
   * @returns 未读通知数量
   */
  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      properties: {
        code: { type: 'number' },
        message: { type: 'string' },
        data: {
          properties: {
            count: { type: 'number' },
          },
        },
      },
    },
  })
  async getUnreadCount(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationService.getUnreadCount(userId);

    return {
      code: 0,
      message: 'success',
      data: { count },
    };
  }

  /**
   * 标记通知为已读
   * @param req 请求对象
   * @param id 通知ID
   * @returns 操作结果
   */
  @Patch(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  @ApiResponse({
    status: 200,
    description: '标记成功',
  })
  @ApiParam({ name: 'id', description: '通知ID' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    await this.notificationService.markAsRead(userId, id);

    return {
      code: 0,
      message: 'success',
    };
  }

  /**
   * 批量标记通知为已读
   * @param req 请求对象
   * @param body 请求体
   * @returns 操作结果
   */
  @Patch('read-all')
  @ApiOperation({ summary: '批量标记通知为已读' })
  @ApiResponse({
    status: 200,
    description: '标记成功',
  })
  @ApiBody({ type: MarkReadDto })
  async markAllAsRead(@Request() req, @Body() body: MarkReadDto) {
    const userId = req.user.userId;
    const markedCount = await this.notificationService.markAllAsRead(
      userId,
      body.ids,
    );
    await this.notificationService.markAllAsRead(userId, body.ids);

    return {
      code: 0,
      message: 'success',
      data: {
        markedCount,
        success: markedCount > 0,
      },
    };
  }

  /**
   * 删除通知
   * @param req 请求对象
   * @param id 通知ID
   * @returns 操作结果
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  @ApiParam({ name: 'id', description: '通知ID' })
  async deleteNotification(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    await this.notificationService.deleteNotification(userId, id);

    return {
      code: 0,
      message: 'success',
    };
  }

  // 辅助方法解析布尔值
  private parseBooleanQuery(value: any): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }
}
