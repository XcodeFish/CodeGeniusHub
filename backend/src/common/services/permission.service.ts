import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ModuleRef } from '@nestjs/core';
import { Permission } from '../../modules/user/schemas/user.schema';
import { User, UserDocument } from '../../modules/user/schemas/user.schema';
import {
  PermissionLog,
  PermissionLogDocument,
} from '../../modules/user/schemas/permission-log.schema';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);
  private projectServiceCache: any = null;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PermissionLog.name)
    private permissionLogModel: Model<PermissionLogDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private moduleRef: ModuleRef, // 添加ModuleRef用于懒加载其他服务
  ) {}

  /**
   * 获取ProjectService的实例（懒加载）
   * 利用ModuleRef解决循环依赖问题
   * @private
   */
  private async getProjectService() {
    if (!this.projectServiceCache) {
      try {
        // 懒加载ProjectService，避免循环依赖
        this.projectServiceCache = this.moduleRef.get('ProjectService', {
          strict: false,
        });
      } catch (error) {
        this.logger.error(`Failed to get ProjectService: ${error.message}`);
        throw new Error('无法加载项目服务');
      }
    }
    return this.projectServiceCache;
  }

  // 检查用户是否是系统管理员
  async isSystemAdmin(userId: string): Promise<boolean> {
    const permission = await this.getUserSystemPermission(userId);
    return permission === Permission.ADMIN;
  }

  // 获取用户系统权限（带缓存）
  async getUserSystemPermission(userId: string): Promise<Permission> {
    const cacheKey = `user:${userId}:system-permission`;

    // 尝试从缓存获取
    let permission = await this.cacheManager.get<Permission>(cacheKey);
    if (permission) {
      return permission;
    }

    // 缓存未命中，从数据库获取
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    permission = (user as User).permission;

    // 写入缓存，有效期30分钟
    await this.cacheManager.set(cacheKey, permission, 1800);

    return permission || Permission.VIEWER; // 默认为Viewer权限
  }

  // 获取用户项目权限（带缓存）
  async getUserProjectPermission(
    userId: string,
    projectId: string,
  ): Promise<Permission> {
    const cacheKey = `user:${userId}:project:${projectId}:permission`;

    // 尝试从缓存获取
    let permission = await this.cacheManager.get<Permission>(cacheKey);
    if (permission) {
      return permission;
    }

    // 先检查系统权限，系统管理员拥有所有项目的管理员权限
    const systemPermission = await this.getUserSystemPermission(userId);
    if (systemPermission === Permission.ADMIN) {
      // 系统管理员默认拥有项目管理员权限
      await this.cacheManager.set(cacheKey, Permission.ADMIN, 1800);
      return Permission.ADMIN;
    }

    // 查询项目权限
    const user = await this.userModel
      .findOne(
        {
          _id: new Types.ObjectId(userId),
          'projectPermissions.projectId': projectId,
        },
        { 'projectPermissions.$': 1 },
      )
      .lean();

    permission =
      user && user.projectPermissions && user.projectPermissions.length > 0
        ? user.projectPermissions[0].permission
        : null;

    // 写入缓存，有效期30分钟
    if (permission) {
      await this.cacheManager.set(cacheKey, permission, 1800);
    }

    return permission || Permission.VIEWER; // 默认为Viewer权限
  }

  // 清除用户权限缓存
  async clearUserPermissionCache(
    userId: string,
    projectId?: string,
  ): Promise<void> {
    try {
      // 清除系统权限缓存
      await this.cacheManager.del(`user:${userId}:system-permission`);

      // 如果提供了项目ID，清除特定项目权限缓存
      if (projectId) {
        await this.cacheManager.del(
          `user:${userId}:project:${projectId}:permission`,
        );
      }

      this.logger.debug(`Cleared permission cache for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to clear permission cache: ${error.message}`);
    }
  }

  // 检查用户是否有项目访问权限（任何级别）
  async canAccessProject(userId: string, projectId: string): Promise<boolean> {
    // 系统管理员可以访问任何项目
    if (await this.isSystemAdmin(userId)) {
      return true;
    }

    const permission = await this.getUserProjectPermission(userId, projectId);
    return !!permission; // 只要有任何权限就可以访问
  }

  // 检查用户是否有项目编辑权限
  async canEditProject(userId: string, projectId: string): Promise<boolean> {
    // 系统管理员可以编辑任何项目
    if (await this.isSystemAdmin(userId)) {
      return true;
    }

    const permission = await this.getUserProjectPermission(userId, projectId);
    return permission === Permission.ADMIN || permission === Permission.EDITOR;
  }

  // 检查用户是否有项目管理权限
  async canManageProject(userId: string, projectId: string): Promise<boolean> {
    // 系统管理员可以管理任何项目
    if (await this.isSystemAdmin(userId)) {
      return true;
    }

    const permission = await this.getUserProjectPermission(userId, projectId);
    return permission === Permission.ADMIN;
  }

  // 验证项目访问权限（通用方法）
  async validateProjectAccess(
    userId: string,
    projectId: string,
  ): Promise<void> {
    if (!(await this.canAccessProject(userId, projectId))) {
      throw new ForbiddenException('无权访问该项目');
    }
  }

  // 验证项目编辑权限（通用方法）
  async validateProjectEditAccess(
    userId: string,
    projectId: string,
  ): Promise<void> {
    if (!(await this.canEditProject(userId, projectId))) {
      throw new ForbiddenException('无权编辑该项目');
    }
  }

  // 验证项目管理权限（通用方法）
  async validateProjectManageAccess(
    userId: string,
    projectId: string,
  ): Promise<void> {
    if (!(await this.canManageProject(userId, projectId))) {
      throw new ForbiddenException('无权管理该项目');
    }
  }

  // 记录权限变更日志
  async logPermissionChange(
    adminId: string,
    userId: string,
    oldPermission: Permission,
    newPermission: Permission,
    permissionType: 'system' | 'project',
    projectId?: string,
  ): Promise<void> {
    try {
      await this.permissionLogModel.create({
        adminId: new Types.ObjectId(adminId),
        userId: new Types.ObjectId(userId),
        oldPermission,
        newPermission,
        permissionType,
        projectId: projectId ? new Types.ObjectId(projectId) : undefined,
        timestamp: new Date(),
      });
      this.logger.log(
        `Permission change logged: ${permissionType} permission for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log permission change: ${error.message}`);
    }
  }

  // 更新用户系统权限
  async updateSystemPermission(
    userId: string,
    permission: Permission,
    currentUserId: string,
  ): Promise<User> {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const oldPermission = (user as User).permission;

    // 只有系统管理员可以更改用户系统权限
    if (!(await this.isSystemAdmin(currentUserId))) {
      throw new ForbiddenException('权限不足，无法修改系统权限');
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { permission: permission }, { new: true })
      .lean();

    // 记录权限变更
    await this.logPermissionChange(
      currentUserId,
      userId,
      oldPermission,
      permission,
      'system',
    );

    // 清除用户权限缓存
    await this.clearUserPermissionCache(userId);

    return updatedUser as User;
  }

  // 更新用户项目权限
  async updateProjectPermission(
    userId: string,
    projectId: string,
    permission: Permission,
    currentUserId: string,
  ): Promise<User> {
    // 验证当前用户权限
    if (
      !(await this.isSystemAdmin(currentUserId)) &&
      !(await this.canManageProject(currentUserId, projectId))
    ) {
      throw new ForbiddenException('权限不足，无法修改项目权限');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 查找现有项目权限
    const existingPermIndex = user.projectPermissions.findIndex(
      (p) => p.projectId.toString() === projectId,
    );

    const oldPermission =
      existingPermIndex >= 0
        ? user.projectPermissions[existingPermIndex].permission
        : null;

    // 获取项目名称 - 使用懒加载的ProjectService
    let projectName = `Project-${projectId}`;
    try {
      const projectService = await this.getProjectService();
      const project = await projectService.getProjectById(
        projectId,
        currentUserId,
      );
      if (project) {
        projectName = project.name;
      }
    } catch (error) {
      this.logger.warn(`获取项目名称失败: ${error.message}, 使用默认名称`);
    }

    // 更新或添加项目权限
    if (existingPermIndex >= 0) {
      user.projectPermissions[existingPermIndex].permission = permission;
      // 如果项目名称有变化，也更新项目名称
      if (projectName !== `Project-${projectId}`) {
        user.projectPermissions[existingPermIndex].projectName = projectName;
      }
    } else {
      // 添加新项目权限，使用获取的项目名称
      user.projectPermissions.push({
        projectId,
        projectName,
        permission,
      });
    }

    const updatedUser = await user.save();

    // 记录权限变更
    await this.logPermissionChange(
      currentUserId,
      userId,
      oldPermission || Permission.VIEWER,
      permission,
      'project',
      projectId,
    );

    // 清除用户权限缓存
    await this.clearUserPermissionCache(userId, projectId);

    return updatedUser;
  }

  // 批量更新项目权限
  async batchUpdateProjectPermissions(
    projectId: string,
    userPermissions: { userId: string; permission: Permission }[],
    currentUserId: string,
  ): Promise<{ userId: string; success: boolean; message: string }[]> {
    // 验证当前用户权限
    if (
      !(await this.isSystemAdmin(currentUserId)) &&
      !(await this.canManageProject(currentUserId, projectId))
    ) {
      throw new ForbiddenException('权限不足，无法修改项目权限');
    }

    const results: { userId: string; success: boolean; message: string }[] = [];

    for (const { userId, permission } of userPermissions) {
      try {
        await this.updateProjectPermission(
          userId,
          projectId,
          permission,
          currentUserId,
        );
        results.push({
          userId,
          success: true,
          message: '权限更新成功',
        });
      } catch (error) {
        results.push({
          userId,
          success: false,
          message: error.message || '权限更新失败',
        });
      }
    }

    return results;
  }
}
