import React from 'react';
import { NextPage } from 'next';
import { Layout } from 'antd';
import OllamaTest from '@/components/OllamaTest';
import MainLayout from '@/components/layout/MainLayout';

const { Content } = Layout;

/**
 * Ollama测试页面
 */
const OllamaTestPage: NextPage = () => {
  return (
    <MainLayout>
      <Content style={{ padding: '20px' }}>
        <OllamaTest />
      </Content>
    </MainLayout>
  );
};

export default OllamaTestPage; 