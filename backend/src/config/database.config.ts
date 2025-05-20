import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // 数据库连接URI (如果使用URI)
  uri: process.env.MONGODB_URI,
  // 或者分开配置主机、端口、用户、密码、数据库名
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '27017', 10), // MongoDB默认端口
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  dbName: process.env.DATABASE_NAME,
  // 其他数据库特定配置...
}));
