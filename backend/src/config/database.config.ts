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

  // 连接配置选项
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // 连接超时配置
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000', 10),
    // 服务器选择超时
    serverSelectionTimeoutMS: parseInt(
      process.env.DB_SELECTION_TIMEOUT || '10000',
      10,
    ),
    // 心跳包频率
    heartbeatFrequencyMS: parseInt(
      process.env.DB_HEARTBEAT_FREQUENCY || '10000',
      10,
    ),
    // 连接池配置
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10),
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '2', 10),
    // 读写重试
    retryWrites: true,
    retryReads: true,
  },
}));
