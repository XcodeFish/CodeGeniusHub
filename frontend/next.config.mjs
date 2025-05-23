/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
        // 确保代理到后端9000端口，不要在路径中重复/api前缀
        destination: 'http://localhost:9000/api/:path*',
      },
    ];
  },
  // 设置响应头，解决跨域问题
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig; 