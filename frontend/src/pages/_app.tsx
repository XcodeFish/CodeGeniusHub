import type { AppProps } from 'next/app';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
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
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  // 只在组件挂载时执行自动登录
  useEffect(() => {
    // 避免重复执行自动登录
    if (autoLoginAttempted) return;
    
    const attemptAutoLogin = async () => {
      try {
        console.log('尝试自动登录...');
        const success = await autoLogin();
        console.log('自动登录结果:', success ? '成功' : '失败');
      } catch (error) {
        console.error('自动登录出错:', error);
      } finally {
        setAutoLoginAttempted(true);
      }
    };
    
    attemptAutoLogin();
  }, [autoLoginAttempted]); // 只依赖autoLoginAttempted状态
  
  // 路由权限控制 - 仅在自动登录尝试后执行
  useEffect(() => {
    if (!autoLoginAttempted) {
      return; // 等待自动登录尝试完成
    }
    
    const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
    console.log('当前路径:', router.pathname, '是否公开路径:', isPublicRoute, '是否有token:', !!token);
    
    // 如果没有token并且不在公开页面，重定向到登录页
    if (!token && !isPublicRoute) {
      console.log('未登录，重定向到登录页');
      router.replace('/login');
    }
  }, [router.pathname, token, autoLoginAttempted]);

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <Component {...pageProps} />
    </ConfigProvider>
  );
} 