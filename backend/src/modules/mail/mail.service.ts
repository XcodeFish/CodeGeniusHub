import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailQueueService } from './mail-queue.service';
import { MailI18nService, Locale } from './mail-i18n.service';
import { MailSecurityUtil } from './mail-security.util';
import * as crypto from 'crypto';

/**
 * 邮件服务接口，定义发送邮件的方法
 */
export interface IMailService {
  /**
   * 发送密码重置邮件
   * @param to 接收邮箱
   * @param resetToken 重置Token
   * @param username 用户名
   * @param locale 语言
   * @param resetLink 重置链接
   */
  sendPasswordResetMail(
    to: string,
    resetToken: string,
    username: string,
    locale?: Locale,
    resetLink?: string,
  ): Promise<boolean>;

  /**
   * 发送欢迎邮件
   * @param to 接收邮箱
   * @param username 用户名
   * @param locale 语言
   */
  sendWelcomeMail(
    to: string,
    username: string,
    locale?: Locale,
  ): Promise<boolean>;

  /**
   * 发送验证码邮件
   * @param to 接收邮箱
   * @param username 用户名
   * @param expiresInMinutes 过期时间（分钟）
   * @param locale 语言
   * @returns {Promise<{success: boolean; code?: string}>} 发送结果和验证码
   */
  sendVerificationCodeMail(
    to: string,
    username: string,
    expiresInMinutes?: number,
    locale?: Locale,
  ): Promise<{ success: boolean; code?: string }>;

  /**
   * 发送通知邮件
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param content 邮件内容
   * @param locale 语言
   */
  sendNotificationMail(
    to: string,
    subject: string,
    content: string,
    locale?: Locale,
  ): Promise<boolean>;

