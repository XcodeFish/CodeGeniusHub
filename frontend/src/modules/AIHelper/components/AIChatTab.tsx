// frontend/src/modules/AIHelper/components/AIChatTab.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, List, Avatar, Typography, Divider, Empty } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ClearOutlined } from '@ant-design/icons';
import { useAIHelper } from '@/hooks/useAIHelper';
import ReactMarkdown from 'react-markdown';
import styles from './AIHelperTabs.module.scss';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

/**
 * AI对话标签页组件
 */
const AIChatTab: React.FC = () => {
  const {
    history,
    currentResponse,
    chatWithAI,
    resetConversation,
    clearHistory
  } = useAIHelper();

  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = () => {
    if (message.trim()) {
      chatWithAI(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 过滤出聊天类型的历史记录
  const chatHistory = history.filter(item => item.type === 'chat');

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <Button
          type="text"
          icon={<ClearOutlined />}
          onClick={() => {
            resetConversation();
            clearHistory();
          }}
        >
          清除对话历史
        </Button>
      </div>
      
      <div className={styles.chatMessages}>
        {chatHistory.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="开始与AI助手对话吧"
            className={styles.emptyChat}
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={chatHistory}
            renderItem={(item) => (
              <List.Item className={styles.messageItem}>
                <div className={item.prompt ? styles.userMessage : styles.aiMessage}>
                  <div className={styles.messageHeader}>
                    <Avatar
                      icon={item.prompt ? <UserOutlined /> : <RobotOutlined />}
                      className={item.prompt ? styles.userAvatar : styles.aiAvatar}
                    />
                    <Text strong>{item.prompt ? '你' : 'AI助手'}</Text>
                  </div>
                  <div className={styles.messageContent}>
                    {item.prompt ? (
                      <Paragraph>{item.prompt}</Paragraph>
                    ) : (
                      item.response?.data?.reply && (
                        <ReactMarkdown>{item.response.data.reply}</ReactMarkdown>
                      )
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={styles.chatInput}>
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入问题，按Enter发送"
          autoSize={{ minRows: 1, maxRows: 4 }}
          className={styles.textarea}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!message.trim()}
          className={styles.sendButton}
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default AIChatTab;