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
  const { token, user } = useUserStore();
  const { autoLogin } = useAuth();
  const [authChecking, setAuthChecking] = useState(true); // 新增状态，标记认证检查过程
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  // 只在组件挂载时执行自动登录
  useEffect(() => {
    // 避免重复执行自动登录
    if (autoLoginAttempted) return;
    
    const attemptAutoLogin = async () => {
      try {
        console.log('尝试自动登录...');
        setAuthChecking(true); // 开始认证检查
        
        // 添加超时保护
        const timeout = 15000; // 15秒超时
        let isTimedOut = false;
        
        // 创建一个超时Promise
        const timeoutPromise = new Promise<boolean>(resolve => {
          setTimeout(() => {
            isTimedOut = true;
            console.warn('自动登录超时');
            resolve(false);
          }, timeout);
        });
        
        // 创建自动登录Promise
        const loginPromise = autoLogin();
        
        // 使用Promise.race竞争，哪个先完成用哪个结果
        const success = await Promise.race([loginPromise, timeoutPromise]);
        
        // 如果是超时导致的结果
        if (isTimedOut) {
          console.warn('自动登录被超时取消，用户可能需要手动登录');
        } else {
          console.log('自动登录结果:', success ? '成功' : '失败');
        }
      } catch (error) {
        console.error('自动登录出错:', error);
      } finally {
        // 延迟结束认证检查，给其他组件和状态更新的时间
        setTimeout(() => {
          setAutoLoginAttempted(true);
          setAuthChecking(false); // 认证检查完成
        }, 500); // 添加500ms延迟
      }
    };
    
    attemptAutoLogin();
  }, [autoLogin, autoLoginAttempted]); // 添加autoLogin依赖
  
  // 路由权限控制 - 仅在自动登录尝试后执行，且不在认证检查过程中
  useEffect(() => {
    // 等待认证检查完成
    if (authChecking) {
      console.log('认证检查中，等待完成...');
      return; 
    }
    
    const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
    console.log('当前路径:', router.pathname, '是否公开路径:', isPublicRoute, '是否有token:', !!token, '是否有用户信息:', !!user);
    
    // 首先检查是否在登录页，且已经有有效的token和用户信息
    if (router.pathname === '/login' && token && user) {
      console.log('已登录，从登录页重定向到仪表盘');
      router.replace('/dashboard');
      return;
    }
    
    // 如果没有token并且不在公开页面，重定向到登录页
    if (!token && !isPublicRoute) {
      console.log('未登录，重定向到登录页');
      router.replace('/login');
    }
  }, [router.pathname, token, user, autoLoginAttempted, authChecking]);

  // 在认证检查过程中显示空白页或加载指示器
  if (authChecking) {
    return (
      <ConfigProvider locale={zhCN} theme={themeConfig}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}></div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <Component {...pageProps} />
    </ConfigProvider>
  );
}