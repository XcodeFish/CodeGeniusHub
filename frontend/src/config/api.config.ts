const API_CONFIG = {
  // 开发环境API地址 - 使用相对路径，由Next.js代理转发到后端9000端口
  // 这样浏览器请求会发送到Next.js服务器（通常是3000端口），然后由Next.js转发到9000端口
  development: '/api',
  // 测试环境API地址
  test: 'https://test-api.codegeniushub.com/api',
  // 生产环境API地址
  production: 'https://api.codegeniushub.com/api',
};

// 根据当前环境获取API基础URL
export const getBaseUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  return API_CONFIG[env];
};

export default {
  baseUrl: getBaseUrl(),
  timeout: 10000, // 请求超时时间
};