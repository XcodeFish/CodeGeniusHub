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
}));
