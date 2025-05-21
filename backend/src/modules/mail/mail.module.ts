import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { MailService } from './mail.service';
import { MailQueueService } from './mail-queue.service';
import { MailI18nService } from './mail-i18n.service';
import { MailSecurityUtil } from './mail-security.util';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // 导入定时任务模块，用于邮件队列处理
    ScheduleModule.forRoot(),
    // 导入邮件模块
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('mail.host'),
          port: config.get('mail.port'),
          secure: config.get('mail.secure'),
          auth: {
            user: config.get('mail.auth.user'),
            pass: config.get('mail.auth.pass'),
          },
        },
        defaults: {
          from: config.get('mail.defaults.from'),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService, MailQueueService, MailI18nService, MailSecurityUtil],
  exports: [MailService, MailQueueService, MailI18nService, MailSecurityUtil],
})
export class MailModule {}
