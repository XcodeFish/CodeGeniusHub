// src/modules/project/project.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddMemberDto,
  UpdateProjectMemberDto,
  BulkAddMembersDto,
  ProjectFilterDto,
  ProjectResponseDto,
  ProjectDetailResponseDto,
  PROJECT_ERROR,
} from './dto/project.dto';
import { Permission } from '@/modules/user/schemas/user.schema';

@Controller('projects')
@ApiTags('项目管理')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * 创建新项目
   * @param req 请求对象
   * @param createProjectDto 项目创建DTO
   * @returns 创建的项目
   */
  @Post()
  @ApiOperation({ summary: '创建新项目' })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '项目创建成功',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数校验失败或项目名称已存在',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '用户不存在' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  @HttpCode(HttpStatus.CREATED)
  async createProject(
    @Request() req,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.createProject(
        userId,
        createProjectDto,
      );

      return this.transformProjectResponse(project);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('创建项目失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 获取当前用户的所有项目
   * @param req 请求对象
   * @param filterDto 过滤条件
   * @returns 项目列表
   */
  @Get()
  @ApiOperation({ summary: '获取当前用户的项目列表' })
  @ApiQuery({ name: 'search', required: false, description: '项目名称搜索' })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    description: '是否包含已归档项目',
    type: Boolean,
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: '标签过滤',
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: [ProjectResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async getUserProjects(
    @Request() req,
    @Query() filterDto: ProjectFilterDto,
  ): Promise<ProjectResponseDto[]> {
    try {
      const userId = req.user.userId;
      const projects = await this.projectService.getUserProjects(
        userId,
        filterDto,
      );

      // 转换项目列表，并添加当前用户在每个项目中的角色
      return projects.map((project) => {
        const response = this.transformProjectResponse(project);
        response.permission =
          this.projectService.getUserRoleInProject(project, userId) ||
          Permission.VIEWER;
        return response;
      });
    } catch (error) {
      console.error('获取项目列表失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 获取项目详情
   * @param req 请求对象
   * @param projectId 项目ID
   * @returns 项目详情
   */
  @Get(':projectId')
  @ApiOperation({ summary: '获取项目详情' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: ProjectDetailResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '项目不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权访问此项目' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async getProjectById(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<ProjectDetailResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.getProjectById(
        projectId,
        userId,
      );

      // 转换为详细响应
      const response = this.transformProjectDetailResponse(project);
      response.permission =
        this.projectService.getUserRoleInProject(project, userId) ||
        Permission.VIEWER;
      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('获取项目详情失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 更新项目信息
   * @param req 请求对象
   * @param projectId 项目ID
   * @param updateProjectDto 更新数据
   * @returns 更新后的项目
   */
  @Put(':projectId')
  @ApiOperation({ summary: '更新项目信息' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '项目不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权更新此项目' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数校验失败或项目名称已存在',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async updateProject(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.updateProject(
        projectId,
        userId,
        updateProjectDto,
      );

      return this.transformProjectResponse(project);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('更新项目失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  // src/modules/project/project.controller.ts (继续)

  /**
   * 删除项目
   * @param req 请求对象
   * @param projectId 项目ID
   * @returns 删除结果
   */
  @Delete(':projectId')
  @ApiOperation({ summary: '删除项目' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '删除成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '项目不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权删除此项目' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async deleteProject(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<{ code: number; message: string; success: boolean }> {
    try {
      const userId = req.user.userId;
      await this.projectService.deleteProject(projectId, userId);

      return { code: 0, message: '项目删除成功', success: true };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('删除项目失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 归档项目
   * @param req 请求对象
   * @param projectId 项目ID
   * @returns 更新后的项目
   */
  @Patch(':projectId/archive')
  @ApiOperation({ summary: '归档项目' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '归档成功',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '项目不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权归档此项目' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async archiveProject(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.archiveProject(
        projectId,
        userId,
        true,
      );

      return this.transformProjectResponse(project);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('归档项目失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 取消归档项目
   * @param req 请求对象
   * @param projectId 项目ID
   * @returns 更新后的项目
   */
  @Patch(':projectId/unarchive')
  @ApiOperation({ summary: '取消归档项目' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '取消归档成功',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '项目不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权操作此项目' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async unarchiveProject(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.archiveProject(
        projectId,
        userId,
        false,
      );

      return this.transformProjectResponse(project);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('取消归档项目失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 添加项目成员
   * @param req 请求对象
   * @param projectId 项目ID
   * @param memberDto 成员信息
   * @returns 更新后的项目
   */
  @Post(':projectId/members')
  @ApiOperation({ summary: '添加项目成员' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '添加成功',
    type: ProjectDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '项目不存在或用户不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权操作此项目' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '成员已存在' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async addProjectMember(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() memberDto: AddMemberDto,
  ): Promise<ProjectDetailResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.addProjectMember(
        projectId,
        userId,
        memberDto,
      );

      return this.transformProjectDetailResponse(project);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('添加项目成员失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 批量添加项目成员
   * @param req 请求对象
   * @param projectId 项目ID
   * @param membersDto 成员列表
   * @returns 更新后的项目
   */
  @Post(':projectId/members/batch')
  @ApiOperation({ summary: '批量添加项目成员' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiBody({ type: BulkAddMembersDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '添加成功',
    type: ProjectDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '项目不存在或用户不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权操作此项目' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '参数校验失败' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async addProjectMembers(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() membersDto: BulkAddMembersDto,
  ): Promise<ProjectDetailResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.addProjectMembers(
        projectId,
        userId,
        membersDto,
      );

      return this.transformProjectDetailResponse(project);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('批量添加项目成员失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 更新项目成员角色
   * @param req 请求对象
   * @param projectId 项目ID
   * @param memberId 成员ID
   * @param updateDto 角色更新信息
   * @returns 更新后的项目
   */
  @Put(':projectId/members/:memberId')
  @ApiOperation({ summary: '更新项目成员角色' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'memberId', description: '成员用户ID' })
  @ApiBody({ type: UpdateProjectMemberDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: ProjectDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '项目不存在或成员不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权操作此项目' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '不能修改创建者角色',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async updateProjectMember(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() updateDto: UpdateProjectMemberDto,
  ): Promise<ProjectDetailResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.updateProjectMember(
        projectId,
        userId,
        memberId,
        updateDto,
      );

      return this.transformProjectDetailResponse(project);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('更新项目成员角色失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 移除项目成员
   * @param req 请求对象
   * @param projectId 项目ID
   * @param memberId 成员ID
   * @returns 更新后的项目
   */
  @Delete(':projectId/members/:memberId')
  @ApiOperation({ summary: '移除项目成员' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'memberId', description: '成员用户ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '移除成功',
    type: ProjectDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '项目不存在或成员不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权操作此项目' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '不能移除项目创建者',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async removeProjectMember(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
  ): Promise<ProjectDetailResponseDto> {
    try {
      const userId = req.user.userId;
      const project = await this.projectService.removeProjectMember(
        projectId,
        userId,
        memberId,
      );

      return this.transformProjectDetailResponse(project);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('移除项目成员失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 用户离开项目
   * @param req 请求对象
   * @param projectId 项目ID
   * @returns 成功消息
   */
  @Delete(':projectId/leave')
  @ApiOperation({ summary: '当前用户离开项目' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '离开成功' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '项目不存在或用户不是项目成员',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '项目创建者不能离开项目',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async leaveProject(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<{ code: number; message: string; success: boolean }> {
    try {
      const userId = req.user.userId;
      await this.projectService.removeProjectMember(projectId, userId, userId);

      return { code: 0, message: '已成功离开项目', success: true };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('离开项目失败:', error);
      throw new InternalServerErrorException(PROJECT_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 项目响应转换器 - 基本信息
   * @param project 项目文档
   * @returns 项目响应DTO
   */
  private transformProjectResponse(project: any): ProjectResponseDto {
    // 计算成员数量
    const membersCount = project.members ? project.members.length : 0;

    return {
      id: project._id.toString(),
      name: project.name,
      description: project.description || '',
      createdBy: project.createdBy, // 假设已经通过populate获取了用户信息
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      membersCount,
      isArchived: project.isArchived || false,
      repositoryUrl: project.repositoryUrl || '',
      tags: project.tags || [],
      filesCount: project.filesCount || 0,
      collaboratorsCount: project.collaboratorsCount || 0,
      lastActivityAt: project.lastActivityAt || project.updatedAt,
    };
  }

  /**
   * 项目响应转换器 - 详细信息（包含成员）
   * @param project 项目文档
   * @returns 项目详情响应DTO
   */
  private transformProjectDetailResponse(
    project: any,
  ): ProjectDetailResponseDto {
    const basicInfo = this.transformProjectResponse(project);

    // 转换成员信息
    const members = project.members
      ? project.members.map((member) => ({
          user: member.userId, // 假设已经通过populate获取了用户信息
          role: member.role,
          joinedAt: member.joinedAt,
        }))
      : [];

    return {
      ...basicInfo,
      members,
    };
  }
}
