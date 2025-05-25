// frontend/src/modules/AIHelper/components/CodeGenerateTab.tsx
import React from 'react';
import { Form, Input, Select, Button, Card, Typography, Space, Divider } from 'antd';
import { SendOutlined, CopyOutlined, CodeOutlined } from '@ant-design/icons';
import { useAIHelper } from '@/hooks/useAIHelper';
import CodeDisplay from './CodeDisplay';
import styles from './AIHelperTabs.module.scss';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;

/**
 * 代码生成标签页组件
 */
const CodeGenerateTab: React.FC = () => {
  const {
    prompt,
    language,
    framework,
    currentResponse,
    setPrompt,
    setLanguage,
    setFramework,
    generateCode
  } = useAIHelper();

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' }
  ];

  const frameworkOptions = {
    javascript: [
      { value: 'react', label: 'React' },
      { value: 'vue', label: 'Vue.js' },
      { value: 'angular', label: 'Angular' },
      { value: 'express', label: 'Express' },
      { value: 'nest', label: 'NestJS' }
    ],
    typescript: [
      { value: 'react', label: 'React' },
      { value: 'vue', label: 'Vue.js' },
      { value: 'angular', label: 'Angular' },
      { value: 'express', label: 'Express' },
      { value: 'nest', label: 'NestJS' }
    ],
    python: [
      { value: 'django', label: 'Django' },
      { value: 'flask', label: 'Flask' },
      { value: 'fastapi', label: 'FastAPI' }
    ],
    java: [
      { value: 'spring', label: 'Spring' },
      { value: 'springboot', label: 'Spring Boot' }
    ]
  };

  const handleSubmit = () => {
    generateCode();
  };

  return (
    <div className={styles.tabContainer}>
      <div className={styles.inputSection}>
        <Form layout="vertical">
          <Form.Item label="代码描述">
            <TextArea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="请描述你需要生成的代码，如：创建一个React组件，展示用户列表，支持分页和搜索功能"
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
            
            {(language === 'javascript' || language === 'typescript' || language === 'python' || language === 'java') && (
              <Form.Item label="框架/库" className={styles.selectItem}>
                <Select
                  value={framework}
                  onChange={setFramework}
                  style={{ width: 120 }}
                  allowClear
                  placeholder="可选"
                >
                  {frameworkOptions[language].map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </Space>
          
          <Form.Item>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              disabled={!prompt}
            >
              生成代码
            </Button>
          </Form.Item>
        </Form>
      </div>
      
      {currentResponse && currentResponse.data?.generatedCode && (
        <div className={styles.resultSection}>
          <Divider orientation="left">生成结果</Divider>
          
          <CodeDisplay
            code={currentResponse.data.generatedCode}
            language={language}
          />
          
          {currentResponse.data.explanation && (
            <Card title="代码解释" className={styles.explanationCard}>
              <Paragraph>{currentResponse.data.explanation}</Paragraph>
            </Card>
          )}
          
          {currentResponse.data.alternatives && currentResponse.data.alternatives.length > 0 && (
            <Card title="其他实现方案" className={styles.alternativesCard}>
              <ul>
                {currentResponse.data.alternatives.map((alt, index) => (
                  <li key={index}>{alt}</li>
                ))}
              </ul>
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
                navigator.clipboard.writeText(currentResponse.data?.generatedCode || '');
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

export default CodeGenerateTab;