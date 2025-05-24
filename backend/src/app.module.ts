import { Module, MiddlewareConsumer, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import mailConfig from './config/mail.config';
import { MongooseModule } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CacheModule } from '@nestjs/cache-manager';

// =============中间件=============
import { LoggerMiddleware } from './common/middleware/logger.middleware';

// =============业务模块=============
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProjectModule } from './modules/project/project.module';
import { CommonModule } from './common/common.module';
import { FileModule } from './modules/file/file.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { AiModule } from './modules/ai/ai.module';
import { MailModule } from './modules/mail/mail.module';
import { MenuModule } from './modules/menu/menu.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig, mailConfig],
      isGlobal: true, // 使配置模块在整个应用中可用
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // 从配置中获取MongoDB URI和选项
        const uri = configService.get<string>('database.uri');
        const options = configService.get<any>('database.options');

        // 返回最终的连接配置
        return {
          uri,
          ...options,
        };
      },
    }),
    // 添加缓存模块
    CacheModule.register({
      isGlobal: true,
      ttl: 1800, // 默认缓存时间30分钟
    }),

    // 权限模块
    AuthModule,

    // 用户模块
    UserModule,

    // 项目模块
    ProjectModule,

    // 文件模块
    FileModule,

    // 协作模块
    CollaborationModule,

    // AI模块
    AiModule,

    // 邮件模块
    MailModule,

    // 通知模块
    NotificationModule,

    // 公共模块
    CommonModule,

    // 菜单模块
    MenuModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // 监听MongoDB连接事件
    this.connection.on('connected', () => {
      console.log('MongoDB连接成功');
    });

    this.connection.on('disconnected', () => {
      console.log('MongoDB连接断开');
    });

    this.connection.on('error', (error) => {
      console.error('MongoDB连接错误:', error);
      // 尝试重新连接（如果不是在已知连接状态）
      if (this.connection.readyState !== 1) {
        // 1 = connected
        this.checkConnection();
      }
    });

    // 定期健康检查
    this.scheduleConnectionHealthCheck();

    // 只保留调试模式设置
    if (this.configService.get('NODE_ENV') !== 'production') {
      mongoose.set('debug', true);
    }
  }

  /**
   * 定期检查数据库连接状态
   * @private
   */
  private scheduleConnectionHealthCheck() {
    // 每30秒检查一次连接状态
    setInterval(() => {
      this.checkConnection();
    }, 30000);
  }

  /**
   * 检查数据库连接并尝试重连
   * @private
   */
  private async checkConnection() {
    try {
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      if (this.connection.readyState !== 1) {
        console.log(
          `MongoDB连接状态: ${this.connection.readyState}, 尝试重连...`,
        );

        // 使用ping命令检查连接
        // 先检查db是否存在
        if (this.connection.db) {
          await this.connection.db.admin().ping();
          console.log('MongoDB连接恢复正常');
        } else {
          console.log('MongoDB连接未就绪，稍后将重试');
        }
      }
    } catch (error) {
      console.error('MongoDB连接检查失败:', error);
      // 连接出错时的额外处理可以在这里添加
      // 比如通知服务管理员、触发告警等
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
