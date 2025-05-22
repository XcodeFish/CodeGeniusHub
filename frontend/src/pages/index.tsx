import Head from 'next/head';
import { Button, Typography } from 'antd';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUserStore } from '@/stores/userStore';

const { Title } = Typography;

export default function Home() {
  const router = useRouter();
  const { user, token } = useUserStore();
  
  useEffect(() => {
    // 检查用户是否登录
    if (token && user) {
      // 已登录，跳转到系统首页
      router.replace('/dashboard');
    } else {
      // 未登录，跳转到登录页面
      router.replace('/login');
    }
  }, [user, token, router]);
  
  // 由于会自动跳转，这个页面实际上不会显示
  // 但为了防止闪烁，保留一个简单的加载状态
  return (
    <>
      <Head>
        <title>AI智能代码生成与协作平台</title>
        <meta name="description" content="AI智能代码生成与协作平台" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={3}>正在加载中...</Title>
        </div>
      </main>
    </>
  );
} 