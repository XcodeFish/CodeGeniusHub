import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  UseGuards,
  Logger,
  UnauthorizedException,
  Injectable,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ProjectService } from '../project/project.service';
import { FileService } from '../file/file.service';
import { PermissionService } from '../../common/services/permission.service';
import { Permission } from '@/modules/user/schemas/user.schema';
import { WsJwtGuard } from '../../common/ws-guards/ws-jwt-auth.guard';

// 编辑操作接口
interface EditOperation {
  userId: string;
  fileId: string;
  projectId: string;
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
  forceMoveMarkers?: boolean;
}

// 光标位置接口
interface CursorPosition {
  userId: string;
  fileId: string;
  projectId: string;
  position: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

// 评论消息接口
interface CommentMessage {
  userId: string;
  fileId: string;
  projectId: string;
  line: number;
  content: string;
}

// 用户状态接口
interface UserStatus {
  userId: string;
  projectId: string;
  fileId?: string;
  online: boolean;
  username?: string;
  avatar?: string;
}

interface OnlineUser {
  userId: string;
  username: string;
  avatar: string | null;
  online: boolean;
}

interface FileChangeNotification {
  fileId: string;
  projectId: string;
  userId: string;
  type: 'create' | 'update' | 'delete' | 'rename' | 'move';
  timestamp: Date;
  details: {
    filename?: string;
    oldFilename?: string;
    oldPath?: string;
    newPath?: string;
  };
}

interface FileLock {
  fileId: string;
  userId: string;
  username: string;
  lockedAt: Date;
  expiresAt: Date;
}

@WebSocketGateway({
  namespace: 'collaboration',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
@Injectable()
export class CollaborationGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('CollaborationGateway');
  private readonly activeUsers = new Map<string, Socket>(); // userId -> socket
  private readonly userRooms = new Map<string, Set<string>>(); // userId -> Set<projectId>
  private readonly projectUsers = new Map<string, Set<string>>(); // projectId -> Set<userId>
  private readonly fileUsers = new Map<string, Set<string>>(); // fileId -> Set<userId>
  private readonly fileLocks = new Map<string, FileLock>();
  private fileLockCleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly projectService: ProjectService,
    private readonly fileService: FileService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * 模块初始化，设置定期任务
   */
  onModuleInit() {
    // 定期清理过期的文件锁
    this.fileLockCleanupInterval = setInterval(() => {
      const now = new Date();
      const expiredLocks: { fileId: string; lock: FileLock }[] = [];

      // 收集过期的锁
      for (const [fileId, lock] of this.fileLocks.entries()) {
        if (lock.expiresAt < now) {
          expiredLocks.push({ fileId, lock });
        }
      }

      // 删除过期的锁并通知
      for (const { fileId, lock } of expiredLocks) {
        this.fileLocks.delete(fileId);
        this.logger.log(`自动释放过期文件锁: ${fileId}, 用户: ${lock.userId}`);

        // 通知项目成员文件已解锁
        this.server.to(`file:${fileId}`).emit('fileLockChanged', {
          fileId,
          locked: false,
          userId: null,
          username: null,
        });
      }
    }, 60000); // 每分钟检查一次
  }

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy() {
    if (this.fileLockCleanupInterval) {
      clearInterval(this.fileLockCleanupInterval);
    }
  }

  /**
   * 客户端连接处理
   * @param client 客户端socket
   */
  async handleConnection(client: Socket) {
    try {
      // 验证客户端身份
      const userId = client.data.user.sub;

      // 记录连接
      this.activeUsers.set(userId, client);
      this.logger.log(`Client connected: ${userId}`);

      // 初始化用户房间集合
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set<string>());
      }
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * 客户端断开连接处理
   * @param client 客户端socket
   */
  handleDisconnect(client: Socket) {
    try {
      // 获取用户信息
      const userId = client.data.user?.sub;
      if (!userId) return;

      // 从所有项目和文件中移除用户
      const rooms = this.userRooms.get(userId) || new Set<string>();
      for (const projectId of rooms) {
        this.leaveProject(client, { projectId, userId });
      }

      // 移除连接记录
      this.activeUsers.delete(userId);
      this.userRooms.delete(userId);
      this.logger.log(`Client disconnected: ${userId}`);
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * 加入项目
   * @param client 客户端socket
   * @param data 项目信息
   */
  @SubscribeMessage('joinProject')
  async joinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    try {
      const userId = client.data.user.sub;
      const { projectId } = data;

      // 验证项目访问权限
      const project = await this.projectService.getProjectById(
        projectId,
        userId,
      );
      if (!project) {
        throw new UnauthorizedException('无权访问该项目');
      }

      // 加入项目房间
      client.join(`project:${projectId}`);

      // 记录用户-项目关系
      const userProjects = this.userRooms.get(userId) || new Set<string>();
      userProjects.add(projectId);
      this.userRooms.set(userId, userProjects);

      // 记录项目-用户关系
      const projectMembers =
        this.projectUsers.get(projectId) || new Set<string>();
      projectMembers.add(userId);
      this.projectUsers.set(projectId, projectMembers);

      // 获取用户信息
      const user = await this.getUser(userId);

      // 广播用户状态
      this.server.to(`project:${projectId}`).emit('userStatus', {
        userId,
        projectId,
        online: true,
        username: user?.username,
        avatar: user?.avatar,
      } as UserStatus);

      // 发送当前在线用户列表
      const onlineUsers = await this.getProjectOnlineUsers(projectId);
      client.emit('onlineUsers', { projectId, users: onlineUsers });

      this.logger.log(`User ${userId} joined project ${projectId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Join project error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 离开项目
   * @param client 客户端socket
   * @param data 项目信息
   */
  @SubscribeMessage('leaveProject')
  leaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; userId: string },
  ) {
    try {
      const userId = data.userId || client.data.user?.sub;
      const { projectId } = data;
      if (!userId || !projectId) return { success: false };

      // 离开项目房间
      client.leave(`project:${projectId}`);

      // 处理用户在该项目中打开的所有文件
      const userProject = `${userId}:${projectId}`;
      this.fileUsers.forEach((users, fileId) => {
        if (users.has(userId)) {
          users.delete(userId);

          // 广播用户离开文件
          this.server.to(`file:${fileId}`).emit('userLeftFile', {
            userId,
            fileId,
            projectId,
          });

          if (users.size === 0) {
            this.fileUsers.delete(fileId);
          } else {
            this.fileUsers.set(fileId, users);
          }
        }
      });

      // 更新用户-项目关系
      const userProjects = this.userRooms.get(userId);
      if (userProjects) {
        userProjects.delete(projectId);
        if (userProjects.size === 0) {
          this.userRooms.delete(userId);
        } else {
          this.userRooms.set(userId, userProjects);
        }
      }

      // 更新项目-用户关系
      const projectMembers = this.projectUsers.get(projectId);
      if (projectMembers) {
        projectMembers.delete(userId);
        if (projectMembers.size === 0) {
          this.projectUsers.delete(projectId);
        } else {
          this.projectUsers.set(projectId, projectMembers);
        }
      }

      // 广播用户状态
      this.server.to(`project:${projectId}`).emit('userStatus', {
        userId,
        projectId,
        online: false,
      } as UserStatus);

      this.logger.log(`User ${userId} left project ${projectId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Leave project error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 打开文件
   * @param client 客户端socket
   * @param data 文件信息
   */
  @SubscribeMessage('openFile')
  async openFile(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; fileId: string },
  ) {
    try {
      const userId = client.data.user.sub;
      const { projectId, fileId } = data;

      // 验证文件访问权限
      const file = await this.fileService.getFileById(
        fileId,
        projectId,
        userId,
      );
      if (!file) {
        throw new UnauthorizedException('无权访问该文件');
      }

      // 加入文件房间
      client.join(`file:${fileId}`);

      // 记录文件-用户关系
      const fileViewers = this.fileUsers.get(fileId) || new Set<string>();
      fileViewers.add(userId);
      this.fileUsers.set(fileId, fileViewers);

      // 获取用户信息
      const user = await this.getUser(userId);

      // 广播用户状态
      this.server.to(`file:${fileId}`).emit('userOpenedFile', {
        userId,
        fileId,
        projectId,
        username: user?.username,
        avatar: user?.avatar,
      });

      // 发送当前在线用户列表
      const fileOnlineUsers = await this.getFileOnlineUsers(fileId);
      client.emit('fileOnlineUsers', { fileId, users: fileOnlineUsers });

      this.logger.log(`User ${userId} opened file ${fileId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Open file error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 关闭文件
   * @param client 客户端socket
   * @param data 文件信息
   */
  @SubscribeMessage('closeFile')
  closeFile(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; fileId: string },
  ) {
    try {
      const userId = client.data.user.sub;
      const { projectId, fileId } = data;

      // 离开文件房间
      client.leave(`file:${fileId}`);

      // 更新文件-用户关系
      const fileViewers = this.fileUsers.get(fileId);
      if (fileViewers) {
        fileViewers.delete(userId);
        if (fileViewers.size === 0) {
          this.fileUsers.delete(fileId);
        } else {
          this.fileUsers.set(fileId, fileViewers);
        }
      }

      // 广播用户状态
      this.server.to(`file:${fileId}`).emit('userClosedFile', {
        userId,
        fileId,
        projectId,
      });

      this.logger.log(`User ${userId} closed file ${fileId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Close file error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 文件编辑事件处理
   * @param client 客户端socket
   * @param data 编辑操作数据
   */
  @SubscribeMessage('edit')
  async edit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EditOperation,
  ) {
    try {
      const userId = client.data.user.sub;
      const { fileId, projectId, range, text } = data;

      // 验证操作权限
      await this.permissionService.validateProjectEditAccess(userId, projectId);

      // 检查文件锁
      const fileLock = this.fileLocks.get(fileId);
      if (fileLock && fileLock.userId !== userId) {
        throw new ForbiddenException(
          `文件已被用户 ${fileLock.username} 锁定，无法编辑`,
        );
      }

      // 广播编辑事件给其他用户
      client.to(`file:${fileId}`).emit('edit', {
        userId,
        fileId,
        projectId,
        range,
        text,
      });

      this.logger.log(`文件编辑: ${fileId} by ${userId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`编辑操作失败: ${error.message}`);

      // 向客户端发送错误信息
      client.emit('error', {
        message: '编辑操作失败',
        detail: error.message,
        code:
          error instanceof UnauthorizedException
            ? 403
            : error instanceof ForbiddenException
              ? 403
              : 500,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 光标移动
   * @param client 客户端socket
   * @param data 光标位置
   */
  @SubscribeMessage('cursor')
  cursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CursorPosition,
  ) {
    try {
      const userId = client.data.user.sub;
      const { fileId, position, selection } = data;

      // 广播光标位置
      client.to(`file:${fileId}`).emit('cursor', {
        ...data,
        userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Cursor error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 添加评论
   * @param client 客户端socket
   * @param data 评论消息
   */
  @SubscribeMessage('comment')
  async comment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CommentMessage,
  ) {
    try {
      const userId = client.data.user.sub;
      const { fileId, projectId, line, content } = data;

      // 验证访问权限
      await this.fileService.getFileById(fileId, projectId, userId);

      // 获取用户信息
      const user = await this.getUser(userId);

      // 广播评论
      this.server.to(`file:${fileId}`).emit('comment', {
        ...data,
        userId,
        username: user?.username,
        avatar: user?.avatar,
        timestamp: new Date(),
      });

      this.logger.log(`User ${userId} commented on file ${fileId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Comment error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取项目在线用户
   * @param projectId 项目ID
   * @returns 在线用户列表
   */
  private async getProjectOnlineUsers(
    projectId: string,
  ): Promise<OnlineUser[]> {
    try {
      const userIds = this.projectUsers.get(projectId) || new Set<string>();
      const userList: OnlineUser[] = [];

      for (const userId of userIds) {
        const user = await this.getUser(userId);
        if (user) {
          userList.push({
            userId,
            username: user.username,
            avatar: user.avatar,
            online: true,
          });
        }
      }

      return userList;
    } catch (error) {
      this.logger.error(`Get project online users error: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取文件在线用户
   * @param fileId 文件ID
   * @returns 在线用户列表
   */
  private async getFileOnlineUsers(fileId: string): Promise<OnlineUser[]> {
    try {
      const userIds = this.fileUsers.get(fileId) || new Set<string>();
      const userList: OnlineUser[] = [];

      for (const userId of userIds) {
        const user = await this.getUser(userId);
        if (user) {
          userList.push({
            userId,
            username: user.username,
            avatar: user.avatar,
            online: true,
          });
        }
      }

      return userList;
    } catch (error) {
      this.logger.error(`Get file online users error: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取用户信息
   * @param userId 用户ID
   * @returns 用户信息
   */
  private async getUser(userId: string): Promise<any> {
    try {
      // 这里应该调用用户服务获取用户信息
      // 为简化实现，返回模拟数据
      return {
        userId,
        username: `User-${userId.substring(0, 6)}`,
        avatar: null,
      };
    } catch (error) {
      this.logger.error(`Get user error: ${error.message}`);
      return null;
    }
  }

  /**
   * 发送文件变更通知
   * @param notification 变更通知
   */
  private async sendFileChangeNotification(
    notification: FileChangeNotification,
  ) {
    try {
      // 获取项目中的所有在线用户
      const projectUsers =
        this.projectUsers.get(notification.projectId) || new Set<string>();

      // 广播通知给项目中的所有用户
      this.server.to(`project:${notification.projectId}`).emit('fileChange', {
        ...notification,
        timestamp: new Date(),
      });

      this.logger.log(
        `File change notification sent: ${notification.type} for file ${notification.fileId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send file change notification: ${error.message}`,
      );
    }
  }

  /**
   * 处理文件变更
   * @param client 客户端socket
   * @param data 变更数据
   */
  @SubscribeMessage('fileChange')
  async handleFileChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: FileChangeNotification,
  ) {
    try {
      const userId = client.data.user.sub;
      const { fileId, projectId, type, details } = data;

      // 验证用户权限
      const project = await this.projectService.getProjectById(
        projectId,
        userId,
      );
      const userRole = this.projectService.getUserRoleInProject(
        project,
        userId,
      );

      if (userRole === Permission.VIEWER) {
        throw new UnauthorizedException('无权限执行此操作');
      }

      // 发送变更通知
      await this.sendFileChangeNotification({
        fileId,
        projectId,
        userId,
        type,
        timestamp: new Date(),
        details,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`File change error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 锁定文件
   * @param client 客户端socket
   * @param data 锁定数据
   */
  @SubscribeMessage('lockFile')
  async lockFile(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fileId: string; projectId: string },
  ) {
    try {
      const userId = client.data.user.sub;
      const { fileId, projectId } = data;

      // 验证用户权限
      if (!(await this.permissionService.canEditProject(userId, projectId))) {
        throw new UnauthorizedException('无权限锁定文件');
      }

      // 检查文件是否已被锁定
      const existingLock = this.fileLocks.get(fileId);
      if (existingLock && existingLock.userId !== userId) {
        throw new BadRequestException('文件已被其他用户锁定');
      }

      // 创建新的锁定
      const lock: FileLock = {
        fileId,
        userId,
        username: client.data.user.username,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟过期
      };

      this.fileLocks.set(fileId, lock);

      // 广播锁定状态
      this.server.to(`file:${fileId}`).emit('fileLocked', lock);

      return { success: true, lock };
    } catch (error) {
      this.logger.error(`Lock file error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 解锁文件
   * @param client 客户端socket
   * @param data 解锁数据
   */
  @SubscribeMessage('unlockFile')
  async unlockFile(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fileId: string; projectId: string },
  ) {
    try {
      const userId = client.data.user.sub;
      const { fileId, projectId } = data;

      // 验证用户权限
      if (!(await this.permissionService.canEditProject(userId, projectId))) {
        throw new UnauthorizedException('无权限解锁文件');
      }

      // 检查文件是否被当前用户锁定
      const lock = this.fileLocks.get(fileId);
      if (!lock || lock.userId !== userId) {
        throw new BadRequestException('文件未被当前用户锁定');
      }

      // 移除锁定
      this.fileLocks.delete(fileId);

      // 广播解锁状态
      this.server.to(`file:${fileId}`).emit('fileUnlocked', { fileId, userId });

      return { success: true };
    } catch (error) {
      this.logger.error(`Unlock file error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取文件锁定状态
   * @param fileId 文件ID
   * @returns 锁定状态
   */
  @SubscribeMessage('getFileLock')
  async getFileLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fileId: string },
  ) {
    try {
      const { fileId } = data;
      const lock = this.fileLocks.get(fileId);

      // 检查锁定是否过期
      if (lock && lock.expiresAt < new Date()) {
        this.fileLocks.delete(fileId);
        return { success: true, lock: null };
      }

      return { success: true, lock };
    } catch (error) {
      this.logger.error(`Get file lock error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
