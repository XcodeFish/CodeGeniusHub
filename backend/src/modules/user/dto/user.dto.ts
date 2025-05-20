// 用户信息相关的 DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, MinLength } from 'class-validator';

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
  @IsEmail()
  email: string; // 邮箱，使用IsEmail进行格式校验

  @IsOptional() // 用户名
  @IsString()
  username: string; // 用户名

  @IsOptional() // 手机号可选
  @IsString()
  phone: string; // 手机号

  @IsString()
  @MinLength(6) // 密码最小长度为6
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
