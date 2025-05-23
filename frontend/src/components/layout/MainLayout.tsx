import React, { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import Head from 'next/head';

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

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
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
      </Layout>
    </>
  );
};

export default MainLayout; 