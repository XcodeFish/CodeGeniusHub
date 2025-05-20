import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser'; // 引入 cookie-parser
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 获取配置服务
  const configService = app.get(ConfigService);
  // 从配置中获取应用端口，提供默认值 9000
  const port = configService.get<number>('app.port', 9000);

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 移除未在DTO中定义的属性
      forbidNonWhitelisted: true, // 如果请求包含未在DTO中定义的属性，则报错
      transform: true, // 自动转换基本类型
    }),
  );

  // 使用 cookie-parser 中间件
  app.use(cookieParser());

  // 启用CORS
  app.enableCors();

  // 设置Swagger
  const options = new DocumentBuilder()
    .setTitle('AI智能代码生成与协作平台')
    .setDescription('API Documentation for CodeGeniusHub')
    .setVersion('1.0')
    .addBearerAuth() // 如果使用JWT认证，添加Bearer认证
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(port);
  const url = await app.getUrl();
  console.log(`Application is running on: ${url}`);
  console.log(`Swagger API documentation available at: ${url}/api-docs`);
}
bootstrap();
