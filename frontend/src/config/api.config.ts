
const API_CONFIG = {
  // 开发环境API地址
  development: 'http://localhost:9000/api',
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