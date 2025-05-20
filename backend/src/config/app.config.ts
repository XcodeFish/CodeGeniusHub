import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // 应用端口
  port: parseInt(process.env.PORT || '9000', 10),
  // 环境 (development, production, test)
  env: process.env.NODE_ENV || 'development',
  // 其他应用相关配置...
}));
