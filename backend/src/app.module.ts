import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { MongooseModule } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig],
      isGlobal: true, // 使配置模块在整个应用中可用
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
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

    // 公共模块
    CommonModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
