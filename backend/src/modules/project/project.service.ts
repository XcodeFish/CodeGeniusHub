import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddMemberDto,
  UpdateProjectMemberDto,
  BulkAddMembersDto,
  ProjectFilterDto,
} from './dto/project.dto';
import { Permission } from '../../modules/user/schemas/user.schema';
import { User } from '../../modules/user/schemas/user.schema';
import { PROJECT_ERROR } from './dto/project.dto';
import { PermissionService } from '../../common/services/permission.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/schemas/notification.schema';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly permissionService: PermissionService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 创建新项目
   * @param userId 创建者ID
   * @param createProjectDto 项目创建DTO
   * @returns 创建的项目
   */
  async createProject(userId: string, createProjectDto: CreateProjectDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(PROJECT_ERROR.USER_NOT_FOUND);
    }

    // 检查同一用户下项目名是否已存在
    const existingProject = await this.projectModel.findOne({
      name: createProjectDto.name,
      createdBy: userId,
    });
    if (existingProject) {
      throw new BadRequestException(PROJECT_ERROR.NAME_TAKEN);
    }

    // 创建项目
    const project = new this.projectModel({
      ...createProjectDto,
      createdBy: userId,
      // 添加创建者作为管理员成员
      members: [
        {
          userId: userId,
          permission: Permission.ADMIN,
          joinedAt: new Date(),
        },
      ],
      collaboratorsCount: 1, // 创建者算一个协作者
    });

    return project.save();
  }

  /**
   * 获取项目详情
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @returns 项目详情
   */
  async getProjectById(projectId: string, userId: string) {
    try {
      // 先检查当前用户是否是系统管理员
      const isSystemAdmin = await this.permissionService.isSystemAdmin(userId);

      // 如果是系统管理员，则不需要检查项目成员
      let projectQuery = {};
      if (isSystemAdmin) {
        projectQuery = { _id: projectId };
      } else {
        projectQuery = {
          _id: projectId,
          $or: [{ createdBy: userId }, { 'members.userId': userId }],
        };
      }

      // 检查项目是否存在并且用户是否有权限访问
      const project = await this.projectModel
        .findOne(projectQuery)
        .populate('createdBy', 'username email avatar')
        .populate('members.userId', 'username email avatar');

      if (!project) {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }

      return project;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * 获取用户的项目列表
   * @param userId 用户ID
   * @param filterDto 过滤条件
   * @returns 项目列表
   */
  async getUserProjects(
    userId: string,
    filterDto: ProjectFilterDto,
  ): Promise<ProjectDocument[]> {
    // 构建查询条件
    const query: any = {
      $or: [{ createdBy: userId }, { 'members.userId': userId }],
    };

    // 是否包含已归档项目
    if (!filterDto.includeArchived) {
      query.isArchived = { $ne: true };
    }

    // 名称搜索
    if (filterDto.search) {
      query.name = { $regex: filterDto.search, $options: 'i' };
    }

    // 标签过滤
    if (filterDto.tags && filterDto.tags.length > 0) {
      query.tags = { $in: filterDto.tags };
    }

    // 执行查询，按更新时间倒序排列
    return this.projectModel
      .find(query)
      .populate('createdBy', 'username email avatar')
      .sort({ updatedAt: -1 })
      .exec();
  }

  /**
   * 更新项目信息
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @param updateProjectDto 更新数据
   * @returns 更新后的项目
   */

  async updateProject(
    projectId: string,
    userId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectDocument> {
    try {
      // 获取项目并检查权限
      const project = await this.getProjectById(projectId, userId);

      // 检查用户是否为管理员
      if (!this.isProjectAdmin(project, userId)) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 如果要更改名称，检查是否冲突
      if (updateProjectDto.name && updateProjectDto.name !== project.name) {
        const existingProject = await this.projectModel.findOne({
          createdBy: project.createdBy,
          name: updateProjectDto.name,
          _id: { $ne: projectId }, // 排除当前项目
        });

        if (existingProject) {
          throw new BadRequestException(PROJECT_ERROR.NAME_TAKEN);
        }
      }

      // 更新项目信息
      Object.assign(project, updateProjectDto);
      return project.save();
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * 删除项目
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @returns 删除结果
   */
  async deleteProject(
    projectId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    try {
      // 获取项目并检查是否存在
      const project = await this.projectModel.findById(projectId);

      if (!project) {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }

      // 检查用户是否为项目创建者 (只有创建者才能删除项目)
      if (project.createdBy.toString() !== userId) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 删除项目
      await this.projectModel.deleteOne({ _id: projectId });
      return { success: true };
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * 归档/取消归档项目
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @param isArchived 是否归档
   * @returns 更新后的项目
   */
  async archiveProject(
    projectId: string,
    userId: string,
    isArchived: boolean,
  ): Promise<ProjectDocument> {
    // 获取项目并检查权限
    const project = await this.getProjectById(projectId, userId);

    // 检查用户是否为管理员
    if (!this.isProjectAdmin(project, userId)) {
      throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
    }

    // 更新归档状态
    project.isArchived = isArchived;
    return project.save();
  }

  /**
   * 添加项目成员
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @param memberDto 新成员信息
   * @returns 更新后的项目
   */
  async addProjectMember(
    projectId: string,
    userId: string,
    memberDto: AddMemberDto,
  ): Promise<ProjectDocument> {
    return this.addProjectMembers(projectId, userId, {
      members: [memberDto],
    });
  }

  /**
   * 批量添加项目成员
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @param membersDto 成员列表
   * @returns 更新后的项目
   */
  async addProjectMembers(
    projectId: string,
    userId: string,
    membersDto: BulkAddMembersDto,
  ): Promise<ProjectDocument> {
    try {
      // 获取项目并检查权限
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }

      // 检查当前用户是否为管理员
      if (!this.isProjectAdmin(project, userId)) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 跟踪是否有变更
      let hasChanges = false;

      // 跟踪需要发送通知的新成员
      const newMembersForNotification: {
        userId: string;
        permission: string;
      }[] = [];

      // 批量添加成员
      for (const memberDto of membersDto.members) {
        // 检查要添加的用户是否存在
        const memberUser = await this.userModel.findById(memberDto.userId);
        if (!memberUser) {
          continue; // 跳过不存在的用户
        }

        // 检查用户是否已经是项目成员
        const existingMemberIndex = project.members.findIndex(
          (m) => m.userId.toString() === memberDto.userId,
        );

        if (existingMemberIndex !== -1) {
          // 只有当权限发生变化时才更新
          if (
            project.members[existingMemberIndex].permission !==
            memberDto.permission
          ) {
            project.members[existingMemberIndex].permission =
              memberDto.permission;
            hasChanges = true;
          }
        } else {
          // 添加新成员
          project.members.push({
            userId: memberDto.userId,
            permission: memberDto.permission,
            joinedAt: new Date(),
          });
          hasChanges = true;

          // 添加到通知队列而不是立即发送
          newMembersForNotification.push({
            userId: memberDto.userId,
            permission: memberDto.permission,
          });
        }

        // 更新用户的项目权限列表
        await this.updateUserProjectPermissions(
          memberDto.userId,
          projectId,
          project.name,
          memberDto.permission,
        );
      }

      // 只有在有变更时才更新项目
      if (hasChanges) {
        // 更新项目协作者数量
        project.collaboratorsCount = project.members.length;

        // 保存项目更新
        await project.save();
      }

      // 项目更新保存成功后，异步发送通知
      if (newMembersForNotification.length > 0) {
        this.sendProjectInviteNotifications(
          projectId,
          userId,
          project.name,
          newMembersForNotification,
        ).catch((err) => console.error('发送项目邀请通知失败:', err));
      }

      // 返回更新后的项目
      return this.projectModel
        .findById(projectId)
        .populate('createdBy', 'username email avatar')
        .populate('members.userId', 'username email avatar')
        .exec() as Promise<ProjectDocument>;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * 发送项目邀请通知
   * @param projectId 项目ID
   * @param inviterId 邀请人ID
   * @param projectName 项目名称
   * @param newMembers 新成员列表
   */
  private async sendProjectInviteNotifications(
    projectId: string,
    inviterId: string,
    projectName: string,
    newMembers: Array<{ userId: string; permission: string }>,
  ) {
    try {
      // 获取邀请人信息
      const inviter = await this.userModel.findById(inviterId);
      if (!inviter) {
        console.warn(`邀请人 ${inviterId} 不存在，无法发送通知`);
        return;
      }

      // 批量发送通知
      const notificationPromises = newMembers.map((member) =>
        this.notificationService.createNotification(
          member.userId,
          '项目邀请',
          `用户 ${inviter.username} 邀请您加入项目 '${projectName}'`,
          NotificationType.PROJECT_INVITE,
          `/project/${projectId}`,
          { projectId, inviterId, permission: member.permission },
        ),
      );

      await Promise.all(notificationPromises);
      console.log(`成功发送 ${notificationPromises.length} 条项目邀请通知`);
    } catch (error) {
      console.error('批量发送项目邀请通知失败:', error);
      // 通知失败不影响主流程
    }
  }

  /**
   * 更新项目成员权限
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @param memberId 要更新的成员ID
   * @param updateDto 更新的权限信息
   * @returns 更新后的项目
   */
  async updateProjectMember(
    projectId: string,
    userId: string,
    memberId: string,
    updateDto: UpdateProjectMemberDto,
  ): Promise<ProjectDocument> {
    try {
      // 获取项目并检查权限
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }

      // 使用权限服务检查当前用户是否可以管理项目
      if (!(await this.permissionService.canManageProject(userId, projectId))) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 检查要更新的成员是否存在
      const memberIndex = project.members.findIndex(
        (m) => m.userId.toString() === memberId,
      );
      if (memberIndex === -1) {
        throw new NotFoundException(PROJECT_ERROR.MEMBER_NOT_FOUND);
      }

      // 检查是否试图修改创建者的权限
      if (project.createdBy.toString() === memberId) {
        throw new BadRequestException(PROJECT_ERROR.OWNER_ROLE_CANNOT_CHANGE);
      }

      // 获取旧权限用于记录变更
      const oldPermission = project.members[memberIndex].permission;

      // 更新成员权限
      project.members[memberIndex].permission = updateDto.permission;

      // 保存项目更新
      await project.save();

      // 使用权限服务更新用户的项目权限并记录变更
      await this.permissionService.updateProjectPermission(
        memberId,
        projectId,
        updateDto.permission,
        userId,
      );

      // 返回更新后的项目
      return this.projectModel
        .findById(projectId)
        .populate('createdBy', 'username email avatar')
        .populate('members.userId', 'username email avatar')
        .exec() as Promise<ProjectDocument>;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * 移除项目成员
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @param memberId 要移除的成员ID
   * @returns 更新后的项目
   */
  async removeProjectMember(
    projectId: string,
    userId: string,
    memberId: string,
  ): Promise<ProjectDocument> {
    try {
      // 获取项目并检查权限
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }

      // 检查当前用户是否为管理员
      if (!this.isProjectAdmin(project, userId)) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 检查要移除的成员是否存在
      const memberIndex = project.members.findIndex(
        (m) => m.userId.toString() === memberId,
      );
      if (memberIndex === -1) {
        throw new NotFoundException(PROJECT_ERROR.MEMBER_NOT_FOUND);
      }

      // 检查是否试图移除创建者
      if (project.createdBy.toString() === memberId) {
        throw new BadRequestException(PROJECT_ERROR.OWNER_CANNOT_LEAVE);
      }

      // 移除成员
      project.members.splice(memberIndex, 1);

      // 更新项目协作者数量
      project.collaboratorsCount = project.members.length;

      // 保存项目更新
      await project.save();

      // 从用户的项目权限列表中移除此项目
      await this.removeUserProjectPermission(memberId, projectId);

      // 返回更新后的项目
      return this.projectModel
        .findById(projectId)
        .populate('createdBy', 'username email avatar')
        .populate('members.userId', 'username email avatar')
        .exec() as Promise<ProjectDocument>;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * 检查用户是否为项目管理员
   * @param project 项目对象
   * @param userId 用户ID
   * @returns 是否为管理员
   */
  private isProjectAdmin(project: ProjectDocument, userId: string): boolean {
    // 委托给权限服务
    return this.getUserRoleInProject(project, userId) === Permission.ADMIN;
  }

  /**
   * 获取用户在项目中的角色
   * @param project 项目对象
   * @param userId 用户ID
   * @returns 用户角色
   */
  getUserRoleInProject(
    project: ProjectDocument,
    userId: string,
  ): Permission | null {
    // 如果是创建者，则一定是管理员
    if (project.createdBy.toString() === userId) {
      return Permission.ADMIN;
    }

    // 查找成员并返回角色
    const member = project.members.find((m) => m.userId.toString() === userId);
    return member ? member.permission : null;
  }

  /**
   * 更新项目最后活动时间
   * @param projectId 项目ID
   * @returns 更新结果
   */
  async updateProjectActivity(projectId: string): Promise<boolean> {
    try {
      await this.projectModel.updateOne(
        { _id: projectId },
        { lastActivityAt: new Date() },
      );
      return true;
    } catch (error) {
      console.error('更新项目活动时间失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否有项目访问权限
   * @param projectId 项目ID
   * @param userId 用户ID
   * @returns 是否有权限访问
   */
  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    // 委托给权限服务处理
    return this.permissionService.canAccessProject(userId, projectId);
  }

  /**
   * 更新项目文件计数
   * @param projectId 项目ID
   * @param count 增加的文件数量
   * @returns 更新结果
   */
  async updateFilesCount(projectId: string, count: number): Promise<boolean> {
    try {
      await this.projectModel.updateOne(
        { _id: projectId },
        { $inc: { filesCount: count } },
      );
      return true;
    } catch (error) {
      console.error('更新项目文件计数失败:', error);
      return false;
    }
  }

  /**
   * 更新用户的项目权限列表
   * @param userId 用户ID
   * @param projectId 项目ID
   * @param projectName 项目名称
   * @param permission 权限
   * @returns 是否成功
   */
  private async updateUserProjectPermissions(
    userId: string,
    projectId: string,
    projectName: string,
    permission: Permission,
  ): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) return false;

      // 查找用户的项目权限列表中是否已存在该项目
      const existingPermissionIndex = user.projectPermissions?.findIndex(
        (p) => p.projectId === projectId,
      );

      if (existingPermissionIndex !== -1 && user.projectPermissions) {
        // 更新现有权限
        user.projectPermissions[existingPermissionIndex].permission =
          permission;
      } else {
        // 添加新权限
        if (!user.projectPermissions) {
          user.projectPermissions = [];
        }
        user.projectPermissions.push({
          projectId,
          projectName,
          permission,
        });
      }

      await user.save();

      // 清除该用户的项目权限缓存
      await this.permissionService.clearUserPermissionCache(userId, projectId);

      return true;
    } catch (error) {
      console.error('更新用户项目权限失败:', error);
      return false;
    }
  }

  /**
   * 从用户的项目权限列表中移除指定项目
   * @param userId 用户ID
   * @param projectId 项目ID
   * @returns 是否成功
   */
  private async removeUserProjectPermission(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user || !user.projectPermissions) return false;

      // 过滤掉要移除的项目权限
      user.projectPermissions = user.projectPermissions.filter(
        (p) => p.projectId !== projectId,
      );

      await user.save();

      // 清除该用户的项目权限缓存
      await this.permissionService.clearUserPermissionCache(userId, projectId);

      return true;
    } catch (error) {
      console.error('移除用户项目权限失败:', error);
      return false;
    }
  }

  /**
   * 获取项目成员列表
   * @param projectId 项目ID
   * @returns 成员列表
   */
  async getProjectMembers(projectId: string): Promise<any[]> {
    // 获取项目信息，包括成员
    const project = await this.projectModel
      .findById(projectId)
      .populate('members.userId', 'username email avatar')
      .lean();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 获取项目创建者ID
    const creatorId = String(project.createdBy);

    // 简单粗暴，直接强制转换每个成员，跳过TypeScript检查
    return (project.members as any[]).map((member) => {
      // 从填充的userId中提取数据
      const userData = member.userId as any;
      const id =
        userData && userData._id ? String(userData._id) : String(userData);

      // 判断是否为项目创建者
      const isCreator = id === creatorId;

      // 返回前端所需的格式
      return {
        user: {
          id,
          username: userData && userData.username ? userData.username : '',
          email: userData && userData.email ? userData.email : '',
          avatar: userData && userData.avatar ? userData.avatar : undefined,
        },
        permission: isCreator ? Permission.ADMIN : member.permission,
        joinedAt: member.joinedAt,
      };
    });
  }

  /**
   * 添加成员到项目
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param permission 权限级别
   * @returns 更新后的项目
   */
  async addMemberToProject(
    projectId: string,
    userId: string,
    permission: Permission,
  ): Promise<Project> {
    // 验证项目存在
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 验证用户存在
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查用户是否已经是项目成员
    const isMember = project.members.some(
      (member) => member.userId.toString() === userId,
    );

    if (isMember) {
      throw new BadRequestException('用户已经是项目成员');
    }

    // 添加成员
    project.members.push({
      userId,
      permission,
      joinedAt: new Date(),
    });

    // 更新项目协作者数量
    project.collaboratorsCount = project.members.length;

    // 保存更新
    await project.save();

    return project;
  }

  /**
   * 更新项目成员权限
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param permission 权限级别
   * @returns 更新后的项目
   */
  async updateMemberPermission(
    projectId: string,
    userId: string,
    permission: Permission,
  ): Promise<Project> {
    // 验证项目存在
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 验证用户是项目成员
    const memberIndex = project.members.findIndex(
      (member) => member.userId.toString() === userId,
    );

    if (memberIndex === -1) {
      throw new NotFoundException('用户不是项目成员');
    }

    // 不能修改项目创建者的权限
    if (project.createdBy.toString() === userId) {
      throw new BadRequestException('不能修改项目创建者的权限');
    }

    // 更新权限
    project.members[memberIndex].permission = permission;

    // 保存更新
    await project.save();

    return project;
  }

  /**
   * 从项目中移除成员
   * @param projectId 项目ID
   * @param userId 用户ID
   * @returns 更新后的项目
   */
  async removeMemberFromProject(
    projectId: string,
    userId: string,
  ): Promise<Project> {
    // 验证项目存在
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 不能移除项目创建者
    if (project.createdBy.toString() === userId) {
      throw new BadRequestException('不能移除项目创建者');
    }

    // 验证用户是项目成员
    const memberIndex = project.members.findIndex(
      (member) => member.userId.toString() === userId,
    );

    if (memberIndex === -1) {
      throw new NotFoundException('用户不是项目成员');
    }

    // 移除成员
    project.members.splice(memberIndex, 1);

    // 更新项目协作者数量
    project.collaboratorsCount = project.members.length;

    // 保存更新
    await project.save();

    return project;
  }

  /**
   * 批量更新项目成员
   * @param projectId 项目ID
   * @param members 成员列表及权限
   * @returns 更新后的项目
   */
  async batchUpdateMembers(
    projectId: string,
    members: { userId: string; permission: Permission }[],
  ): Promise<Project> {
    // 验证项目存在
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 获取项目创建者ID
    const creatorId = project.createdBy.toString();

    for (const member of members) {
      // 跳过项目创建者的权限更新
      if (member.userId === creatorId) {
        continue;
      }

      const memberIndex = project.members.findIndex(
        (m) => m.userId.toString() === member.userId,
      );

      if (memberIndex === -1) {
        // 如果用户不在项目中，添加为新成员
        const user = await this.userModel.findById(member.userId);
        if (user) {
          project.members.push({
            userId: member.userId,
            permission: member.permission,
            joinedAt: new Date(),
          });
        }
      } else {
        // 更新现有成员权限
        project.members[memberIndex].permission = member.permission;
      }
    }

    // 更新项目协作者数量
    project.collaboratorsCount = project.members.length;

    // 保存更新
    await project.save();

    return project;
  }
}
