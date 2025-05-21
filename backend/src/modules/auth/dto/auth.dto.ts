import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsBoolean,
  IsOptional,
  Length,
} from 'class-validator';
import { UserDto } from '../../user/dto/user.dto';

// 获取图形验证码响应 DTO
export class CaptchaResponseDto {
  @ApiProperty({ description: '错误码，0为成功，非0为失败' })
  code: number;

  @ApiProperty({ description: '错误或成功提示信息' })
  message: string;

  @ApiProperty({ description: '验证码唯一标识' })
  captchaId: string;

  @ApiProperty({ description: '验证码图片（Base64格式）' })
  captchaImg: string | null;

  @ApiProperty({ description: '过期时间' })
  expiresAt: Date | string;
}

// 注册请求体 DTO
export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'user123' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(3, 12, { message: '用户名长度必须在3到12位之间' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'test@example.com' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '密码', example: 'password123' })
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 12, { message: '密码长度必须在6到12位之间' })
  password: string;

  @ApiProperty({ description: '手机号', example: '13211223322' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsPhoneNumber('CN')
  @IsString()
  phone: string;
}

// 注册响应 DTO
export class RegisterResponseDto {
  @ApiProperty({ description: '错误码，0为成功，非0为失败' })
  code: number;

  @ApiProperty({ description: '错误或成功提示信息' })
  message: string;

  @ApiProperty({
    description: '用户ID',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  userId: string; // uuid

  @ApiProperty({ description: '访问令牌', example: 'eyJhbGciOiJIUzI1NiI...' })
  accessToken: string;
}

// 登录请求 DTO
export class LoginDto {
  @ApiProperty({
    description: '邮箱、用户名或手机号',
    example: 'test@example.com 或 user123 或 13812345678',
  })
  @IsNotEmpty({ message: '登录标识不能为空' })
  @IsString({ message: '登录标识必须是字符串' })
  identifier: string;

  @ApiProperty({ description: '用户密码', example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @ApiProperty({ description: '记住我', example: false, required: false })
  @IsOptional()
  @IsBoolean({ message: '记住我必须是布尔值' })
  remember?: boolean;

  @ApiProperty({ description: '图形验证码唯一标识', example: 'captcha-xxx' })
  @IsNotEmpty({ message: '验证码ID不能为空' })
  @IsString({ message: '验证码ID必须是字符串' })
  captchaId: string;

  @ApiProperty({ description: '用户输入的图形验证码', example: 'AbCd12' })
  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString({ message: '验证码必须是字符串' })
  captchaCode: string;
}

// 忘记密码请求 DTO (发送验证码)
export class ForgotPasswordDto {
  @ApiProperty({ description: '注册邮箱', example: 'test@example.com' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;
}

// 重置密码请求 DTO
export class ResetPasswordDto {
  @ApiProperty({ description: '注册邮箱', example: 'test@example.com' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '密码重置令牌',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  @IsNotEmpty({ message: '重置令牌不能为空' })
  @IsString({ message: '重置令牌必须是字符串' })
  token: string;

  @ApiProperty({ description: '新密码', example: 'newpassword456' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsString({ message: '新密码必须是字符串' })
  @Length(6, 12, { message: '新密码长度必须在6到12位之间' })
  newPassword: string;
}

// 通用成功响应
export class SuccessResponseDto {
  @ApiProperty({ description: '错误码，0为成功，非0为失败' })
  code: number;

  @ApiProperty({ description: '错误或成功提示信息' })
  message: string;

  @ApiProperty({ description: '操作是否成功', example: true, required: false })
  success?: boolean; // 如果不是所有成功响应都有此字段，可以考虑移到特定DTO或设为可选
}

// 自动登录/刷新Token响应 DTO
export class RefreshTokenResponseDto {
  @ApiProperty({ description: '错误码，0为成功，非0为失败' })
  code: number;

  @ApiProperty({ description: '错误或成功提示信息' })
  message: string;

  @ApiProperty({
    description: '新的访问令牌',
    example: 'eyJhbGciOiJIUzI...',
  })
  accessToken: string;
}

// 登录响应 DTO
export class LoginResponseDto {
  @ApiProperty({ description: '错误码，0为成功，非0为失败' })
  code: number;

  @ApiProperty({ description: '错误或成功提示信息' })
  message: string;

  @ApiProperty({
    description: '访问令牌',
    example: 'eyJhbGciOiJIUzI',
    // required 默认为 true，与类型定义一致
  })
  accessToken: string;

  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI',
    required: false,
  })
  refreshToken?: string;

  @ApiProperty({ description: '用户信息' })
  user: UserDto;
}
