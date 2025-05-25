import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, message } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import { AIHelperSidebar } from '@/modules/AIHelper';
import Head from 'next/head';
import { useSocketStore } from '@/stores/socketStore';
import { useUserStore } from '@/stores/userStore';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * 主布局组件，包含侧边栏和顶部导航
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children, title = "AI智能代码生成与协作平台" }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { connect, disconnect, socket } = useSocketStore();
  const { token } = useUserStore();
  const [messageApi, contextHolder] = message.useMessage();
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // 切换侧边栏
  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  // 初始化Socket连接
  useEffect(() => {
    // 防止重复连接，如果已连接并且token相同，则不需要重新连接
    if (token && !socket) {
      const initSocket = async () => {
        try {
          await connect(token);
          console.log('通知Socket连接成功');
          // 重置重试计数
          retryCountRef.current = 0;
        } catch (error) {
          console.error('通知Socket连接失败:', error);
          
          // 自动重试逻辑
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current += 1;
            const delay = Math.pow(2, retryCountRef.current) * 1000; // 指数退避
            messageApi.info(`通知系统连接失败，${delay/1000}秒后尝试重新连接...`);
            
            setTimeout(() => {
              if (!socket) {
                initSocket();
              }
            }, delay);
          } else {
            messageApi.error('通知系统连接失败，请刷新页面重试');
          }
        }
      };

      initSocket();
    }
    
    // 组件卸载时断开连接
    return () => {
      // 只有当页面卸载时才断开连接，避免不必要的断开/重连
      if (socket) {
        disconnect();
      }
    };
  }, [token, connect, disconnect, socket, messageApi]);

  return (
    <>
      {contextHolder}
      <Head>
        <title>{title}</title>
        <meta name="description" content="AI智能代码生成与协作平台" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} />
        <Layout>
          <Header collapsed={collapsed} toggleSidebar={toggleSidebar} />
          <Content className="main-content">
            {children}
          </Content>
        </Layout>
        <AIHelperSidebar />
      </Layout>
    </>
  );
};

export default MainLayout; 