import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

/**
 * 邮件服务接口，定义发送邮件的方法
 */
export interface IMailService {
  /**
   * 发送密码重置邮件
   * @param to 接收邮箱
   * @param resetToken 重置Token
   * @param username 用户名
   * @param resetLink 重置链接
   */
  sendPasswordResetMail(
    to: string,
    resetToken: string,
    username: string,
    resetLink?: string,
  ): Promise<boolean>;

  /**
   * 发送欢迎邮件
   * @param to 接收邮箱
   * @param username 用户名
   */
  sendWelcomeMail(to: string, username: string): Promise<boolean>;

  /**
   * 发送验证码邮件
   * @param to 接收邮箱
   * @param code 验证码
   * @param username 用户名
   * @param expiresIn 过期时间（分钟）
   */
  sendVerificationCodeMail(
    to: string,
    code: string,
    username: string,
    expiresIn: number,
  ): Promise<boolean>;

  /**
   * 发送通知邮件
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param content 邮件内容
   */
  sendNotificationMail(
    to: string,
    subject: string,
    content: string,
  ): Promise<boolean>;

  /**
   * 发送自定义模板邮件
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param template 模板名称
   * @param context 模板上下文
   */
  sendTemplateMail(
    to: string,
    subject: string,
    template: string,
    context: any,
  ): Promise<boolean>;
}

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name);
  private readonly clientUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.clientUrl =
      configService.get<string>('CLIENT_URL') || 'http://localhost:3000';
  }

  /**
   * 发送密码重置邮件
   * @param to 接收邮箱
   * @param resetToken 重置Token
   * @param username 用户名
   * @param resetLink 重置链接，如不提供则自动生成
   */
  async sendPasswordResetMail(
    to: string,
    resetToken: string,
    username: string,
    resetLink?: string,
  ): Promise<boolean> {
    const link =
      resetLink ||
      `${this.clientUrl}/auth/reset-password?token=${resetToken}&email=${to}`;

    try {
      await this.mailerService.sendMail({
        to,
        subject: '【CodeGeniusHub】密码重置',
        template: 'reset-password',
        context: {
          username,
          resetLink: link,
          expiresIn: '30分钟', // 默认过期时间
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`密码重置邮件发送成功: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`密码重置邮件发送失败: ${to}`, error.stack);
      return false;
    }
  }

  /**
   * 发送欢迎邮件
   * @param to 接收邮箱
   * @param username 用户名
   */
  async sendWelcomeMail(to: string, username: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: '【CodeGeniusHub】欢迎加入',
        template: 'welcome',
        context: {
          username,
          loginLink: `${this.clientUrl}/auth/login`,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`欢迎邮件发送成功: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`欢迎邮件发送失败: ${to}`, error.stack);
      return false;
    }
  }

  /**
   * 发送验证码邮件
   * @param to 接收邮箱
   * @param code 验证码
   * @param username 用户名
   * @param expiresIn 过期时间（分钟）
   */
  async sendVerificationCodeMail(
    to: string,
    code: string,
    username: string,
    expiresIn: number = 5,
  ): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: '【CodeGeniusHub】验证码',
        template: 'verification-code',
        context: {
          username,
          code,
          expiresIn: `${expiresIn}分钟`,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`验证码邮件发送成功: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`验证码邮件发送失败: ${to}`, error.stack);
      return false;
    }
  }

  /**
   * 发送通知邮件
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param content 邮件内容
   */
  async sendNotificationMail(
    to: string,
    subject: string,
    content: string,
  ): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `【CodeGeniusHub】${subject}`,
        template: 'notification',
        context: {
          content,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`通知邮件发送成功: ${to}, 主题: ${subject}`);
      return true;
    } catch (error) {
      this.logger.error(
        `通知邮件发送失败: ${to}, 主题: ${subject}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 发送自定义模板邮件
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param template 模板名称
   * @param context 模板上下文
   */
  async sendTemplateMail(
    to: string,
    subject: string,
    template: string,
    context: any,
  ): Promise<boolean> {
    try {
      // 添加年份到上下文，用于模板页脚
      const extendedContext = {
        ...context,
        year: new Date().getFullYear(),
      };

      await this.mailerService.sendMail({
        to,
        subject: `【CodeGeniusHub】${subject}`,
        template,
        context: extendedContext,
      });
      this.logger.log(`模板邮件发送成功: ${to}, 模板: ${template}`);
      return true;
    } catch (error) {
      this.logger.error(
        `模板邮件发送失败: ${to}, 模板: ${template}`,
        error.stack,
      );
      return false;
    }
  }
}