  /**
   * 发送自定义模板邮件
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param template 模板名称
   * @param context 模板上下文
   * @param locale 语言
   */
  sendTemplateMail(
    to: string,
    subject: string,
    template: string,
    context: any,
    locale?: Locale,
  ): Promise<boolean>;
}

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name);
  private readonly clientUrl: string;
  private readonly useQueue: boolean;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly mailQueueService: MailQueueService,
    private readonly i18nService: MailI18nService,
    private readonly securityUtil: MailSecurityUtil,
  ) {
    this.clientUrl =
      configService.get<string>('CLIENT_URL') || 'http://localhost:3000';
    this.useQueue = configService.get<boolean>('mail.queue.enabled') || false;
  }

  /**
   * 生成随机验证码
   * @param length 验证码长度
   * @returns 生成的验证码
   */
  private generateVerificationCode(length: number = 6): string {
    // 只使用数字，避免混淆字符
    const chars = '0123456789';
    let code = '';

    // 使用加密随机数生成器
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      // 将随机字节映射到字符集
      const index = randomBytes[i] % chars.length;
      code += chars[index];
    }

    return code;
  }

  /**
   * 发送邮件的核心方法
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param template 模板名称
   * @param context 模板上下文
   * @param locale 语言
   */
  private async sendMail(
    to: string,
    subject: string,
    template: string,
    context: any,
    locale?: Locale,
  ): Promise<boolean> {
    // 验证邮箱格式
    if (!this.isValidEmail(to)) {
      this.logger.error(`无效的邮箱地址: ${to}`);
      return false;
    }

    // 获取本地化的模板和主题
    const localizedTemplate = this.i18nService.getLocalizedTemplate(
      template,
      locale,
    );

    // 添加年份到上下文，用于模板页脚
    const extendedContext = {
      ...context,
      year: new Date().getFullYear(),
    };

    try {
      // 如果启用队列，则添加到队列中
      if (this.useQueue) {
        return await this.mailQueueService.addToQueue(
          to,
          subject,
          localizedTemplate,
          extendedContext,
        );
      }

      // 否则直接发送
      await this.mailerService.sendMail({
        to,
        subject,
        template: localizedTemplate,
        context: extendedContext,
      });

      this.logger.log(`邮件发送成功: ${to}, 模板: ${template}`);
      return true;
    } catch (error) {
      this.logger.error(`邮件发送失败: ${to}, 模板: ${template}`, error.stack);
      return false;
    }
  }

  /**
   * 验证邮箱格式是否有效
   * @param email 待验证的邮箱
   * @returns 是否有效
   */
  private isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * 发送密码重置邮件
   * @param to 接收邮箱
   * @param resetToken 重置Token
   * @param username 用户名
   * @param locale 语言
   * @param resetLink 重置链接，如不提供则自动生成
   */
  async sendPasswordResetMail(
    to: string,
    resetToken: string,
    username: string,
    locale?: Locale,
    resetLink?: string,
  ): Promise<boolean> {
    // 使用安全工具生成带签名的安全链接
    const link =
      resetLink ||
      this.securityUtil.generateSecureResetUrl(to, resetToken, this.clientUrl);

    // 设置过期时间
    const expiryMinutes =
      this.configService.get<number>('mail.security.tokenExpiryMinutes') || 30;
    const expiresIn = this.i18nService.getText('mail.expiresIn', locale, [
      expiryMinutes.toString(),
    ]);

    // 邮件主题
    const subject = this.i18nService.getSubject(
      'mail.subject.resetPassword',
      locale,
    );

    return await this.sendMail(
      to,
      subject,
      'reset-password',
      {
        username: this.securityUtil.escapeHtml(username),
        resetLink: link,
        expiresIn,
      },
      locale,
    );
  }

  /**
   * 发送欢迎邮件
   * @param to 接收邮箱
   * @param username 用户名
   * @param locale 语言
   */
  async sendWelcomeMail(
    to: string,
    username: string,
    locale?: Locale,
  ): Promise<boolean> {
    // 邮件主题
    const subject = this.i18nService.getSubject('mail.subject.welcome', locale);

    return await this.sendMail(
      to,
      subject,
      'welcome',
      {
        username: this.securityUtil.escapeHtml(username),
        loginLink: `${this.clientUrl}/auth/login`,
      },
      locale,
    );
  }

  /**
   * 发送验证码邮件，自动生成验证码
   * @param to 接收邮箱
   * @param username 用户名
   * @param expiresInMinutes 过期时间（分钟）
   * @param locale 语言
   * @returns {Promise<{success: boolean; code?: string}>} 发送结果和验证码
   */
  async sendVerificationCodeMail(
    to: string,
    username: string,
    expiresInMinutes: number = 5,
    locale?: Locale,
  ): Promise<{ success: boolean; code?: string }> {
    // 生成6位数验证码
    const code = this.generateVerificationCode(6);

    // 过期时间文本
    const expiresIn = this.i18nService.getText('mail.expiresIn', locale, [
      expiresInMinutes.toString(),
    ]);

    // 邮件主题
    const subject = this.i18nService.getSubject(
      'mail.subject.verificationCode',
      locale,
    );

    const success = await this.sendMail(
      to,
      subject,
      'verification-code',
      {
        username: this.securityUtil.escapeHtml(username),
        code,
        expiresIn,
      },
      locale,
    );

    return {
      success,
      code: success ? code : undefined, // 仅在成功时返回验证码
    };
  }

  /**
   * 发送通知邮件
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param content 邮件内容
   * @param locale 语言
   */
  async sendNotificationMail(
    to: string,
    subject: string,
    content: string,
    locale?: Locale,
  ): Promise<boolean> {
    // 转义用户提供的HTML内容，防止XSS攻击
    const safeContent = this.securityUtil.escapeHtml(content);

    return await this.sendMail(
      to,
      `【CodeGeniusHub】${subject}`,
      'notification',
      {
        content: safeContent,
      },
      locale,
    );
  }

  /**
   * 发送自定义模板邮件
   * @param to 接收邮箱
   * @param subject 邮件主题
   * @param template 模板名称
   * @param context 模板上下文
   * @param locale 语言
   */
  async sendTemplateMail(
    to: string,
    subject: string,
    template: string,
    context: any,
    locale?: Locale,
  ): Promise<boolean> {
    // 处理上下文中可能包含的HTML内容
    const safeContext = { ...context };

    // 递归处理上下文中的所有字符串值
    const sanitizeObject = (obj: any): any => {
      if (!obj) return obj;

      if (typeof obj === 'string') {
        return this.securityUtil.escapeHtml(obj);
      }

      if (typeof obj === 'object') {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            obj[key] = sanitizeObject(obj[key]);
          }
        }
      }

      return obj;
    };

    sanitizeObject(safeContext);

    return await this.sendMail(
      to,
      `【CodeGeniusHub】${subject}`,
      template,
      safeContext,
      locale,
    );
  }

  /**
   * 获取邮件队列状态
   * @returns 队列状态信息
   */
  getQueueStatus() {
    return this.mailQueueService.getQueueStats();
  }
}
