/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['antd'],
  sassOptions: {
    includePaths: ['./src/styles'],
  },
  // 禁用webpack5某些功能以解决HMR问题
  webpack: (config, { isServer }) => {
    // 修复HMR问题
    if (!isServer) {
      config.optimization.runtimeChunk = 'single';
    }
    return config;
  },
  // 解决HMR相关的WebSocket错误
  onDemandEntries: {
    // 保持页面在内存中的时间更长
    maxInactiveAge: 25 * 1000,
    // 同时保持的页面数量
    pagesBufferLength: 5,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',  // 配置后端API代理
      },
    ];
  },
};

export default nextConfig; 