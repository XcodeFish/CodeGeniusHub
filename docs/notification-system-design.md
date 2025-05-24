# 消息通知系统设计方案

## 1. 总体设计

消息通知系统将支持以下功能：

- 站内实时通知
- 邮件通知（如有必要）
- 通知设置（用户可自定义通知偏好）
- 通知分类（系统通知、协作通知、项目通知等）
- 标记已读/未读
- 删除通知

## 2. 数据模型设计

### 通知模型 (Notification)

```typescript
interface Notification {
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

enum NotificationType {
  SYSTEM = 'system',           // 系统通知
  PROJECT_INVITE = 'project_invite', // 项目邀请
  COMMENT = 'comment',         // 评论通知
  COLLABORATION = 'collaboration', // 协作通知
  AI_TASK = 'ai_task',         // AI任务完成通知
}
```

### 通知设置模型 (NotificationSettings)

```typescript
interface NotificationSettings {
  userId: string;               // 用户ID
  emailNotify: boolean;         // 项目邀请邮件通知
  commentNotify: boolean;       // 代码评论通知
  systemNotify: boolean;        // 系统更新通知
  collaborationNotify: boolean; // 协作更新通知
  aiNotify: boolean;            // AI任务完成通知
}
```

## 3. API接口设计

### 1) 获取用户通知列表

```
GET /api/notifications
```

请求参数：

- `page`: 页码 (optional, default: 1)
- `pageSize`: 每页数量 (optional, default: 10)
- `type`: 通知类型 (optional)
- `isRead`: 是否已读 (optional)

响应示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 12,
    "list": [
      {
        "id": "1",
        "title": "项目邀请",
        "content": "用户 admin 邀请您加入项目 'AI助手开发'",
        "type": "project_invite",
        "isRead": false,
        "createTime": "2023-05-20T12:00:00Z",
        "link": "/project/123",
        "data": {
          "projectId": "123",
          "inviterId": "456"
        }
      },
      // ... 更多通知
    ]
  }
}
```

### 2) 标记通知为已读

```
PATCH /api/notifications/:id/read
```

响应示例：

```json
{
  "code": 0,
  "message": "success"
}
```

### 3) 批量标记通知为已读

```
PATCH /api/notifications/read-all
```

请求参数：

- `ids`: 通知ID数组 (optional, 如不提供则标记所有为已读)

响应示例：

```json
{
  "code": 0,
  "message": "success"
}
```

### 4) 删除通知

```
DELETE /api/notifications/:id
```

响应示例：

```json
{
  "code": 0,
  "message": "success"
}
```

### 5) 获取未读通知数量

```
GET /api/notifications/unread-count
```

响应示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "count": 5
  }
}
```

### 6) 更新通知设置

```
PUT /api/user/notification-settings
```

请求参数：

```json
{
  "emailNotify": true,
  "commentNotify": true,
  "systemNotify": false,
  "collaborationNotify": true,
  "aiNotify": true
}
```

响应示例：

```json
{
  "code": 0,
  "message": "success"
}
```

### 7) 获取通知设置

```
GET /api/user/notification-settings
```

响应示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "emailNotify": true,
    "commentNotify": true,
    "systemNotify": false,
    "collaborationNotify": true,
    "aiNotify": true
  }
}
```

## 4. WebSocket通知设计

为支持实时通知，设计WebSocket事件：

```
SUBSCRIBE: /user/{userId}/notifications
```

通知消息格式：

```json
{
  "type": "notification",
  "data": {
    "id": "1",
    "title": "项目邀请",
    "content": "用户 admin 邀请您加入项目 'AI助手开发'",
    "type": "project_invite",
    "createTime": "2023-05-20T12:00:00Z",
    "link": "/project/123",
    "data": {
      "projectId": "123",
      "inviterId": "456"
    }
  }
}
```

## 5. 前端实现设计

### 1) 通知组件 (NotificationDropdown)

创建通知下拉组件，在Header中使用，显示最近通知和未读数量。

### 2) 通知状态管理

创建通知Store用于管理通知状态：

```typescript
// stores/notificationStore.ts
import { create } from 'zustand';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setLoading: (loading) => set({ loading }),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),
  markAllAsRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0
  })),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.isRead ? 0 : 1)
  })),
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

