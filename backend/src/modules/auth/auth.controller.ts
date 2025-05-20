import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  CaptchaResponseDto,
  RegisterResponseDto,
  LoginResponseDto,
  RefreshTokenResponseDto,
  SuccessResponseDto,
} from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { jwtConstants } from '../common/constants/constants';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  // 获取图形验证码
  @Get('captcha')
  @HttpCode(HttpStatus.OK)
  async getCaptcha(): Promise<CaptchaResponseDto> {
    return this.authService.generateCaptcha();
  }

  // 注册
  @Post('register')
  @HttpCode(HttpStatus.CREATED) // 确保返回 201 Created
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  // 登录
  @Post('login')
  @HttpCode(HttpStatus.OK) // 确保返回 200 OK
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    // Service 中会处理设置 httpOnly cookie 的逻辑，需要传入 response 对象
    const { accessToken, user } = await this.authService.login(
      loginDto,
      response,
    );
    return {
      code: 0,
      message: '登录成功',
      accessToken,
      user,
    };
  }

  // 登出
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SuccessResponseDto> {
    // req.user 是从 JWT token 中解析出的用户信息 (JwtStrategy 的 validate 方法返回值)
    await this.authService.logout(req.user.userId, response);
    return { code: 0, message: '登出成功', success: true };
  }

  // 忘记密码- 发送验证码
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<SuccessResponseDto> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return { code: 0, message: '验证码已发送至您的邮箱，请查收' };
  }

  // 重置密码
  @Post('rest-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<SuccessResponseDto> {
    await this.authService.restPassword(resetPasswordDto);
    return {
      code: 0,
      message: '密码重置成功，请使用新密码登录',
      success: true,
    };
  }

  // 自动登录/刷新Token
  // @UseGuards(AuthGuard('jwt-refresh')) // 假设有一个 refresh token 的 Guard
  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshTokenResponseDto> {
    // 这里的逻辑需要从 cookie 或请求头中获取 refresh token
    // 然后调用 authService.refreshToken 方法来生成新的 access token
    // 这个例子简化处理，直接返回一个新的 access token (实际需要复杂逻辑)

    // 从请求中获取旧的 refresh token (通常在 httpOnly cookie 中)
    const oldRefreshToken = req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const { accessToken } = await this.authService.refreshToken(
      oldRefreshToken,
      response,
    );

    return { code: 0, message: 'Token 刷新成功', accessToken };
  }

  // 获取当前用户信息
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req): { code: number; message: string; user: any } {
    // req.user 是从 JWT token 中解析出的用户信息 (JwtStrategy 的 validate 方法返回值)
    return {
      code: 0,
      message: '获取用户信息成功',
      user: req.user,
    };
  }
}
