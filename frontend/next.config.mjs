/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['antd'],
  sassOptions: {
    includePaths: ['./src/styles'],
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