// 用户信息相关的 DTO
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEmail,
  MinLength,
} from 'class-validator';

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
