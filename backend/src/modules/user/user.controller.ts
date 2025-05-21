import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request, // 引入Request用于获取用户信息
  Patch, // 引入Patch用于部分更新用户信息
  Body, // 引入Body用于获取请求体
  NotFoundException, // 引入NotFoundException处理找不到用户的情况
  ForbiddenException, // 引入ForbiddenException处理权限不足的情况
  InternalServerErrorException,
  Post,
  HttpStatus,
  HttpException,
  Put,
  Query,
  HttpCode,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; // 假设存在用于HTTP的JwtAuthGuard
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator'; // 引入Roles装饰器
import {
  UpdateUserDto,
  CreateUserDto,
  UpdateUserModulesDto,
  UserResponseDto,
} from './dto/user.dto'; // 引入UserResponseDto
import { User, UserDocument, Module } from './schemas/user.schema'; // 引入User Schema
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger'; // 引入swagger装饰器
import { USER_ERROR } from '../../common/constants/error-codes';
import { Permission } from './schemas/user.schema'; // 修正导入路径
import { PermissionService } from '../../common/services/permission.service';

// 批量更新项目权限DTO
class BatchUpdatePermissionsDto {
  projectId: string;
  userPermissions: { userId: string; permission: Permission }[];
}

@Controller('user') // 定义基础路由 /user
@ApiTags('用户模块')
@UseGuards(JwtAuthGuard, RolesGuard) // 同时应用 JwtAuthGuard 和 RolesGuard
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * 根据用户ID获取用户信息
   * 此接口需要JWT认证。
   * 用户只能获取自己的信息，管理员可以获取所有用户信息。
   * @param id - 用户ID
   * @param req - 请求对象，用于获取当前用户信息
   * @returns Promise<UserResponseDto> - 用户对象 (已过滤敏感信息)
   */
  @Get(':id')
  @ApiOperation({ summary: '根据用户ID获取用户信息' })
  @ApiResponse({
    status: 200,
    description: '获取成功，返回用户信息',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 403, description: '无权限访问' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async findOne(
    @Param('id') id: string,
    @Request() req,
  ): Promise<UserResponseDto> {
    // 这取决于JwtAuthGuard的实现，通常会将解析出的用户信息附加到req.user上。
    const currentUserId = req.user.userId; // 假设JWT Payload中有userId
    const currentUserRole = req.user.permission; // 假设JWT Payload中有role

    // 如果当前用户不是管理员且请求的ID不是当前用户的ID，则禁止访问
    if (currentUserRole !== Permission.ADMIN && currentUserId !== id) {
      throw new ForbiddenException('您没有权限访问其他用户的信息');
    }

    try {
      // 调用UserService根据ID查找用户
      const user = await this.userService.findById(id);

      // 如果用户不存在，抛出404异常
      if (!user) {
        throw new NotFoundException(`找不到ID为 ${id} 的用户`);
      }

      // 使用UserResponseDto处理响应
      return UserResponseDto.fromUser(user);
    } catch (error) {
      // 统一异常处理
      this.handleException(error);
    }
  }

  /**
   * 更新当前登录用户信息
   * 此接口需要JWT认证。
   * @param req - 请求对象，用于获取当前用户信息
   * @param updateUserDto - 更新用户的数据传输对象
   * @returns Promise<UserResponseDto> - 更新后的用户对象 (已过滤敏感信息)
   */
  @Patch('update')
  @ApiOperation({ summary: '更新当前登录用户信息' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: '更新成功，返回用户信息',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在或更新失败' })
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.permission; // 获取当前用户的权限

    try {
      // 调用UserService的updateUser方法更新用户
      const updatedUser = await this.userService.updateUser(
        currentUserId,
        updateUserDto,
        currentUserRole, // 传递当前用户的权限
      );

      // 如果更新后的用户不存在，抛出404异常
      if (!updatedUser) {
        throw new NotFoundException('找不到当前用户或更新失败');
      }

      // 使用UserResponseDto处理响应
      return UserResponseDto.fromUser(updatedUser);
    } catch (error) {
      // 统一异常处理
      this.handleException(error);
    }
  }

  /**
   * 获取所有用户列表（仅限管理员）
   * @returns Promise<UserResponseDto[]> - 用户列表（去除密码）
   */
  @Get('/list')
  @Roles(Permission.ADMIN)
  @ApiOperation({ summary: '获取所有用户列表（仅限管理员）' })
  @ApiResponse({
    status: 200,
    description: '获取成功，返回用户列表',
    type: [UserResponseDto],
  })
  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userService.findAll();

      // 使用UserResponseDto处理响应
      return users.map((user) => UserResponseDto.fromUser(user));
    } catch (error) {
      // 统一异常处理
      this.handleException(error);
    }
  }

  /**
   * 删除用户 (仅限管理员)
   * @param id - 要删除的用户ID
   * @param req - 请求对象，用于获取当前用户信息 (用于传递请求方权限)
   * @returns Promise<{ message: string }> - 删除成功消息
   */
  @Delete(':id')
  @Roles(Permission.ADMIN) // 只有admin角色可以访问此路由
  @ApiOperation({ summary: '删除用户（仅限管理员）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '无权限删除' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async delete(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    const currentUserRole = req.user.permission; // 获取当前用户的权限

    try {
      const deletedUser = await this.userService.deleteUser(
        id,
        currentUserRole,
      );

      if (!deletedUser) {
        throw new NotFoundException(USER_ERROR.NOT_FOUND);
      }

      return { message: `用户ID ${id} 删除成功` };
    } catch (error) {
      // 统一异常处理
      this.handleException(error);
    }
  }

  /**
   * 用户注册（创建新用户）
   * 开放接口，无需登录
   * @param createUserDto - 创建用户的数据传输对象
   * @returns Promise<UserResponseDto> - 创建成功的用户信息（去除密码）
   */
  @Post('register')
  @Public()
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: '注册成功，返回用户信息',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  @UseGuards() // 取消全局守卫，允许未登录用户注册
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.userService.create(createUserDto);
      return UserResponseDto.fromUser(user);
    } catch (error) {
      // 统一异常处理
      this.handleException(error);
    }
  }

  /**
   * 获取用户功能模块
   * @param userId 用户ID
   * @returns 用户功能模块列表
   */
  @Get(':id/modules')
  @ApiOperation({ summary: '获取用户功能模块列表' })
  @ApiResponse({ status: 200, description: '获取成功，返回功能模块列表' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserModules(@Param('id') id: string): Promise<Module[]> {
    try {
      return await this.userService.getUserModules(id);
    } catch (error) {
      // 统一异常处理
      this.handleException(error);
    }
  }

  /**
   * 设置用户功能模块（仅限管理员）
   * @param id 用户ID
   * @param updateModulesDto 功能模块列表
   * @param req 请求对象
   * @returns 更新后的用户信息
   */
  @Patch(':id/modules')
  @Roles(Permission.ADMIN) // 只有admin角色可以访问此路由
  @ApiOperation({ summary: '设置用户功能模块（仅限管理员）' })
  @ApiBody({ type: UpdateUserModulesDto })
  @ApiResponse({
    status: 200,
    description: '设置成功，返回用户信息',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async setUserModules(
    @Param('id') id: string,
    @Body() updateModulesDto: UpdateUserModulesDto,
    @Request() req,
  ): Promise<UserResponseDto> {
    const currentUserRole = req.user.permission; // 获取当前用户的权限

    try {
      const updatedUser = await this.userService.setUserModules(
        id,
        updateModulesDto.modules,
        currentUserRole,
      );

      if (!updatedUser) {
        throw new NotFoundException(`找不到ID为 ${id} 的用户`);
      }

      // 使用UserResponseDto处理响应
      return UserResponseDto.fromUser(updatedUser);
    } catch (error) {
      // 统一异常处理
      this.handleException(error);
    }
  }

  /**
   * 批量更新项目权限
   * @param req 请求对象
   * @param body 批量权限请求数据
   * @returns 批量更新结果
   */
  @Post('batch-project-permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Permission.ADMIN) // 系统管理员或项目管理员可操作
  @ApiOperation({ summary: '批量更新项目权限' })
  @ApiBody({ type: BatchUpdatePermissionsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量更新成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: '批量权限更新完成' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @HttpCode(HttpStatus.OK)
  async batchUpdateProjectPermissions(
    @Request() req,
    @Body() body: BatchUpdatePermissionsDto,
  ) {
    const currentUserId = req.user.userId;
    const { projectId, userPermissions } = body;

    const results = await this.permissionService.batchUpdateProjectPermissions(
      projectId,
      userPermissions,
      currentUserId,
    );

    return {
      code: 0,
      message: '批量权限更新完成',
      results,
    };
  }

  /**
   * 获取用户系统权限
   * @param id 用户ID
   * @returns 用户系统权限
   */
  @Get(':id/system-permission')
  @ApiOperation({ summary: '获取用户系统权限' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取权限' })
  @Roles(Permission.VIEWER)
  async getUserSystemPermission(@Param('id') id: string) {
    const permission = await this.permissionService.getUserSystemPermission(id);
    return {
      code: 0,
      message: '获取成功',
      data: { permission },
    };
  }

  /**
   * 更新用户系统权限
   * @param id 用户ID
   * @param permission 权限级别
   * @param req 请求对象
   * @returns 更新结果
   */
  @Put(':id/system-permission')
  @ApiOperation({ summary: '更新用户系统权限' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permission: {
          type: 'string',
          enum: Object.values(Permission),
          description: '权限级别',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '权限更新成功' })
  @Roles(Permission.ADMIN)
  async updateUserSystemPermission(
    @Param('id') id: string,
    @Body('permission') permission: Permission,
    @Request() req,
  ) {
    const user = await this.permissionService.updateSystemPermission(
      id,
      permission,
      req.user.id,
    );

    return {
      code: 0,
      message: '权限更新成功',
      data: { user },
    };
  }

  /**
   * 获取用户项目权限
   * @param id 用户ID
   * @returns 用户所有项目权限
   */
  @Get(':id/project-permissions')
  @ApiOperation({ summary: '获取用户所有项目权限' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取权限' })
  @Roles(Permission.VIEWER)
  async getUserProjectPermissions(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      code: 0,
      message: '获取成功',
      data: { projectPermissions: user.projectPermissions || [] },
    };
  }

  /**
   * 批量更新用户权限
   * @param updates 权限更新列表
   * @param req 请求对象
   * @returns 批量更新结果
   */
  @Post('/batch-update-permissions')
  @ApiOperation({ summary: '批量更新用户系统权限' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              permission: {
                type: 'string',
                enum: Object.values(Permission),
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '批量更新成功' })
  @Roles(Permission.ADMIN)
  async batchUpdateUserPermissions(
    @Body('updates') updates: { userId: string; permission: Permission }[],
    @Request() req,
  ) {
    const results: { userId: string; success: boolean; message: string }[] = [];

    for (const update of updates) {
      try {
        await this.permissionService.updateSystemPermission(
          update.userId,
          update.permission,
          req.user.id,
        );
        results.push({
          userId: update.userId,
          success: true,
          message: '更新成功',
        });
      } catch (error) {
        results.push({
          userId: update.userId,
          success: false,
          message: error.message || '更新失败',
        });
      }
    }

    return {
      code: 0,
      message: '批量更新完成',
      data: { results },
    };
  }

  /**
   * 获取权限变更日志
   * @param req 请求对象
   * @param userId 用户ID
   * @returns 权限变更日志列表
   */
  @Get(':userId/permission-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Permission.ADMIN) // 只有系统管理员可以查看权限日志
  @ApiOperation({ summary: '获取用户权限变更日志' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: '获取成功' },
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              adminId: { type: 'string' },
              adminName: { type: 'string' },
              oldPermission: { type: 'string' },
              newPermission: { type: 'string' },
              permissionType: { type: 'string' },
              projectId: { type: 'string' },
              projectName: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '用户不存在' })
  async getPermissionLogs(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: 'system' | 'project',
    @Query('projectId') projectId?: string,
  ) {
    // 权限日志查询的实现将依赖于PermissionService中的方法
    // 这里仅展示API设计，具体实现将在PermissionService中完成

    return {
      code: 0,
      message: '获取成功',
      logs: [],
    };
  }

  /**
   * 统一异常处理方法
   * @param error 捕获的异常
   */
  private handleException(error: any): never {
    // 根据错误类型抛出对应的HTTP异常
    if (error instanceof NotFoundException) {
      throw error;
    } else if (error instanceof ForbiddenException) {
      throw error;
    } else if (error instanceof HttpException) {
      throw error;
    } else {
      // 其他未知错误，记录日志并抛出服务器错误
      console.error('用户服务异常:', error);
      throw new InternalServerErrorException(
        USER_ERROR.INTERNAL || '服务器内部错误',
      );
    }
  }
}
