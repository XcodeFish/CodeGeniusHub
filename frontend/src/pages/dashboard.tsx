import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Layout, Typography, Space, Card, Row, Col } from 'antd';
import { useUserStore } from '@/stores/userStore';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

/**
 * 系统仪表盘首页组件
 */
export default function Dashboard() {
  const router = useRouter();
  const { user, token } = useUserStore();
  
  // 检查用户是否已登录，未登录则重定向到登录页
  useEffect(() => {
    if (!token || !user) {
      router.replace('/login');
    }
  }, [user, token, router]);

  return (
    <>
      <Head>
        <title>仪表盘 - AI智能代码生成与协作平台</title>
        <meta name="description" content="AI智能代码生成与协作平台仪表盘" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#fff', padding: '0 20px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>AI智能代码生成与协作平台</Title>
            <Space>
              <Text>{user?.username || '用户'}</Text>
            </Space>
          </div>
        </Header>
        <Content style={{ padding: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card>
                <Title level={4}>欢迎使用AI智能代码生成与协作平台</Title>
                <Text>您已成功登录系统。这是一个简单的仪表盘页面示例。</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card title="我的项目" extra={<a href="#">查看全部</a>}>
                <p>暂无项目</p>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card title="最近活动" extra={<a href="#">查看全部</a>}>
                <p>暂无活动</p>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card title="系统公告" extra={<a href="#">查看全部</a>}>
                <p>欢迎使用AI智能代码生成与协作平台</p>
              </Card>
            </Col>
          </Row>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          AI智能代码生成与协作平台 ©{new Date().getFullYear()} CodeGeniusHub
        </Footer>
      </Layout>
    </>
  );
} 