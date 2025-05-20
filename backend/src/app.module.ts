import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { MongooseModule } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig],
      isGlobal: true, // 使配置模块在整个应用中可用
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = configService.get('database');

        // 构建连接URI，优先使用 uri，否则使用分开的配置
        const uri =
          dbConfig.uri ||
          (dbConfig.username && dbConfig.password
            ? `mongodb://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.dbName}`
            : `mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.dbName}`);

        // 添加数据库连接日志
        mongoose.connection.on('connected', () => {
          console.log('MongoDB 连接成功');
        });
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB 连接错误:', err);
        });
        mongoose.connection.on('disconnected', () => {
          console.log('MongoDB 已断开连接');
        });

        console.log(`尝试连接到 MongoDB: ${uri}`);

        try {
          // 尝试建立连接，并等待结果
          await mongoose.connect(uri, {
            // 其他Mongoose连接选项可以在这里添加
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
          });
          console.log('MongoDB 连接成功');
        } catch (err) {
          console.error('MongoDB 连接失败:', err);
          // 根据需要，你可能希望在这里抛出错误或采取其他措施
          // throw err;
        }

        return {
          uri: uri,
          // 其他Mongoose连接选项可以在这里添加
          // useNewUrlParser: true,
          // useUnifiedTopology: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