### 3) 通知Hook (useNotification)

创建通知相关的业务逻辑Hook：

```typescript
// hooks/useNotification.ts
import { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSocketStore } from '@/stores/socketStore';
import { request } from '@/utils/request';

export function useNotification() {
  const {
    notifications,
    unreadCount,
    loading,
    setNotifications,
    setUnreadCount,
    setLoading,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification
  } = useNotificationStore();

  const { socket } = useSocketStore();

  // 获取通知列表
  const fetchNotifications = async (page = 1, pageSize = 10, type?: string, isRead?: boolean) => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (type) params.type = type;
      if (isRead !== undefined) params.isRead = isRead;

      const res = await request({
        url: '/api/notifications',
        method: 'GET',
        params
      });

      if (res.data.code === 0) {
        setNotifications(res.data.data.list);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取未读通知数量
  const fetchUnreadCount = async () => {
    try {
      const res = await request({
        url: '/api/notifications/unread-count',
        method: 'GET'
      });

      if (res.data.code === 0) {
        setUnreadCount(res.data.data.count);
      }
    } catch (error) {
      console.error('获取未读通知数量失败:', error);
    }
  };

  // 标记通知为已读
  const markNotificationAsRead = async (id: string) => {
    try {
      const res = await request({
        url: `/api/notifications/${id}/read`,
        method: 'PATCH'
      });

      if (res.data.code === 0) {
        markAsRead(id);
      }
    } catch (error) {
      console.error('标记通知已读失败:', error);
    }
  };

  // 标记所有通知为已读
  const markAllNotificationsAsRead = async () => {
    try {
      const res = await request({
        url: '/api/notifications/read-all',
        method: 'PATCH'
      });

      if (res.data.code === 0) {
        markAllAsRead();
      }
    } catch (error) {
      console.error('标记所有通知已读失败:', error);
    }
  };

  // 删除通知
  const deleteNotification = async (id: string) => {
    try {
      const res = await request({
        url: `/api/notifications/${id}`,
        method: 'DELETE'
      });

      if (res.data.code === 0) {
        removeNotification(id);
      }
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  // 设置通知WebSocket监听
  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification) => {
        addNotification(notification.data);
      });

      return () => {
        socket.off('notification');
      };
    }
  }, [socket]);

  // 初始加载获取未读数量
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
  };
}
```

### 4) 通知下拉菜单组件 (NotificationDropdown)

创建通知下拉菜单组件：

```tsx
// components/NotificationDropdown.tsx
import React, { useState, useEffect } from 'react';
import { Badge, Dropdown, List, Button, Space, Tag, Empty, Spin, Typography } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNotification } from '@/hooks/useNotification';
import styles from './NotificationDropdown.module.scss';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';

const { Text } = Typography;

const NotificationDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useNotification();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      fetchNotifications(1, 10);
    }
  }, [open]);

  const getTypeTag = (type: string) => {
    switch (type) {
      case 'system':
        return <Tag color="blue">系统</Tag>;
      case 'project_invite':
        return <Tag color="green">邀请</Tag>;
      case 'comment':
        return <Tag color="orange">评论</Tag>;
      case 'collaboration':
        return <Tag color="purple">协作</Tag>;
      case 'ai_task':
        return <Tag color="cyan">AI</Tag>;
      default:
        return <Tag>其他</Tag>;
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setOpen(false);
  };

  const notificationContent = (
    <div className={styles.dropdownContainer}>
      <div className={styles.header}>
        <Text strong>通知</Text>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              markAllNotificationsAsRead();
            }}
          >
            全部已读
          </Button>
        )}
      </div>
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={(notification: any) => (
              <List.Item
                className={`${styles.item} ${notification.isRead ? '' : styles.unread}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      {getTypeTag(notification.type)}
                      <span>{notification.title}</span>
                    </Space>
                  }
                  description={
                    <>
                      <div className={styles.content}>{notification.content}</div>
                      <div className={styles.time}>
                        {dayjs(notification.createTime).format('YYYY-MM-DD HH:mm')}
                      </div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
      <div className={styles.footer}>
        <Button type="link" onClick={() => router.push('/notifications')}>
          查看全部
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      overlay={notificationContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button type="text" icon={<BellOutlined />} className={styles.notificationButton} />
      </Badge>
    </Dropdown>
  );
};

