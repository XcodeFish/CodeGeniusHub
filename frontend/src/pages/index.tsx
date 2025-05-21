import Head from 'next/head';
import { Button, Typography } from 'antd';

const { Title } = Typography;

export default function Home() {
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
          <Title level={2}>AI智能代码生成与协作平台</Title>
          <p>欢迎使用AI智能代码生成与协作平台！</p>
          <Button type="primary" href="/login" style={{ marginTop: 20 }}>
            登录/注册
          </Button>
        </div>
      </main>
    </>
  );
} 