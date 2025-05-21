import type { AppProps } from 'next/app';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/modules/auth/useAuth';
import '@/styles/globals.scss';

// 不需要登录就能访问的页面
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password'];

// 配置Antd主题
const themeConfig = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 4,
  },
  algorithm: theme.defaultAlgorithm,
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { token } = useUserStore();
  const { autoLogin } = useAuth();

  // 自动登录检查
  useEffect(() => {
    autoLogin();
  }, []);
  
  // 路由权限控制
  useEffect(() => {
    const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
    
    // 如果没有token并且不在公开页面，重定向到登录页
    if (!token && !isPublicRoute) {
      router.push('/login');
    }
  }, [router.pathname, token]);

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <Component {...pageProps} />
    </ConfigProvider>
  );
} 