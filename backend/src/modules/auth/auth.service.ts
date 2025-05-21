import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, HydratedDocument } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from '@/modules/user/schemas/user.schema';
import { Captcha, CaptchaDocument } from '@/shared/schemas/captcha.schema';
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
import { jwtConstants } from '@/modules/common/constants/constants';
import * as uuid from 'uuid';
import * as bcrypt from 'bcryptjs'; // 引入 bcrypt
import { Response } from 'express'; // 引入 Response 类型 (用于设置 cookie)
import * as svgCaptcha from 'svg-captcha';

// 定义一个接口来扩展 UserDocument，包含时间戳字段
interface UserDocumentWithTimestamps extends UserDocument {
  createdAt?: Date;
  updatedAt?: Date;
}

// 定义一个接口来扩展 CaptchaDocument，包含 text 字段
interface CaptchaDocumentWithText extends CaptchaDocument {
  text: string; // 明确定义 text 字段
}

//TODO:模拟邮件服务
class MockEmailService {
  async sendForgotPasswordEmail(email: string, code: string): Promise<void> {
    console.log(`--- Mock Mail Service ---`);
    console.log(`Sending password reset code to: ${email}`);
    console.log(`Reset Code: ${code}`);
    console.log(`-------------------------`);
    // 在实际应用中，这里使用 nodemailer 等库发送真实的邮件
  }
}

@Injectable()
export class AuthService {
  private readonly emailService = new MockEmailService(); //实例化模拟邮件服务
  private readonly bcryptSaltRounds = 10; // 定义 bcrypt 的 salt rounds

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Captcha.name) private captchaModel: Model<CaptchaDocument>,
    private jwtService: JwtService,
  ) {}

  // 获取图形验证码
  async generateCaptcha(): Promise<CaptchaResponseDto> {
    const { text, data } = svgCaptcha.create({ size: 4, noise: 2 });
    const captchaId = uuid.v4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效期
    console.log('text', text);
    const newCaptcha = new this.captchaModel({
      captchaId,
      text: text,
      expiresAt,
    });
    await newCaptcha.save();

    return {
      code: 0,
      message: '获取验证码成功',
      captchaId,
      captchaImg: data,
      expiresAt,
    };
  }

  // 验证图形验证码
  async verifyCaptcha(
    captchaId: string,
    captchaCode: string,
  ): Promise<boolean> {
    const captcha = (await this.captchaModel
      .findOne({
        captchaId,
        expiresAt: { $gt: new Date() }, // 检查是否过期
      })
      .exec()) as CaptchaDocumentWithText;

    if (!captcha) {
      return false; // 验证码不存在或已过期
    }

    // 验证成功后删除验证码，防止重复使用
    await this.captchaModel.deleteOne({ captchaId }).exec();

    return captcha.text.toUpperCase() === captchaCode.toUpperCase();
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
    const isCaptchaValid = await this.verifyCaptcha(
      loginDto.captchaId,
      loginDto.captchaCode,
    );

    if (!isCaptchaValid) {
      throw new BadRequestException('图形验证码错误或已失效');
    }

    // 根据标识查找用户（支持邮箱/用户名/手机号）
    const user = await this.userModel
      .findOne({
        $or: [
          { email: loginDto.identifier },
          { username: loginDto.identifier },
          { phone: loginDto.identifier },
        ],
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException('用户不存在或密码错误');
    }

    // 校验密码
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户不存在或密码错误');
    }

    // 生成 JWT access token
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      permission: user.permission,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: jwtConstants.accessTokenExpiresIn,
    });

    let refreshToken: string | undefined;
    // 如果用户勾选了"记住我"，生成 refresh token 并设置 httpOnly cookie
    if (loginDto.remember && response) {
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

    return {
      code: 0,
      message: '登录成功',
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: userDto,
    };
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

  //  忘记密码
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.userModel
      .findOne({
        email: forgotPasswordDto.email,
      })
      .exec();

    if (!user) {
      throw new NotFoundException('邮箱未注册');
    }

    // 生成 6位 随机验证码
    const verifyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3分钟有效期

    // 将验证码和过期时间存入用户文档
    user.forgotPasswordCode = verifyCode;
    user.forgotPasswordCodeExpires = expiresAt;
    await user.save();

    // TODO:通过邮件服务发送验证码 (实际需要实现邮件发送逻辑)
    // await this.emailService.sendForgotPasswordEmail(user.email, verifyCode);

    console.log(`忘记密码验证码 for ${user.email}: ${verifyCode}`); // 临时打印验证码方便测试
  }

  //  重置密码
  async restPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = (await this.userModel
      .findOne({
        email: resetPasswordDto.email,
      })
      .exec()) as UserDocumentWithTimestamps;

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 校验验证码和过期时间
    if (
      !user.forgotPasswordCode ||
      user.forgotPasswordCodeExpires === undefined ||
      user.forgotPasswordCodeExpires < new Date() ||
      user.forgotPasswordCode !== resetPasswordDto.verifyCode.toUpperCase()
    ) {
      // 清除错误的或过期的验证码信息（可选，为了安全）
      user.forgotPasswordCode = undefined;
      user.forgotPasswordCodeExpires = undefined;
      await user.save();
      throw new BadRequestException('验证码错误或已失效');
    }

    //  更新密码（pre-hook 会自动加密）
    user.password = resetPasswordDto.password;

    //  清除验证码信息
    user.forgotPasswordCode = undefined;
    user.forgotPasswordCodeExpires = undefined;

    await user.save();
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
}
