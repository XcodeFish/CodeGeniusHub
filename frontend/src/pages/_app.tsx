// frontend/src/pages/_app.tsx
import type { AppProps } from 'next/app';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/modules/auth/useAuth';
import '@/styles/globals.scss';
import AppModel from '@/components/modal';
import GlobalLoading, { useGlobalLoadingStore } from '@/components/globalLoading';

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
  const { token, user, logout } = useUserStore();
  const { autoLogin } = useAuth();
  const { showLoading, hideLoading } = useGlobalLoadingStore();
  const [authChecking, setAuthChecking] = useState(true);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  // 添加路由重定向状态跟踪
  const redirectInProgress = useRef(false);

  // 初始状态检查 - 新增：检查是否已有完整登录状态
  useEffect(() => {
    // 立即检查localStorage和store中是否已有完整的登录状态
    const storedToken = localStorage.getItem('token');
    const hasValidUser = user && user.id;
    
    if (storedToken && hasValidUser) {
      console.log('已有完整登录状态，跳过自动登录检查');
      setAuthChecking(false);
      setAutoLoginAttempted(true);
      return;
    }
    
    // 如果没有完整状态，保持authChecking为true，等待自动登录
  }, [user]);

  // 只在组件挂载时执行自动登录 - 优化：仅在无完整状态时执行
  useEffect(() => {
    // 如果已经尝试过或已有完整状态，跳过
    if (autoLoginAttempted || (token && user && user.id)) return;
    
    const attemptAutoLogin = async () => {
      try {
        console.log('尝试自动登录...');
        showLoading('认证检查中...');
        
        // 创建AbortController用于取消请求
        const abortController = new AbortController();
        const signal = abortController.signal;
        
        // 设置超时
        const timeoutId = setTimeout(() => {
          abortController.abort('timeout');
        }, 3000);
        
        try {
          // 执行自动登录
          const success = await autoLogin();
          
          // 登录完成，清除超时
          clearTimeout(timeoutId);
          
          console.log('自动登录结果:', success ? '成功' : '失败');
          if (!success) {
            logout();
          }
        } catch (error: any) {
          if (error.name === 'AbortError' || error === 'timeout') {
            console.warn('自动登录超时');
            logout();
          } else {
            console.error('自动登录出错:', error);
            logout();
          }
        }
      } finally {
        hideLoading();
        setTimeout(() => {
          setAutoLoginAttempted(true);
          setAuthChecking(false);
        }, 50);
      }
    };
    
    attemptAutoLogin();
  }, [autoLogin, autoLoginAttempted, showLoading, hideLoading, logout, token, user]);
  
  // 路由权限控制 - 优化：避免重复跳转
  useEffect(() => {
    // 等待认证检查完成
    if (authChecking) {
      console.log('认证检查中，等待完成...');
      return; 
    }
    
    // 防止重复执行路由跳转
    if (redirectInProgress.current) {
      return;
    }
    
    const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
    const hasValidUser = !!user && user.id !== '';
    
    console.log('当前路径:', router.pathname, 
                '是否公开路径:', isPublicRoute, 
                '是否有token:', !!token, 
                '是否有有效用户信息:', hasValidUser);
    
    // 确保登录状态一致性
    if (token && !hasValidUser) {
      console.warn('状态不一致: 有token但没有用户信息，清除登录状态');
      redirectInProgress.current = true;
      logout();
      router.replace('/login').then(() => {
        redirectInProgress.current = false;
      });
      return;
    }
    
    // 已登录但在登录页，跳转到仪表盘
    if (router.pathname === '/login' && token && hasValidUser) {
      console.log('已登录，从登录页重定向到仪表盘');
      redirectInProgress.current = true;
      router.replace('/dashboard').then(() => {
        redirectInProgress.current = false;
      });
      return;
    }
    
    // 未登录且非公开页面，跳转到登录页
    if (!token && !isPublicRoute) {
      console.log('未登录，重定向到登录页');
      redirectInProgress.current = true;
      router.replace('/login').then(() => {
        redirectInProgress.current = false;
      });
      return;
    }
  }, [router, token, user, autoLoginAttempted, authChecking, logout]);

  // 在认证检查过程中显示全局加载组件替代空白页
  if (authChecking) {
    return (
      <ConfigProvider locale={zhCN} theme={themeConfig}>
        <GlobalLoading />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <GlobalLoading />
      <AppModel />
      <Component {...pageProps} />
    </ConfigProvider>
  );
}