// frontend/src/modules/AIHelper/components/CodeAnalyzeTab.tsx
import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, Space, Divider, Progress, Tag, List } from 'antd';
import { SendOutlined, CopyOutlined, CodeOutlined, ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAIHelper } from '@/hooks/useAIHelper';
import CodeDisplay from './CodeDisplay';
import styles from './AIHelperTabs.module.scss';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;

/**
 * 代码分析标签页组件
 */
const CodeAnalyzeTab: React.FC = () => {
  const {
    language,
    currentResponse,
    setLanguage,
    analyzeCode
  } = useAIHelper();

  const [code, setCode] = useState('');
  const [analysisLevel, setAnalysisLevel] = useState('detailed');

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' }
  ];

  const analysisLevelOptions = [
    { value: 'basic', label: '基础分析' },
    { value: 'detailed', label: '详细分析' },
    { value: 'comprehensive', label: '全面分析' }
  ];

  const handleSubmit = () => {
    analyzeCode(code, analysisLevel as 'basic' | 'detailed' | 'comprehensive');
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
        return 'blue';
      default:
        return 'blue';
    }
  };

  return (
    <div className={styles.tabContainer}>
      <div className={styles.inputSection}>
        <Form layout="vertical">
          <Form.Item label="需要分析的代码">
            <TextArea
              rows={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请粘贴需要分析的代码"
              className={styles.codeInput}
            />
          </Form.Item>
          
          <Space className={styles.optionsRow}>
            <Form.Item label="编程语言" className={styles.selectItem}>
              <Select
                value={language}
                onChange={setLanguage}
                style={{ width: 120 }}
              >
                {languageOptions.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="分析深度" className={styles.selectItem}>
              <Select
                value={analysisLevel}
                onChange={setAnalysisLevel}
                style={{ width: 120 }}
              >
                {analysisLevelOptions.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Space>
          
          <Form.Item>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              disabled={!code}
            >
              分析代码
            </Button>
          </Form.Item>
        </Form>
      </div>
      
      {currentResponse && currentResponse.data?.score !== undefined && (
        <div className={styles.resultSection}>
          <Divider orientation="left">分析结果</Divider>
          
          <div className={styles.scoreCard}>
            <Card className={styles.scoreContainer}>
              <Title level={4}>代码质量评分</Title>
              <Progress
                type="circle"
                percent={currentResponse.data.score}
                format={(percent) => `${percent?.toFixed(0)}分`}
                strokeColor={
                  currentResponse.data.score >= 80 ? '#52c41a' :
                  currentResponse.data.score >= 60 ? '#faad14' : '#f5222d'
                }
                width={120}
              />
            </Card>
          </div>
          
          {currentResponse.data.summary && (
            <Card title="总体评价" className={styles.summaryCard}>
              <Paragraph>{currentResponse.data.summary}</Paragraph>
            </Card>
          )}
          
          {currentResponse.data.issues && currentResponse.data.issues.length > 0 && (
            <Card title="发现的问题" className={styles.issuesCard}>
              <List
                dataSource={currentResponse.data.issues}
                renderItem={(issue, index) => (
                  <List.Item className={styles.issueItem}>
                    <List.Item.Meta
                      avatar={getSeverityIcon(issue.severity)}
                      title={
                        <Space>
                          <Text strong>{index + 1}. {issue.message}</Text>
                          <Tag color={getSeverityColor(issue.severity)}>
                            {issue.severity === 'error' ? '错误' :
                             issue.severity === 'warning' ? '警告' : '提示'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          {issue.location && (
                            <Text type="secondary">
                              位置: 第 {issue.location.line} 行, 第 {issue.location.column} 列
                            </Text>
                          )}
                          {issue.fix && (
                            <div className={styles.issueFix}>
                              <Text strong>修复建议:</Text>
                              <Paragraph>{issue.fix}</Paragraph>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
          
          {currentResponse.data.strengths && currentResponse.data.strengths.length > 0 && (
            <Card title="代码优点" className={styles.strengthsCard}>
              <ul>
                {currentResponse.data.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeAnalyzeTab;