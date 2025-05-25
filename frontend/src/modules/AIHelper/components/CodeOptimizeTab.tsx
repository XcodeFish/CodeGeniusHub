// frontend/src/modules/AIHelper/components/CodeOptimizeTab.tsx
import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, Space, Divider, Checkbox } from 'antd';
import { SendOutlined, CopyOutlined, CodeOutlined } from '@ant-design/icons';
import { useAIHelper } from '@/hooks/useAIHelper';
import CodeDisplay from './CodeDisplay';
import styles from './AIHelperTabs.module.scss';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;
const { Group: CheckboxGroup } = Checkbox;

/**
 * 代码优化标签页组件
 */
const CodeOptimizeTab: React.FC = () => {
  const {
    language,
    currentResponse,
    setLanguage,
    optimizeCode
  } = useAIHelper();

  const [code, setCode] = useState('');
  const [optimizationGoals, setOptimizationGoals] = useState<string[]>(['performance']);

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

  const optimizationOptions = [
    { value: 'performance', label: '性能' },
    { value: 'readability', label: '可读性' },
    { value: 'security', label: '安全性' },
    { value: 'memory', label: '内存优化' }
  ];

  const handleSubmit = () => {
    optimizeCode(code, optimizationGoals);
  };

  return (
    <div className={styles.tabContainer}>
      <div className={styles.inputSection}>
        <Form layout="vertical">
          <Form.Item label="需要优化的代码">
            <TextArea
              rows={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请粘贴需要优化的代码"
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
            
            <Form.Item label="优化目标" className={styles.checkboxItem}>
              <CheckboxGroup
                options={optimizationOptions}
                value={optimizationGoals}
                onChange={(values) => setOptimizationGoals(values as string[])}
              />
            </Form.Item>
          </Space>
          
          <Form.Item>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              disabled={!code}
            >
              优化代码
            </Button>
          </Form.Item>
        </Form>
      </div>
      
      {currentResponse && currentResponse.data?.optimizedCode && (
        <div className={styles.resultSection}>
          <Divider orientation="left">优化结果</Divider>
          
          <CodeDisplay
            code={currentResponse.data.optimizedCode}
            language={language}
          />
          
          {currentResponse.data.improvementSummary && (
            <Card title="优化总结" className={styles.explanationCard}>
              <Paragraph>{currentResponse.data.improvementSummary}</Paragraph>
            </Card>
          )}
          
          {currentResponse.data.changes && currentResponse.data.changes.length > 0 && (
            <Card title="变更详情" className={styles.changesCard}>
              {currentResponse.data.changes.map((change, index) => (
                <div key={index} className={styles.changeItem}>
                  <Paragraph strong>{index + 1}. {change.description}</Paragraph>
                  {change.oldCode && change.newCode && (
                    <div className={styles.codeDiff}>
                      <div className={styles.oldCode}>
                        <Text type="danger">- {change.oldCode}</Text>
                      </div>
                      <div className={styles.newCode}>
                        <Text type="success">+ {change.newCode}</Text>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}
          
          <div className={styles.actionButtons}>
            <Button
              type="primary"
              icon={<CodeOutlined />}
              onClick={() => {
                // 将代码应用到编辑器的逻辑将在与编辑器集成时实现
                console.log('Apply code to editor');
              }}
            >
              应用到编辑器
            </Button>
            
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(currentResponse.data?.optimizedCode || '');
              }}
            >
              复制代码
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeOptimizeTab;