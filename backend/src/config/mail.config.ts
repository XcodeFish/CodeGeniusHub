import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  // SMTP服务器配置
  host: process.env.MAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: process.env.MAIL_SECURE === 'true', // true表示使用TLS
  auth: {
    user: process.env.MAIL_USER || 'user@example.com',
    pass: process.env.MAIL_PASSWORD || 'password',
  },
  // 默认发件人配置
  defaults: {
    from: `"${process.env.MAIL_FROM_NAME || 'CodeGeniusHub'}" <${
      process.env.MAIL_FROM_ADDRESS || 'noreply@example.com'
    }>`,
  },
  // 邮件模板配置
  template: {
    dir: __dirname + '/../modules/mail/templates',
    adapter: 'handlebars',
    options: {
      strict: true,
    },
  },
  // 国际化配置
  i18n: {
    defaultLocale: process.env.DEFAULT_LOCALE || 'zh-CN',
    fallbackLocale: 'en-US',
    supportedLocales: ['zh-CN', 'en-US'],
  },
  // 队列和限流配置
  queue: {
    enabled: process.env.MAIL_QUEUE_ENABLED === 'true',
    checkInterval: parseInt(
      process.env.MAIL_QUEUE_CHECK_INTERVAL || '60000',
      10,
    ), // 60秒
  },
  // 重试配置
  maxRetries: parseInt(process.env.MAIL_MAX_RETRIES || '3', 10),
  retryDelays: [60000, 300000, 1800000], // 默认重试间隔：1分钟, 5分钟, 30分钟

  // 限流配置
  rateLimit: {
    maxEmailsPerHour: parseInt(
      process.env.MAIL_RATE_LIMIT_PER_HOUR || '10',
      10,
    ),
    windowMs: parseInt(process.env.MAIL_RATE_WINDOW_MS || '3600000', 10), // 默认1小时窗口
  },

  // 安全配置
  security: {
    tokenExpiryMinutes: parseInt(
      process.env.MAIL_TOKEN_EXPIRY_MINUTES || '30',
      10,
    ),
    passwordResetSignSecret:
      process.env.PASSWORD_RESET_SECRET || 'your-secret-key',
  },
}));