export default NotificationDropdown;
```

## 6. 后端设计

### 1) 通知服务

```typescript
// notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Notification, NotificationType } from './schemas/notification.schema';
import { NotificationSettings } from './schemas/notification-settings.schema';
import { User } from '../user/schemas/user.schema';

@Injectable()
@WebSocketGateway()
export class NotificationService {
  @WebSocketServer() server: Server;

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(NotificationSettings.name) private notificationSettingsModel: Model<NotificationSettings>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  // 创建通知
  async createNotification(
    userId: string,
    title: string,
    content: string,
    type: NotificationType,
    link?: string,
    data?: any,
  ): Promise<Notification> {
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
  }

  // 获取用户通知
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

    const total = await this.notificationModel.countDocuments(query);
    const notifications = await this.notificationModel
      .find(query)
      .sort({ createTime: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    return {
      total,
      list: notifications,
    };
  }

  // 获取未读通知数量
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false });
  }

  // 标记通知为已读
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.notificationModel.updateOne(
      { _id: notificationId, userId },
      { isRead: true },
    );
    return result.modifiedCount > 0;
  }

  // 批量标记通知为已读
  async markAllAsRead(userId: string, ids?: string[]): Promise<number> {
    const query: any = { userId, isRead: false };

    if (ids && ids.length > 0) {
      query._id = { $in: ids };
    }

    const result = await this.notificationModel.updateMany(query, { isRead: true });
    return result.modifiedCount;
  }

  // 删除通知
  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({ _id: notificationId, userId });
    return result.deletedCount > 0;
  }

  // 获取用户通知设置
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    let settings = await this.notificationSettingsModel.findOne({ userId }).exec();

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
      await settings.save();
    }

    return settings;
  }

  // 更新用户通知设置
  async updateNotificationSettings(
    userId: string,
    settings: {
      emailNotify?: boolean;
      commentNotify?: boolean;
      systemNotify?: boolean;
      collaborationNotify?: boolean;
      aiNotify?: boolean;
    },
  ): Promise<NotificationSettings> {
    const existingSettings = await this.getNotificationSettings(userId);

    // 更新设置
    Object.assign(existingSettings, settings);
    return existingSettings.save();
  }

  // 通过WebSocket发送通知
  private sendNotificationToUser(userId: string, notification: Notification): void {
    this.server.to(`user:${userId}`).emit('notification', {
      type: 'notification',
      data: notification,
    });
  }
}
```

### 2) 通知控制器

```typescript
// notification/notification.controller.ts
import { Controller, Get, Post, Delete, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('通知')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '获取用户通知列表' })
  async getNotifications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('type') type?: string,
    @Query('isRead') isRead?: boolean,
  ) {
    const userId = req.user.id;
    const result = await this.notificationService.getUserNotifications(
      userId,
      page,
      pageSize,
      type,
      isRead,
    );

    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  async getUnreadCount(@Request() req) {
    const userId = req.user.id;
    const count = await this.notificationService.getUnreadCount(userId);

    return {
      code: 0,
      message: 'success',
      data: { count },
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    await this.notificationService.markAsRead(userId, id);

    return {
      code: 0,
      message: 'success',
    };
  }

  @Patch('read-all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  async markAllAsRead(@Request() req, @Body() body: { ids?: string[] }) {
    const userId = req.user.id;
    await this.notificationService.markAllAsRead(userId, body.ids);

    return {
      code: 0,
      message: 'success',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  async deleteNotification(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    await this.notificationService.deleteNotification(userId, id);

    return {
      code: 0,
      message: 'success',
    };
  }
}
```

### 3) 通知设置控制器

```typescript
// user/user.controller.ts (添加通知设置相关接口)
@ApiTags('用户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/user')
export class UserController {
  constructor(
    private userService: UserService,
    private notificationService: NotificationService,
  ) {}

  // ...其他接口...

  @Get('notification-settings')
  @ApiOperation({ summary: '获取通知设置' })
  async getNotificationSettings(@Request() req) {
    const userId = req.user.id;
    const settings = await this.notificationService.getNotificationSettings(userId);

    return {
      code: 0,
      message: 'success',
      data: settings,
    };
  }

  @Put('notification-settings')
  @ApiOperation({ summary: '更新通知设置' })
  async updateNotificationSettings(@Request() req, @Body() settings: any) {
    const userId = req.user.id;
    await this.notificationService.updateNotificationSettings(userId, settings);

    return {
      code: 0,
      message: 'success',
    };
  }
}
```

### 4) 消息通知模式 (Schema)

```typescript
// notification/schemas/notification.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum NotificationType {
  SYSTEM = 'system',
  PROJECT_INVITE = 'project_invite',
  COMMENT = 'comment',
  COLLABORATION = 'collaboration',
  AI_TASK = 'ai_task',
}

@Schema()
export class Notification extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({
    required: true,
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ required: true })
  createTime: Date;

  @Prop()
  expireTime?: Date;

  @Prop()
  link?: string;

  @Prop({ type: Object })
  data?: any;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
```

```typescript
// notification/schemas/notification-settings.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class NotificationSettings extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: true })
  emailNotify: boolean;

  @Prop({ default: true })
  commentNotify: boolean;

  @Prop({ default: true })
  systemNotify: boolean;

  @Prop({ default: true })
  collaborationNotify: boolean;

  @Prop({ default: true })
  aiNotify: boolean;
}

export const NotificationSettingsSchema = SchemaFactory.createForClass(NotificationSettings);
```

## 7. 通知调用场景示例

在各个业务模块中，可以引入NotificationService来发送通知。以下是几个示例：

### 1) 项目邀请通知

```typescript
// 项目服务中
async inviteUserToProject(projectId: string, email: string, permission: string, inviterId: string) {
  // ...处理邀请逻辑...

  // 找到被邀请用户
  const invitedUser = await this.userService.findByEmail(email);

  // 获取邀请人信息
  const inviter = await this.userService.findById(inviterId);

  // 获取项目信息
  const project = await this.projectModel.findById(projectId);

  // 发送通知
  if (invitedUser) {
    await this.notificationService.createNotification(
      invitedUser._id,
      '项目邀请',
      `用户 ${inviter.username} 邀请您加入项目 '${project.name}'`,
      NotificationType.PROJECT_INVITE,
      `/project/${projectId}`,
      { projectId, inviterId }
    );
  }

  // ...其他逻辑...
}

### 2) 代码评论通知

```typescript
// 评论服务中
async createComment(fileId: string, line: number, content: string, authorId: string) {
  // ...处理评论逻辑...

  // 获取文件信息
  const file = await this.fileModel.findById(fileId);

  // 获取项目信息
  const project = await this.projectModel.findById(file.projectId);

  // 获取文件协作者列表 (除了评论作者)
  const collaborators = await this.getFileCollaborators(fileId, authorId);

  // 获取作者信息
  const author = await this.userService.findById(authorId);

  // 向所有协作者发送通知
  for (const user of collaborators) {
    await this.notificationService.createNotification(
      user._id,
      '新评论',
      `用户 ${author.username} 在项目 '${project.name}' 的文件 '${file.filename}' 第 ${line} 行添加了评论`,
      NotificationType.COMMENT,
      `/project/${project._id}/editor?fileId=${fileId}&line=${line}`,
      { projectId: project._id, fileId, line }
    );
  }

  // ...其他逻辑...
}

### 3) AI任务完成通知

```typescript
// AI服务中
async generateCode(prompt: string, language: string, userId: string) {
  // ...处理AI代码生成逻辑...

  // 发送任务开始通知
  const taskId = generateUniqueId();
  await this.notificationService.createNotification(
    userId,
    'AI任务开始',
    `您的代码生成任务已开始，请稍候...`,
    NotificationType.AI_TASK,
    `/ai/tasks/${taskId}`,
    { taskId, status: 'pending' }
  );

  // 异步处理AI请求
  this.processAIRequest(prompt, language, userId, taskId).catch(console.error);

  // ...其他逻辑...
}

private async processAIRequest(prompt: string, language: string, userId: string, taskId: string) {
  try {
    // 调用AI API生成代码
    const result = await this.callAIApi(prompt, language);

    // 发送完成通知
    await this.notificationService.createNotification(
      userId,
      'AI代码生成完成',
      `您的代码生成任务已完成，点击查看结果`,
      NotificationType.AI_TASK,
      `/ai/tasks/${taskId}`,
      { taskId, status: 'completed' }
    );
  } catch (error) {
    // 发送失败通知
    await this.notificationService.createNotification(
      userId,
      'AI代码生成失败',
      `您的代码生成任务遇到问题: ${error.message}`,
      NotificationType.AI_TASK,
      `/ai/tasks/${taskId}`,
      { taskId, status: 'failed', error: error.message }
    );
  }
}
```

## 8. 消息通知样式设计

添加通知下拉菜单样式：

```scss
// components/NotificationDropdown.module.scss
.dropdownContainer {
  width: 350px;
  max-height: 500px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .header {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
    padding: 0;

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px 0;
    }

    .item {
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.3s;

      &:hover {
        background-color: #f5f5f5;
      }

      &.unread {
        background-color: #e6f7ff;

        &:hover {
          background-color: #cfe9ff;
        }
      }

      .content {
        margin: 4px 0;
        padding: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.5;
      }

      .time {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .footer {
    padding: 8px 16px;
    text-align: center;
    border-top: 1px solid #f0f0f0;
  }
}

.notificationButton {
  padding: 0 12px;
  color: rgba(0, 0, 0, 0.65);

  &:hover {
    color: #1890ff;
  }
}
```

## 9. 总结和建议

1. **性能考虑**：
   - 在通知数量增多时，应该考虑实现分页或虚拟滚动
   - 设置通知过期时间，定期清理过期通知
   - 可以考虑使用Redis缓存未读通知数量等频繁访问的数据

2. **扩展性**：
   - 设计支持扩展新的通知类型
   - 通知内容支持富文本和链接
   - 考虑添加通知优先级

3. **用户体验**：
   - 提供通知的声音提醒选项
   - 支持通知分组和过滤
   - 考虑添加桌面通知支持

4. **实现方式**：
   - 更新Header组件，将现有的通知图标替换为NotificationDropdown组件
   - 确保WebSocket正确连接和断线重连逻辑
   - 添加必要的错误处理和用户反馈

5. **测试建议**：
   - 单元测试覆盖通知服务的核心方法
   - 集成测试WebSocket实时通知功能
   - E2E测试通知流程的完整性

## 10. 集成步骤

1. 首先在后端创建通知相关模块，包括模型、服务和控制器
2. 在前端创建通知Store和Hook
3. 实现NotificationDropdown组件
4. 更新Header组件，集成NotificationDropdown
5. 在各业务模块中添加通知发送逻辑
6. 测试并优化通知体验
