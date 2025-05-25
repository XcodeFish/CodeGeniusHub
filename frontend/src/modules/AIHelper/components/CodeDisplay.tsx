// frontend/src/modules/AIHelper/components/CodeDisplay.tsx
import React from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import styles from './CodeDisplay.module.scss';

interface CodeDisplayProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}

/**
 * 代码显示组件
 * 支持语法高亮和代码复制
 */
const CodeDisplay: React.FC<CodeDisplayProps> = ({
  code,
  language,
  showLineNumbers = true
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(
      () => message.success('代码已复制到剪贴板'),
      () => message.error('复制失败，请手动复制')
    );
  };

  // 根据language适配react-syntax-highlighter的语言
  const getSyntaxLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'python': 'python',
      'java': 'java',
      'go': 'go',
      'csharp': 'cs',
      'php': 'php',
      'ruby': 'ruby',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'c': 'c',
      'cpp': 'cpp',
      'rust': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sql': 'sql',
      'shell': 'bash',
      'bash': 'bash'
    };
    
    return languageMap[lang.toLowerCase()] || 'text';
  };

  return (
    <div className={styles.codeDisplayContainer}>
      <div className={styles.codeHeader}>
        <span className={styles.language}>{language}</span>
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          className={styles.copyButton}
        >
          复制
        </Button>
      </div>
      <div className={styles.codeBlock}>
        <SyntaxHighlighter
          language={getSyntaxLanguage(language)}
          style={vs2015}
          showLineNumbers={showLineNumbers}
          wrapLines
          customStyle={{
            margin: 0,
            borderRadius: '0 0 4px 4px',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeDisplay;