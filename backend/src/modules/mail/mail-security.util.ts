import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MailSecurityUtil {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('mail.security.passwordResetSignSecret') ||
      'default-secret-key';
  }

  /**
   * 为密码重置链接生成签名
   * @param email 用户邮箱
   * @param token 重置令牌
   * @param timestamp 时间戳
   * @returns 生成的签名
   */
  generateSignature(email: string, token: string, timestamp: number): string {
    const data = `${email}:${token}:${timestamp}`;
    return crypto.createHmac('sha256', this.secret).update(data).digest('hex');
  }

  /**
   * 验证密码重置链接签名
   * @param email 用户邮箱
   * @param token 重置令牌
   * @param timestamp 时间戳
   * @param signature 待验证的签名
   * @returns 签名是否有效
   */
  verifySignature(
    email: string,
    token: string,
    timestamp: number,
    signature: string,
  ): boolean {
    const expectedSignature = this.generateSignature(email, token, timestamp);
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  }

  /**
   * 生成安全的密码重置URL
   * @param email 用户邮箱
   * @param token 重置令牌
   * @param baseUrl 基础URL
   * @returns 带签名的安全URL
   */
  generateSecureResetUrl(
    email: string,
    token: string,
    baseUrl: string,
  ): string {
    const timestamp = Date.now();
    const signature = this.generateSignature(email, token, timestamp);

    return `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&timestamp=${timestamp}&signature=${signature}`;
  }

  /**
   * 验证密码重置URL参数
   * @param email 用户邮箱
   * @param token 重置令牌
   * @param timestamp 时间戳
   * @param signature 签名
   * @returns 验证结果
   */
  verifyResetParams(
    email: string,
    token: string,
    timestamp: number,
    signature: string,
  ): { valid: boolean; reason?: string } {
    // 检查时间戳是否过期（默认30分钟）
    const expiryMinutes =
      this.configService.get<number>('mail.security.tokenExpiryMinutes') || 30;
    const expiryMs = expiryMinutes * 60 * 1000;

    if (Date.now() - timestamp > expiryMs) {
      return { valid: false, reason: 'EXPIRED' };
    }

    // 验证签名
    try {
      const isValid = this.verifySignature(email, token, timestamp, signature);
      return {
        valid: isValid,
        reason: isValid ? undefined : 'INVALID_SIGNATURE',
      };
    } catch (error) {
      return { valid: false, reason: 'VERIFICATION_ERROR' };
    }
  }

  /**
   * 转义HTML内容，防止XSS攻击
   * @param content 原始内容
   * @returns 转义后的内容
   */
  escapeHtml(content: string): string {
    if (!content) return '';

    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
