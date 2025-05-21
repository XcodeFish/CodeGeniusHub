import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type Locale = 'zh-CN' | 'en-US';

// 多语言模板对应关系
interface TemplateMap {
  [key: string]: {
    [locale in Locale]?: string;
  };
}

// 多语言文本映射
interface I18nTexts {
  [key: string]: {
    [locale in Locale]: string;
  };
}

@Injectable()
export class MailI18nService {
  private readonly defaultLocale: Locale;
  private readonly fallbackLocale: Locale;
  private readonly supportedLocales: Locale[];

  // 邮件模板映射
  private readonly templateMap: TemplateMap = {
    'reset-password': {
      'zh-CN': 'reset-password',
      'en-US': 'reset-password-en',
    },
    welcome: {
      'zh-CN': 'welcome',
      'en-US': 'welcome-en',
    },
    'verification-code': {
      'zh-CN': 'verification-code',
      'en-US': 'verification-code-en',
    },
    notification: {
      'zh-CN': 'notification',
      'en-US': 'notification-en',
    },
  };

  // 多语言文本
  private readonly texts: I18nTexts = {
    'mail.subject.resetPassword': {
      'zh-CN': '【CodeGeniusHub】密码重置',
      'en-US': '[CodeGeniusHub] Password Reset',
    },
    'mail.subject.welcome': {
      'zh-CN': '【CodeGeniusHub】欢迎加入',
      'en-US': '[CodeGeniusHub] Welcome to CodeGeniusHub',
    },
    'mail.subject.verificationCode': {
      'zh-CN': '【CodeGeniusHub】验证码',
      'en-US': '[CodeGeniusHub] Verification Code',
    },
    'mail.expiresIn': {
      'zh-CN': '{0}分钟',
      'en-US': '{0} minutes',
    },
    'mail.passwordChanged': {
      'zh-CN':
        '您的密码已成功重置。如果这不是您本人的操作，请立即联系我们的支持团队。',
      'en-US':
        'Your password has been successfully reset. If you did not perform this action, please contact our support team immediately.',
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.defaultLocale =
      this.configService.get<Locale>('mail.i18n.defaultLocale') || 'zh-CN';
    this.fallbackLocale =
      this.configService.get<Locale>('mail.i18n.fallbackLocale') || 'en-US';
    this.supportedLocales = this.configService.get<Locale[]>(
      'mail.i18n.supportedLocales',
    ) || ['zh-CN', 'en-US'];
  }

  /**
   * 获取用户所需语言的邮件模板
   * @param templateName 模板名称
   * @param locale 语言代码
   * @returns 本地化后的模板名称
   */
  getLocalizedTemplate(templateName: string, locale?: Locale): string {
    const userLocale = this.normalizeLocale(locale);

    // 查找对应语言的模板
    if (this.templateMap[templateName]?.[userLocale]) {
      return this.templateMap[templateName][userLocale];
    }

    // 找不到对应语言，使用默认模板
    return templateName;
  }

  /**
   * 获取本地化文本
   * @param key 文本键
   * @param locale 语言代码
   * @param params 替换参数
   * @returns 本地化文本
   */
  getText(key: string, locale?: Locale, params?: string[]): string {
    const userLocale = this.normalizeLocale(locale);

    // 获取文本，如果不存在则尝试使用备选语言
    let text =
      this.texts[key]?.[userLocale] ||
      this.texts[key]?.[this.fallbackLocale] ||
      key;

    // 替换参数 {0}, {1}, {2}...
    if (params && params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        text = text.replace(`{${i}}`, params[i]);
      }
    }

    return text;
  }

  /**
   * 获取本地化的邮件主题
   * @param key 主题键
   * @param locale 语言代码
   * @param params 替换参数
   * @returns 本地化邮件主题
   */
  getSubject(key: string, locale?: Locale, params?: string[]): string {
    return this.getText(key, locale, params);
  }

  /**
   * 规范化语言代码，确保获取到支持的语言
   * @param locale 语言代码
   * @returns 规范化后的语言代码
   */
  private normalizeLocale(locale?: Locale): Locale {
    if (!locale || !this.supportedLocales.includes(locale)) {
      return this.defaultLocale;
    }
    return locale;
  }
}
