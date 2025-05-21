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
import { JwtService } from '@nestjs/jwt';
import { Public } from '@/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AUTH_ERROR } from '../../common/constants/auth-error-codes';

@Controller('auth')
@ApiTags('认证模块')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 获取图形验证码
   */
  @Get('captcha')
 @Public()
  @ApiOperation({ summary: '获取图形验证码' })
  @ApiResponse({ status: 200, description: '获取成功，返回验证码信息' })
  async getCaptcha(): Promise<CaptchaResponseDto> {
    return this.authService.generateCaptcha();
  }

  /**
   * 用户注册（带验证码/安全注册）
   * @param registerDto - 注册数据
   * @returns RegisterResponseDto
   */
  @Post('register')
 @Public()
  @ApiOperation({ summary: '用户注册（带验证码）' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: '注册成功，返回用户ID和Token',
    type: RegisterResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * 用户登录
   */
  @Post('login')
 @Public()
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: '登录成功，返回Token和用户信息',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 401, description: '认证失败' })
  @HttpCode(HttpStatus.OK)
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

  /**
   * 用户登出
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({
    status: 200,
    description: '登出成功',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SuccessResponseDto> {
    // req.user 是从 JWT token 中解析出的用户信息 (JwtStrategy 的 validate 方法返回值)
    await this.authService.logout(req.user.userId, response);
    return { code: 0, message: '登出成功', success: true };
  }

  /**
   * 忘记密码-发送验证码
   */
  @Post('forgot-password')
 @Public()
  @ApiOperation({ summary: '忘记密码-发送验证码' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: '验证码发送成功',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<SuccessResponseDto> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return { code: 0, message: '验证码已发送至您的邮箱，请查收' };
  }

  /**
   * 重置密码
   */
  @Post('rest-password')
 @Public()
  @ApiOperation({ summary: '重置密码' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: '密码重置成功',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数校验失败' })
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

  /**
   * 自动登录/刷新Token
   */
  @Get('refresh')
  @ApiOperation({ summary: '刷新Token' })
  @ApiResponse({
    status: 200,
    description: 'Token刷新成功',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token not found' })
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
      throw new UnauthorizedException(AUTH_ERROR.REFRESH_TOKEN_NOT_FOUND);
    }

    const { accessToken } = await this.authService.refreshToken(
      oldRefreshToken,
      response,
    );

    return { code: 0, message: 'Token 刷新成功', accessToken };
  }

  /**
   * 获取当前用户信息
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功，返回用户信息' })
  @ApiResponse({ status: 401, description: '未认证' })
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
