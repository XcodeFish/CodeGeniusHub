import React from 'react';
import { NextPage } from 'next';
import { Layout } from 'antd';
import OllamaTest from '@/components/OllamaTest';

const { Content } = Layout;

/**
 * Ollama测试页面
 */
const OllamaTestPage: NextPage = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px' }}>
        <OllamaTest />
      </Content>
    </Layout>
  );
};

export default OllamaTestPage; 