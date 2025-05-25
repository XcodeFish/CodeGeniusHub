import React, { useState } from 'react';
import { Drawer, Tabs, Button, Input, Select, Space, Spin, Alert, Typography, Empty } from 'antd';
import { CodeOutlined, ToolOutlined, AuditOutlined, MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { useAIHelper } from '@/hooks/useAIHelper';
import CodeGenerateTab from './CodeGenerateTab';
import CodeOptimizeTab from './CodeOptimizeTab';
import CodeAnalyzeTab from './CodeAnalyzeTab';
import AIChatTab from './AIChatTab';
import styles from './AIHelperSidebar.module.scss';

const { TabPane } = Tabs;
const { Title } = Typography;

/**
 * AI助手侧边栏组件
 * 包含代码生成、优化、分析和AI聊天功能
 */
const AIHelperSidebar: React.FC = () => {
  const {
    visible,
    activeTab,
    loading,
    error,
    closeAIHelper,
    switchTab
  } = useAIHelper();

  return (
    <Drawer
      title={
        <div className={styles.drawerTitle}>
          <Title level={4}>AI 助手</Title>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={closeAIHelper}
            className={styles.closeButton}
          />
        </div>
      }
      placement="right"
      width={500}
      open={visible}
      onClose={closeAIHelper}
      closable={false}
      className={styles.aiHelperDrawer}
    >
      <Tabs
        activeKey={activeTab}
        onChange={switchTab}
        tabBarGutter={24}
        tabBarStyle={{
          marginLeft: '24px'
        }}
        className={styles.tabs}
        items={[
        {
          key: 'generate',
          label: <span><CodeOutlined />代码生成</span>,
          children: <CodeGenerateTab />
        },
        {
          key: 'optimize',
          label: <span><ToolOutlined />代码优化</span>,
          children: <CodeOptimizeTab />
        },
        {
          key: 'analyze',
          label: <span><AuditOutlined />代码分析</span>,
          children: <CodeAnalyzeTab />
        },
        {
          key: 'chat',
          label: <span><MessageOutlined />AI 对话</span>,
          children: <AIChatTab />
        }
      ]}
    />

      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          closable
          className={styles.errorAlert}
        />
      )}

      {loading && (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p>AI 正在思考中...</p>
        </div>
      )}
    </Drawer>
  );
};

export default AIHelperSidebar;