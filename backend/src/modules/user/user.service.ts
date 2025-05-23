import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, Permission, Module } from './schemas/user.schema';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserModulesDto,
  ChangePasswordDto,
} from './dto/user.dto';
import * as bcrypt from 'bcrypt'; // 引入bcrypt用于密码哈希
import { isValidObjectId } from 'mongoose';

@Injectable()
export class UserService {
  //  注入User模型
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * 创建新用户
   * @param createUserDto - 创建用户的数据传输对象
   * @returns Promise<User> - 创建成功后的用户对象
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // 对密码进行哈希处理
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 创建新的用户实例
    const createdUser = new this.userModel({
      email: createUserDto.email,
      username: createUserDto.username,
      phone: createUserDto.phone,
      password: hashedPassword, // 存储哈希后的密码
      permission: 'viewer', // 默认权限
      firstLogin: true, // 默认首次登录
    });

    // 保存用户到数据库
    return createdUser.save();
  }

  /**
   * 根据ID查找用户
   * @param id - 用户ID
   * @returns Promise<User | null> - 找到的用户对象或null
   */
  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  /**
   * 根据手机号查找用户
   * @param phone - 用户手机号
   * @return Promise<User | null>, - 找到用户对象或者null
   */
  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  /**
   * 根据邮箱查找用户
   * @param email - 用户邮箱
   * @returns Promise<User | null> - 找到的用户对象或null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * 根据用户名查找用户
   * @param username - 用户名
   * @returns Promise<User | null> - 找到的用户对象或null
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  /**
   * 查找所有用户
   * @returns Promise<UserDocument[]> - 用户文档列表
   */
  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  /**
   * 根据邮箱、用户名或手机号查找用户 (用于登录等场景)
   * @param identifier - 邮箱、用户名或手机号
   * @returns Promise<User | null> - 找到的用户对象或null
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    // 支持手机号、邮箱、用户名三种方式
    if (/^\d{11}$/.test(identifier)) {
      // 手机号
      return this.findByPhone(identifier);
    } else if (identifier.includes('@')) {
      // 邮箱
      return this.findByEmail(identifier);
    } else {
      // 用户名
      return this.findByUsername(identifier);
    }
  }

  /**
   * 更新用户信息
   * @param id - 用户ID
   * @param updateData - 更新的数据
   * @param requesterPermission - 请求方的权限 (用于权限检查)
   * @returns Promise<User | null> - 更新后的用户对象或null
   */
  async updateUser(
    id: string,
    updateData: Partial<User>,
    requesterPermission: string,
  ): Promise<User | null> {
    // 新增ObjectId格式校验
    if (!isValidObjectId(id)) {
      throw new BadRequestException('用户ID格式不正确');
    }

    // 如果请求方不是admin，且试图修改permission字段，则阻止
    if (requesterPermission !== 'admin' && updateData.permission) {
      // 忽略非admin用户的permission修改尝试
      delete updateData.permission;
    }

    // 如果要更新密码，需要先哈希处理
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // 查找并更新用户
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  /**
   * 删除用户
   * @param id - 用户ID
   * @param requesterPermission - 请求方的权限 (用于权限检查)
   * @returns Promise<User | null> - 被删除的用户对象或null
   */
  async deleteUser(
    id: string,
    requesterPermission: string,
  ): Promise<User | null> {
    // 只有admin用户才能删除用户
    if (requesterPermission !== 'admin') {
      // 使用NestJS ForbiddenException统一异常处理
      throw new ForbiddenException('权限不足！');
    }

    // 查找并删除用户
    return this.userModel.findByIdAndDelete(id).exec();
  }

  /**
   * 设置用户功能模块
   * @param userId - 用户ID
   * @param modules - 功能模块列表
   * @param requesterPermission - 请求方的权限 (用于权限检查)
   * @returns Promise<User | null> - 更新后的用户对象或null
   */
  async setUserModules(
    userId: string,
    modules: Module[],
    requesterPermission: string,
  ): Promise<User | null> {
    // 只有admin用户才能设置功能模块
    if (requesterPermission !== Permission.ADMIN) {
      throw new ForbiddenException('只有管理员可以设置用户功能模块');
    }

    if (!isValidObjectId(userId)) {
      throw new BadRequestException('用户ID格式不正确');
    }

    // 查找并更新用户
    return this.userModel
      .findByIdAndUpdate(userId, { modules }, { new: true })
      .exec();
  }

  /**
   * 获取用户功能模块
   * @param userId - 用户ID
   * @returns Promise<Module[]> - 功能模块列表
   */
  async getUserModules(userId: string): Promise<Module[]> {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('用户ID格式不正确');
    }

    const user = await this.userModel.findById(userId).exec();
    return user?.modules || [];
  }

  /**
   * 修改用户密码
   * @param userId 用户ID
   * @param changePasswordDto 修改密码数据
   * @returns 成功或失败信息
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    // 检查用户ID格式
    if (!isValidObjectId(userId)) {
      return { success: false, message: '用户ID格式不正确' };
    }

    // 查找用户
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return { success: false, message: '旧密码不正确' };
    }

    // 确保新密码与旧密码不同
    if (oldPassword === newPassword) {
      return { success: false, message: '新密码不能与旧密码相同' };
    }

    // 直接设置新密码，pre-save hook会自动处理加密
    user.password = newPassword;
    await user.save();
  }
}
