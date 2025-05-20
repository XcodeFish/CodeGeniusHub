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
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; // 假设存在用于HTTP的JwtAuthGuard
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator'; // 引入Roles装饰器
import { UpdateUserDto, CreateUserDto } from './dto/user.dto'; // 引入UpdateUserDto和CreateUserDto
import { User, UserDocument } from './schemas/user.schema'; // 引入User Schema
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'; // 引入swagger装饰器

@Controller('user') // 定义基础路由 /user
@ApiTags('用户模块')
@UseGuards(JwtAuthGuard, RolesGuard) // 同时应用 JwtAuthGuard 和 RolesGuard
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 根据用户ID获取用户信息
   * 此接口需要JWT认证。
   * 用户只能获取自己的信息，管理员可以获取所有用户信息。
   * @param id - 用户ID
   * @param req - 请求对象，用于获取当前用户信息
   * @returns Promise<User> - 用户对象 (已过滤敏感信息)
   */
  @Get(':id')
  @ApiOperation({ summary: '根据用户ID获取用户信息' })
  @ApiResponse({ status: 200, description: '获取成功，返回用户信息' })
  @ApiResponse({ status: 403, description: '无权限访问' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async findOne(@Param('id') id: string, @Request() req): Promise<User> {
    // 这取决于JwtAuthGuard的实现，通常会将解析出的用户信息附加到req.user上。
    const currentUserId = req.user.userId; // 假设JWT Payload中有userId
    const currentUserRole = req.user.permission; // 假设JWT Payload中有role

    // 如果当前用户不是管理员且请求的ID不是当前用户的ID，则禁止访问
    if (currentUserRole !== 'admin' && currentUserId !== id) {
      throw new ForbiddenException('您没有权限访问其他用户的信息');
    }

    // 调用UserService根据ID查找用户
    const user = (await this.userService.findById(id)) as UserDocument | null;

    // 如果用户不存在，抛出404异常
    if (!user) {
      throw new NotFoundException(`找不到ID为 ${id} 的用户`);
    }

    // 可以创建一个UserResponseDto或者在Service中处理
    const userResponse = (user as UserDocument).toObject(); // 转换为Plain Object方便删除属性
    delete (userResponse as any).password; // 删除密码字段

    return userResponse;
  }

  /**
   * 更新当前登录用户信息
   * 此接口需要JWT认证。
   * @param req - 请求对象，用于获取当前用户信息
   * @param updateUserDto - 更新用户的数据传输对象
   * @returns Promise<User> - 更新后的用户对象 (已过滤敏感信息)
   */
  @Patch('update')
  @ApiOperation({ summary: '更新当前登录用户信息' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: '更新成功，返回用户信息' })
  @ApiResponse({ status: 404, description: '用户不存在或更新失败' })
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.permission; // 获取当前用户的权限

    // 调用UserService的updateUser方法更新用户
    const updatedUser = await this.userService.updateUser(
      currentUserId,
      updateUserDto,
      currentUserRole, // 传递当前用户的权限
    );

    // 如果更新后的用户不存在，抛出404异常 (尽管Service方法应该处理此情况，此处留作安全检查)
    if (!updatedUser) {
      throw new NotFoundException('找不到当前用户或更新失败');
    }

    // 过滤掉敏感信息，如密码等
    const userResponse = (updatedUser as UserDocument).toObject(); // 断言为 UserDocument 以调用 toObject()
    delete (userResponse as any).password;

    return userResponse;
  }

  /**
   * 获取所有用户列表（仅限管理员）
   * @returns Promise<User[]> - 用户列表（去除密码）
   */
  @Get('/list')
  @Roles('admin')
  @ApiOperation({ summary: '获取所有用户列表（仅限管理员）' })
  @ApiResponse({ status: 200, description: '获取成功，返回用户列表' })
  async findAll(): Promise<User[]> {
    const users = this.userService.findAll();

    // 过滤掉敏感信息
    return (await users).map((user) => {
      const userResponse = (user as UserDocument).toObject();
      delete (userResponse as any).password;
      return userResponse as User; // 返回过滤后的User类型
    });
  }

  /**
   * 删除用户 (仅限管理员)
   * @param id - 要删除的用户ID
   * @param req - 请求对象，用于获取当前用户信息 (用于传递请求方权限)
   * @returns Promise<{ message: string }> - 删除成功消息
   */
  @Delete(':id')
  @Roles('admin') // 只有admin角色可以访问此路由
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
        throw new NotFoundException(`找不到ID为 ${id} 的用户`);
      }

      return { message: `用户ID ${id} 删除成功` };
    } catch (error) {
      // 捕获Service中抛出的权限不足错误
      if (error.message === '权限不足！') {
        throw new ForbiddenException('您没有权限删除用户');
      }
      // 捕获其他潜在错误
      throw new InternalServerErrorException('删除用户失败');
    }
  }

  /**
   * 用户注册（创建新用户）
   * 开放接口，无需登录
   * @param createUserDto - 创建用户的数据传输对象
   * @returns Promise<User> - 创建成功的用户信息（去除密码）
   */
  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: '注册成功，返回用户信息' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  @UseGuards() // 取消全局守卫，允许未登录用户注册
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    const user = await this.userService.create(createUserDto);
    const userResponse = (user as any).toObject
      ? (user as any).toObject()
      : user;
    delete userResponse.password;
    return userResponse;
  }
}
