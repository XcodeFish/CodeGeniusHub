import React from 'react';
import { Card, Typography } from 'antd';
import MainLayout from '@/components/layout/MainLayout';
import AIChat from '@/modules/AIHelper/components/AIChat';
import styles from '@/styles/ai/index.module.scss';

const { Title } = Typography;

/**
 * AI助手页面
 * 作为独立路由页面展示AI对话功能
 */
function AIPage() {
  return (
    <MainLayout title="AI助手 - 智能代码助手">
      <div className={styles.container}>
        <Card 
          title={<Title level={4}>AI助手</Title>}
          className={styles.chatCard}
          bordered={false}
        >
          <AIChat />
        </Card>
      </div>
    </MainLayout>
  );
}

export default AIPage; 