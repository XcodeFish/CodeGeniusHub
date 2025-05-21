// 用户信息相关的 DTO
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEmail,
  MinLength,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Module } from '../schemas/user.schema';

export class UserDto {
  @ApiProperty({ description: '用户唯一ID', example: 'uuid-xxx' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: '用户名', example: 'user123' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '手机号', example: '13211223322' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '创建时间' })
  @IsOptional()
  createdAt?: Date;

  @ApiProperty({ description: '更新时间' })
  @IsOptional()
  updatedAt?: Date;

  @ApiProperty({ description: '用户权限', example: 'viewer' })
  @IsString()
  @IsOptional()
  permission?: string;

  @ApiProperty({ description: '是否首次登录', example: true })
  @IsOptional()
  @IsBoolean({ message: '是否首次登录必须是布尔值' })
  firstLogin?: boolean;
}

export class CreateUserDto {
  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string; // 邮箱，必填

  @ApiProperty({ description: '用户名', example: 'user123' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string; // 用户名，必填

  @ApiProperty({ description: '手机号', example: '13211223322' })
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string; // 手机号，必填

  @ApiProperty({ description: '密码', example: 'password123' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty({ message: '密码不能为空' })
  password: string; // 密码
}

export class UpdateUserDto {
  @ApiProperty({
    description: '用户手机号 (可选)',
    required: false,
    example: '13812345678',
  })
  @IsString()
  phone?: string;

  @ApiProperty({ description: '用户名', example: 'user123' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: '用户邮箱', example: 'test@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: '用户角色', example: 'user' })
  @IsString()
  @IsOptional()
  role?: string;

  // 其他可更新的用户字段...
}

export class ModuleDto implements Partial<Module> {
  @ApiProperty({ description: '模块ID', example: 'dashboard' })
  @IsString()
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty({ description: '模块名称', example: '仪表盘' })
  @IsString()
  @IsNotEmpty()
  moduleName: string;

  @ApiProperty({ description: '模块路径', example: '/dashboard' })
  @IsString()
  @IsNotEmpty()
  modulePath: string;

  @ApiProperty({
    description: '模块图标',
    example: 'dashboard',
    required: false,
  })
  @IsString()
  @IsOptional()
  moduleIcon?: string;

  @ApiProperty({ description: '模块排序', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  moduleOrder: number;

  @ApiProperty({ description: '子模块', type: [ModuleDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleDto)
  @IsOptional()
  children?: ModuleDto[];
}

export class UpdateUserModulesDto {
  @ApiProperty({ description: '功能模块列表', type: [ModuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleDto)
  modules: ModuleDto[];
}

/**
 * 用于响应的用户DTO，过滤敏感字段
 */
export class UserResponseDto {
  @ApiProperty({ description: '用户唯一ID', example: 'uuid-xxx' })
  id: string;

  @ApiProperty({ description: '用户名', example: 'user123' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: '手机号', example: '13211223322' })
  phone: string;

  @ApiProperty({ description: '用户权限', example: 'viewer' })
  permission: string;

  @ApiProperty({ description: '项目权限列表', type: 'array' })
  projectPermissions?: any[];

  @ApiProperty({ description: '功能模块列表', type: 'array' })
  modules?: any[];

  @ApiProperty({ description: '头像URL', required: false })
  avatar?: string;

  @ApiProperty({ description: '是否首次登录', example: true })
  firstLogin?: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt?: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt?: Date;

  /**
   * 转换User对象为UserResponseDto，过滤敏感字段
   * @param user 用户对象或用户文档
   * @returns 过滤后的用户响应对象
   */
  static fromUser(user: any): UserResponseDto {
    // 如果是Mongoose文档，先转为普通对象
    const userObj = user.toObject ? user.toObject() : { ...user };

    // 删除敏感字段
    delete userObj.password;
    delete userObj.currentRefreshTokenHash;
    delete userObj.forgotPasswordCode;
    delete userObj.forgotPasswordCodeExpires;

    return userObj as UserResponseDto;
  }
}
