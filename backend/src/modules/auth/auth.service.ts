import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, HydratedDocument } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from '../user/schemas/user.schema';
import { Captcha, CaptchaDocument } from '../../shared/schemas/captcha.schema';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LoginResponseDto,
  CaptchaResponseDto,
  RegisterResponseDto,
} from './dto/auth.dto';
import { UserDto } from '../user/dto/user.dto';
import { jwtConstants } from '../../common/constants/constants';
import * as uuid from 'uuid';
import * as bcrypt from 'bcryptjs'; // 引入 bcrypt
import { Response } from 'express'; // 引入 Response 类型 (用于设置 cookie)
import * as svgCaptcha from 'svg-captcha';
import { Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

// 定义一个接口来扩展 UserDocument，包含时间戳字段
interface UserDocumentWithTimestamps extends UserDocument {
  createdAt?: Date;
  updatedAt?: Date;
}

// 定义一个接口来扩展 CaptchaDocument，包含 text 字段
interface CaptchaDocumentWithText extends CaptchaDocument {
  text: string; // 明确定义 text 字段
}

@Injectable()
export class AuthService {
  private readonly bcryptSaltRounds = 10; // 定义 bcrypt 的 salt rounds
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Captcha.name) private captchaModel: Model<CaptchaDocument>,
    private jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // 获取图形验证码
  async generateCaptcha(): Promise<CaptchaResponseDto> {
    try {
      // 创建验证码，确保所有参数正确
      const captcha = svgCaptcha.create({
        size: 6, // 验证码长度
        noise: 2, // 干扰线条数量
        ignoreChars: '0oO1ilI', // 排除易混淆字符
        width: 160,
        height: 60,
        fontSize: 50,
        color: true,
        background: '#f0f0f0',
      });

      const captchaId = uuid.v4();
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3分钟有效期

      this.logger.debug(`生成验证码: ${captcha.text}, ID: ${captchaId}`);

      // 保存验证码到数据库
      const newCaptcha = new this.captchaModel({
        captchaId,
        text: captcha.text,
        expiresAt,
      });
      await newCaptcha.save();

      // 确保SVG格式正确，svg-captcha生成的SVG就是标准格式，直接返回即可
      return {
        code: 0,
        message: '获取验证码成功',
        captchaId,
        captchaImg: captcha.data,
        expiresAt,
      };
    } catch (error) {
      this.logger.error('生成验证码失败', error);
      throw new HttpException(
        {
          code: 1006,
          message: '生成验证码失败，请稍后再试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 验证图形验证码
  async verifyCaptcha(
    captchaId: string,
    captchaCode: string,
  ): Promise<boolean> {
    this.logger.log(
      `验证图形验证码 - 验证码ID: ${captchaId}, 用户输入: ${captchaCode}`,
    );

    // 查找验证码记录
    const captcha = await this.captchaModel
      .findOne({
        captchaId,
        expiresAt: { $gt: new Date() }, // 验证码未过期
      })
      .exec();

    this.logger.log(
      `验证码查询结果: ${captcha ? '找到验证码记录' : '未找到验证码记录或已过期'}`,
    );

    if (!captcha) {
      this.logger.warn(
        `验证失败: 验证码不存在或已过期 - 验证码ID: ${captchaId}`,
      );
      return false;
    }

    // 检查验证码是否已使用
    if (captcha.isUsed) {
      this.logger.warn(`验证失败: 验证码已被使用 - 验证码ID: ${captchaId}`);
      return false;
    }

    // 断言Captcha文档有text字段
    const captchaWithText = captcha as CaptchaDocumentWithText;
    if (!captchaWithText.text) {
      this.logger.warn(`验证失败: 验证码文本不存在 - 验证码ID: ${captchaId}`);
      return false;
    }

    // 进行不区分大小写的验证
    const isValid =
      captchaWithText.text.toLowerCase() === captchaCode.toLowerCase();

    this.logger.log(
      `验证码比对结果: ${isValid ? '匹配' : '不匹配'}, 预期值: ${captchaWithText.text.toLowerCase()}, 输入值: ${captchaCode.toLowerCase()}`,
    );

    if (isValid) {
      // 标记验证码已使用
      captcha.isUsed = true;
      await captcha.save();
      this.logger.log(`验证码已标记为已使用 - 验证码ID: ${captchaId}`);
    }

    return isValid;
  }

  // 注册用户
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    // 检查邮箱是否已存在
    const existingUserByEmail = await this.userModel
      .findOne({
        email: registerDto.email,
      })
      .exec();
    if (existingUserByEmail) {
      throw new ConflictException('邮箱已被注册');
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await this.userModel
      .findOne({
        username: registerDto.username,
      })
      .exec();
    if (existingUserByUsername) {
      throw new ConflictException('用户名已被占用');
    }

    // 检查手机号是否已存在 (如果手机号是必填且唯一的)
    // const existingUserByPhone = await this.userModel.findOne({ phone: registerDto.phone }).exec();
    // if (existingUserByPhone) {
    //   throw new ConflictException('手机号已被注册');
    // }

    // 对密码进行哈希加密
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.bcryptSaltRounds,
    );

    // 创建新用户文档
    const newUser = new this.userModel({
      email: registerDto.email,
      password: hashedPassword,
      username: registerDto.username,
      phone: registerDto.phone,
      // permission 字段使用默认值
      firstLogin: true, // 新注册用户标记为首次登录
    });

    // 保存用户到数据库
    const savedUser = await newUser.save();

    // 生成 JWT access token (Payload 不包含敏感信息)
    const payload = {
      sub: savedUser._id.toString(), // 用户 ID
      username: savedUser.username,
      permission: savedUser.permission,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: jwtConstants.accessTokenExpiresIn,
    });

    // 在注册成功后发送欢迎邮件
    await this.sendWelcomeEmail(savedUser);

    return {
      code: 0,
      message: '注册成功',
      userId: savedUser._id.toString(),
      accessToken: accessToken,
    };
  }

  // 登录
  async login(
    loginDto: LoginDto,
    response?: Response,
  ): Promise<LoginResponseDto> {
    try {
      this.logger.log(`开始登录流程 - 用户标识: ${loginDto.identifier}`);
      this.logger.log(`检查验证码 - 验证码ID: ${loginDto.captchaId}`);

      // 验证图形验证码
      const captchaVerified = await this.verifyCaptcha(
        loginDto.captchaId,
        loginDto.captchaCode,
      );

      this.logger.log(`验证码验证结果: ${captchaVerified ? '通过' : '失败'}`);

      if (!captchaVerified) {
        this.logger.warn(
          `登录失败: 验证码错误 - 用户标识: ${loginDto.identifier}, 验证码ID: ${loginDto.captchaId}`,
        );
        throw new UnauthorizedException('验证码错误或已失效');
      }

      // 查找用户
      this.logger.log(`查找用户 - 标识: ${loginDto.identifier}`);

      // MongoDB查询使用$or运算符，允许多字段匹配
      const user = await this.userModel
        .findOne({
          $or: [
            { username: loginDto.identifier }, // 使用用户名登录
            { email: loginDto.identifier }, // 使用邮箱登录
            { phone: loginDto.identifier }, // 使用手机号登录
          ],
        })
        .exec();

      this.logger.log(`用户查询结果: ${user ? '找到用户' : '未找到用户'}`);

      // 检查用户是否存在
      if (!user) {
        this.logger.warn(
          `登录失败: 用户不存在 - 用户标识: ${loginDto.identifier}`,
        );
        throw new UnauthorizedException('用户不存在或密码错误');
      }

      // 验证密码
      this.logger.log(`验证用户密码 - 用户ID: ${user._id}`);
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      this.logger.log(`密码验证结果: ${isPasswordValid ? '有效' : '无效'}`);

      if (!isPasswordValid) {
        this.logger.warn(
          `登录失败: 密码错误 - 用户标识: ${loginDto.identifier}`,
        );
        throw new UnauthorizedException('用户不存在或密码错误');
      }

      // 生成 JWT access token
      const payload = {
        sub: user._id.toString(),
        username: user.username,
        permission: user.permission,
      };

      this.logger.log(`为用户生成Token payload - ${JSON.stringify(payload)}`);

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: jwtConstants.accessTokenExpiresIn,
      });

      this.logger.log(`生成的access token: ${accessToken.substring(0, 20)}...`);

      let refreshToken: string | undefined;
      // 如果用户勾选了"记住我"，生成 refresh token 并设置 httpOnly cookie
      if (loginDto.remember && response) {
        this.logger.log(`用户启用了"记住我"功能，生成刷新令牌`);

        // 生成 refresh token (通常使用长生命周期)
        refreshToken = this.jwtService.sign(payload, {
          expiresIn: jwtConstants.refreshTokenExpiresIn,
        });

        // 将 refresh token 的 hash 存储到数据库中，用于校验和吊销
        const hashedRefreshToken = await bcrypt.hash(
          refreshToken,
          this.bcryptSaltRounds,
        );
        user.currentRefreshTokenHash = hashedRefreshToken;
        await user.save(); // 保存用户文档更新

        // 设置 httpOnly cookie
        response.cookie(jwtConstants.refreshTokenCookieName, refreshToken, {
          httpOnly: true, // 重要的安全设置，防止 XSS 攻击获取 cookie
          secure: process.env.NODE_ENV === 'production', // 只在生产环境使用 HTTPS 时发送 cookie
          maxAge: this.getTokenExpirationMilliseconds(
            jwtConstants.refreshTokenExpiresIn,
          ), // cookie 的过期时间
        });

        this.logger.log(
          `已设置刷新令牌Cookie, 过期时间: ${jwtConstants.refreshTokenExpiresIn}`,
        );
      }

      // 将用户文档转换为 DTO (不包含敏感信息如密码)
      // 使用类型断言 UserDocumentWithTimestamps 来访问可能的 createdAt 和 updatedAt
      const userObject = user.toObject() as UserDocumentWithTimestamps;

      const userDto: UserDto = {
        id: userObject._id.toString(),
        username: userObject.username,
        email: userObject.email,
        phone: userObject.phone,
        createdAt: userObject.createdAt, // 使用类型断言访问 createdAt
        updatedAt: userObject.updatedAt, // 使用类型断言访问 updatedAt
        permission: userObject.permission,
        firstLogin: userObject.firstLogin,
        // 根据 UserDto 的定义添加其他字段
      };

      this.logger.log(
        `登录成功 - 用户ID: ${userDto.id}, 用户名: ${userDto.username}, 返回用户信息: ${JSON.stringify(userDto)}`,
      );

      return {
        code: 0,
        message: '登录成功',
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: userDto,
      };
    } catch (error) {
      this.logger.error(`登录过程中发生异常: ${error.message}`, error.stack);
      throw error; // 继续抛出异常，让上层处理
    }
  }

  // 登出
  async logout(userId: string, response: Response): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (user) {
      // 清除数据库中的 refresh token hash
      user.currentRefreshTokenHash = undefined;
      await user.save();
    }

    // 清除客户端的 httpOnly cookie
    response.clearCookie(jwtConstants.refreshTokenCookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }

  // 忘记密码
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const { email } = forgotPasswordDto;

    // 查找用户
    const user = await this.userModel.findOne({ email }).exec();

    if (!user) {
      // 出于安全考虑，即使用户不存在也返回相同的消息
      return { success: true, message: '如果邮箱存在，将发送重置链接' };
    }

    // 生成重置token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30分钟后过期

    // 更新用户的重置token
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // 发送重置邮件
    const mailSent = await this.mailService.sendPasswordResetMail(
      email,
      resetToken,
      user.username,
    );

    if (!mailSent) {
      return { success: false, message: '邮件发送失败，请稍后重试' };
    }

    this.logger.log(`为用户 ${email} 发送了密码重置邮件`);
    return { success: true, message: '密码重置邮件已发送，请查收' };
  }

  // 重置密码
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const { email, token, newPassword } = resetPasswordDto;

    // 查找用户
    const user = await this.userModel
      .findOne({
        email,
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }, // token未过期
      })
      .exec();

    if (!user) {
      return { success: false, message: '重置链接无效或已过期' };
    }

    // 更新密码
    user.password = await bcrypt.hash(newPassword, this.bcryptSaltRounds);

    // 清除重置令牌
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // 吊销所有刷新令牌
    user.currentRefreshTokenHash = undefined;

    await user.save();

    // 发送密码已修改通知
    await this.mailService.sendNotificationMail(
      email,
      '密码已重置',
      `<p>您好 ${user.username}，</p><p>您的密码已成功重置。如果这不是您本人的操作，请立即联系我们的支持团队。</p>`,
    );

    this.logger.log(`用户 ${email} 成功重置了密码`);
    return { success: true, message: '密码重置成功，请使用新密码登录' };
  }

  // 刷新 Access Token
  async refreshToken(
    refreshToken: string,
    response?: Response,
  ): Promise<{ accessToken: string }> {
    try {
      // 验证 refresh token 的签名和过期时间
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtConstants.secret,
        // 刷新 token 的 secret 和过期时间可能与 access token 不同，根据实际配置调整
      });

      // 查找用户并验证数据库中存储的 refresh token hash
      const user = await this.userModel.findById(payload.sub).exec();
      if (!user || !user.currentRefreshTokenHash) {
        throw new UnauthorizedException('Refresh token 无效或用户不存在');
      }

      const isRefreshTokenMatch = await bcrypt.compare(
        refreshToken,
        user.currentRefreshTokenHash,
      );
      if (!isRefreshTokenMatch) {
        throw new UnauthorizedException('Refresh token 不匹配');
      }

      // 生成新的 access token
      const newAccessToken = this.jwtService.sign(
        {
          sub: user._id.toString(),
          username: user.username,
          permission: user.permission,
        },
        {
          expiresIn: jwtConstants.accessTokenExpiresIn,
        },
      );

      // 可选：实现 refresh token 滑动窗口，生成新的 refresh token 并更新数据库和 cookie
      // 例如：每使用一次 refresh token 就生成一个新的，旧的作废

      return { accessToken: newAccessToken };
    } catch (e) {
      console.error('Refresh Token Error:', e.message);
      // 清除可能存在的无效 refresh token cookie
      if (response) {
        response.clearCookie(jwtConstants.refreshTokenCookieName, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
      }
      throw new UnauthorizedException('Refresh token 无效或已过期');
    }
  }

  // 辅助函数：将 token 过期时间字符串转换为毫秒
  private getTokenExpirationMilliseconds(expiresIn: string): number {
    const value = parseInt(expiresIn);
    const unit = expiresIn.replace(/\d/g, '');

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        // 默认单位为秒
        return value * 1000;
    }
  }

  // 在注册成功后发送欢迎邮件
  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      await this.mailService.sendWelcomeMail(user.email, user.username);
      this.logger.log(`欢迎邮件发送成功: ${user.email}`);
      return;
    } catch (error) {
      this.logger.error(`欢迎邮件发送失败: ${error.message}`, error.stack);
      return;
    }
  }
}
