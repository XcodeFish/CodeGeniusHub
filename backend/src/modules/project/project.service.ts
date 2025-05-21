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
import { Permission } from '@/modules/user/schemas/user.schema';
import { User, UserDocument } from '@/modules/user/schemas/user.schema';
import { PROJECT_ERROR } from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
          role: Permission.ADMIN,
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
      // 检查项目是否存在并且用户是否有权限访问
      const project = await this.projectModel
        .findById({
          _id: projectId,
          $or: [{ createdBy: userId }, { 'members.userId': userId }],
        })
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
   * @param memberDto 成员信息
   * @returns 更新后的项目
   */

  async addProjectMember(
    projectId: string,
    userId: string,
    memberDto: AddMemberDto,
  ): Promise<ProjectDocument> {
    try {
      // 获取项目并检查权限
      const project = await this.getProjectById(projectId, userId);

      // 检查用户是否为管理员
      if (!this.isProjectAdmin(project, userId)) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 验证要添加的用户是否存在
      const memberExists = await this.userModel.exists({
        _id: memberDto.userId,
      });
      if (!memberExists) {
        throw new NotFoundException(PROJECT_ERROR.USER_NOT_FOUND);
      }

      // 检查用户是否已经是成员
      const existingMember = project.members.find(
        (member) => member.userId.toString() === memberDto.userId,
      );

      if (existingMember) {
        throw new BadRequestException(PROJECT_ERROR.MEMBER_ALREADY_EXISTS);
      }

      // 添加成员
      project.members.push({
        userId: memberDto.userId,
        permission: memberDto.permission,
        joinedAt: new Date(),
      });

      // 更新协作者计数
      project.collaboratorsCount = project.members.length;

      return project.save();
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }
      throw error;
    }
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
      const project = await this.getProjectById(projectId, userId);

      // 检查用户是否为管理员
      if (!this.isProjectAdmin(project, userId)) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 验证所有用户是否存在
      const userIds = membersDto.members.map((m) => m.userId);
      const existingUsers = await this.userModel.find(
        { _id: { $in: userIds } },
        '_id',
      );

      if (existingUsers.length !== userIds.length) {
        throw new BadRequestException(PROJECT_ERROR.USER_NOT_FOUND);
      }

      // 过滤掉已存在的成员
      const existingMemberIds = project.members.map((m) => m.userId.toString());
      const newMembers = membersDto.members.filter(
        (m) => !existingMemberIds.includes(m.userId),
      );
      // 添加新成员
      for (const member of newMembers) {
        project.members.push({
          userId: member.userId,
          permission: member.permission,
          joinedAt: new Date(),
        });
      }

      // 更新协作者计数
      project.collaboratorsCount = project.members.length;

      return project.save();
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException(PROJECT_ERROR.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * 更新项目成员角色
   * @param projectId 项目ID
   * @param userId 当前用户ID
   * @param memberId 成员ID
   * @param updateDto 角色更新信息
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
      const project = await this.getProjectById(projectId, userId);

      // 检查用户是否为管理员
      if (!this.isProjectAdmin(project, userId)) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 检查是否为项目创建者 (创建者角色不能被修改)
      if (project.createdBy.toString() === memberId) {
        throw new BadRequestException(PROJECT_ERROR.OWNER_ROLE_CANNOT_CHANGE);
      }

      // 查找并更新成员
      const memberIndex = project.members.findIndex(
        (member) => member.userId.toString() === memberId,
      );

      if (memberIndex === -1) {
        throw new NotFoundException(PROJECT_ERROR.MEMBER_NOT_FOUND);
      }

      // 更新角色
      project.members[memberIndex].permission = updateDto.permission;
      return project.save();
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
      const project = await this.getProjectById(projectId, userId);

      // 检查是否为项目创建者 (创建者不能被移除)
      if (project.createdBy.toString() === memberId) {
        throw new BadRequestException(PROJECT_ERROR.OWNER_CANNOT_LEAVE);
      }

      // 如果是自己离开项目，或者是管理员移除成员，则允许操作
      if (userId !== memberId && !this.isProjectAdmin(project, userId)) {
        throw new ForbiddenException(PROJECT_ERROR.NO_PERMISSION);
      }

      // 查找成员
      const memberIndex = project.members.findIndex(
        (member) => member.userId.toString() === memberId,
      );

      if (memberIndex === -1) {
        throw new NotFoundException(PROJECT_ERROR.MEMBER_NOT_FOUND);
      }

      // 移除成员
      project.members.splice(memberIndex, 1);

      // 更新协作者计数
      project.collaboratorsCount = project.members.length;

      return project.save();
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
    // 如果是创建者，则一定是管理员
    if (project.createdBy.toString() === userId) {
      return true;
    }

    // 查找成员并检查角色
    const member = project.members.find((m) => m.userId.toString() === userId);
    return member?.permission === Permission.ADMIN;
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
    try {
      const count = await this.projectModel.countDocuments({
        _id: projectId,
        $or: [{ createdBy: userId }, { 'members.userId': userId }],
      });
      return count > 0;
    } catch (error) {
      return false;
    }
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
}
