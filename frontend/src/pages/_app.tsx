// frontend/src/pages/_app.tsx
import type { AppProps } from 'next/app';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
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
  
  // 防止重复执行的标记
  const loginAttemptInProgress = useRef(false);
  const initialCheckDone = useRef(false);
  const redirectInProgress = useRef(false);

  // 合并为单个useEffect，仅在挂载时执行一次
  useEffect(() => {
    // 防止重复执行
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;
    
    const checkLoginStatus = async () => {
      // 立即检查是否有完整登录状态
      const storedToken = localStorage.getItem('token');
      const hasValidUser = user && user.id;
      
      // 如果已有完整状态，直接标记完成
      if (storedToken && hasValidUser) {
        console.log('已有完整登录状态，跳过自动登录');
        setAuthChecking(false);
        setAutoLoginAttempted(true);
        return;
      }
      
      // 否则执行自动登录流程
      if (!loginAttemptInProgress.current && !autoLoginAttempted) {
        loginAttemptInProgress.current = true;
        
        try {
          console.log('尝试自动登录...');
          showLoading('认证检查中...');
          
          // 创建可取消的超时
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          try {
            const success = await autoLogin();
            clearTimeout(timeoutId);
            
            console.log('自动登录结果:', success ? '成功' : '失败');
            if (!success) {
              logout();
            }
          } catch (error: any) {
            console.error('自动登录出错:', error);
            logout();
          }
        } finally {
          hideLoading();
          loginAttemptInProgress.current = false;
          // 使用一个很短的延迟确保状态更新
          setTimeout(() => {
            setAutoLoginAttempted(true);
            setAuthChecking(false);
          }, 10);
        }
      }
    };
    
    checkLoginStatus();
    
    // 空依赖数组确保仅执行一次
  }, []); 
  
  // 路由控制 - 使用ref防止重复执行
  useEffect(() => {
    // 等待认证检查完成，或正在重定向中，跳过
    if (authChecking || redirectInProgress.current) return;
    
    const checkRouteAccess = async () => {
      // 标记开始重定向流程
      redirectInProgress.current = true;
      
      const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
      const hasValidUser = !!user && user.id !== '';
      
      console.log('路由检查:', router.pathname, 
                '公开路径:', isPublicRoute, 
                'token:', !!token, 
                '有效用户:', hasValidUser);
      
      try {
        // 状态不一致
        if (token && !hasValidUser) {
          console.warn('状态不一致: 有token无用户信息');
          await logout();
          await router.replace('/login');
        }
        // 已登录在登录页
        else if (router.pathname === '/login' && token && hasValidUser) {
          console.log('已登录，从登录页重定向到仪表盘');
          await router.replace('/dashboard');
        }
        // 未登录访问受保护页面
        else if (!token && !isPublicRoute) {
          console.log('未登录，重定向到登录页');
          await router.replace('/login');
        }
      } finally {
        // 标记重定向完成
        redirectInProgress.current = false;
      }
    };
    
    checkRouteAccess();
    
    // 仅在路由变化、认证状态变化时执行
  }, [router.pathname, token, user?.id, authChecking, autoLoginAttempted]);

  // 在认证检查过程中显示全局加载组件
  if (authChecking) {
    return (
      <ConfigProvider locale={zhCN} theme={themeConfig}>
        <AntApp>
          <GlobalLoading />
        </AntApp>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntApp>
        <GlobalLoading />
        <AppModel />
        <Component {...pageProps} />
      </AntApp>
    </ConfigProvider>
  );
}