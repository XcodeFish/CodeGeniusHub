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
  HttpException,
  Logger,
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
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AUTH_ERROR } from '../../common/constants/auth-error-codes';

@Controller('auth')
@ApiTags('认证模块')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

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
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  async getCaptcha(): Promise<CaptchaResponseDto> {
    try {
      return await this.authService.generateCaptcha();
    } catch (error) {
      // 中间件已经处理了频率限制错误，这里处理其他可能的错误
      if (error.response && error.response.code === 1429) {
        throw error; // 让中间件的错误直接传递
      }
      throw new HttpException(
        {
          code: 1000,
          message: '获取验证码失败，请稍后再试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      this.logger.log(
        `收到登录请求 - 用户标识: ${loginDto.identifier}, 验证码ID: ${loginDto.captchaId}`,
      );

      // 屏蔽密码和验证码，不记录到日志中
      const logSafeLoginDto = {
        ...loginDto,
        password: '******',
        captchaCode: '******',
      };
      this.logger.log(`登录参数: ${JSON.stringify(logSafeLoginDto)}`);

      // Service 中会处理设置 httpOnly cookie 的逻辑，需要传入 response 对象
      const loginResult = await this.authService.login(loginDto, response);

      this.logger.log(
        `登录服务返回结果: ${JSON.stringify({
          code: loginResult.code,
          message: loginResult.message,
          accessToken: loginResult.accessToken
            ? `${loginResult.accessToken.substring(0, 15)}...`
            : undefined,
          user: loginResult.user
            ? {
                id: loginResult.user.id,
                username: loginResult.user.username,
                permission: loginResult.user.permission,
              }
            : undefined,
        })}`,
      );

      this.logger.log(`登录响应生成成功 - 用户ID: ${loginResult.user.id}`);

      return {
        code: 0,
        message: '登录成功',
        accessToken: loginResult.accessToken,
        user: loginResult.user,
      };
    } catch (error) {
      this.logger.error(`登录控制器捕获到异常: ${error.message}`, error.stack);
      throw error; // 继续抛出异常，让全局异常过滤器处理
    }
  }

  /**
   * 用户登出
   */
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
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
  @ApiOperation({ summary: '忘记密码-发送重置链接' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: '重置链接发送成功',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<SuccessResponseDto> {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return {
      code: result.success ? 0 : 1000,
      message: result.message,
      success: result.success,
    };
  }

  /**
   * 重置密码
   */
  @Post('reset-password')
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
    const result = await this.authService.resetPassword(resetPasswordDto);
    return {
      code: result.success ? 0 : 1000,
      message: result.message,
      success: result.success,
    };
  }

  /**
   * 自动登录/刷新Token
   */
  @Get('refresh')
  @Public()
  @ApiOperation({ summary: '刷新Token' })
  @ApiResponse({
    status: 200,
    description: 'Token刷新成功',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token无效或已过期' })
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshTokenResponseDto> {
    // 尝试从cookie获取refreshToken
    let token = req.cookies?.refreshToken;

    // 如果cookie中没有refreshToken，则尝试从Authorization头中获取token
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        this.logger.log('从Authorization头获取token进行刷新');
      }
    }

    if (!token) {
      this.logger.warn('刷新Token失败: 未找到token');
      throw new UnauthorizedException(AUTH_ERROR.REFRESH_TOKEN_NOT_FOUND);
    }

    try {
      this.logger.log('开始刷新token...');
      const { accessToken } = await this.authService.refreshToken(
        token,
        response,
      );
      this.logger.log('Token刷新成功');

      return {
        code: 0,
        message: 'Token刷新成功',
        accessToken,
      };
    } catch (error) {
      this.logger.error(`刷新Token失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取当前用户信息
   */
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
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
