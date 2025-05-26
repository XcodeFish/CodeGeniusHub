import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, List, Avatar, Typography, Empty, Spin } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ClearOutlined, LoadingOutlined } from '@ant-design/icons';
import { useAIHelper } from '@/hooks/useAIHelper';
import ReactMarkdown from 'react-markdown';
import styles from './AIChat.module.scss';
import { AIResponseData, AIResponseObject } from '@/stores/aiHelperStore';
import { AIHistoryItem } from '@/stores/aiHelperStore';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

// 定义对话项类型接口
interface DialogItem {
  id: string;
  timestamp: number;
  userMessage: { content: string };
  aiMessage: { content: string; raw: any } | null;
}

/**
 * 判断响应数据是否为对象类型
 */
const isObjectData = (data: AIResponseData | undefined): data is AIResponseObject => {
  return typeof data === 'object' && data !== null;
};

/**
 * 获取回复内容文本
 */
const getReplyContent = (data: AIResponseData | undefined): string => {
  if (!data) {
    return '获取回复失败';
  }
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (isObjectData(data)) {
    // 优先使用reply字段
    if (data.reply) {
      return data.reply;
    }
    
    // 其次使用response字段
    if (data.response) {
      return data.response;
    }
    
    // 处理message字段
    if (data.message) {
      return data.message;
    }
    
    // 如果是其他类型的响应，尝试使用其他字段
    if (data.explanation) {
      return data.explanation;
    }
    
    if (data.summary) {
      return data.summary;
    }
    
    // 尝试将对象转换为可读的文本
    try {
      const entries = Object.entries(data)
        .filter(([key, value]) => 
          value && typeof value !== 'object' && key !== 'tokensUsed'
        )
        .map(([key, value]) => `${key}: ${value}`);
      
      if (entries.length > 0) {
        return entries.join('\n');
      }
      
      // 如果没有找到简单字段，尝试将整个对象转为JSON字符串
      return JSON.stringify(data, null, 2);
    } catch (e) {
      console.error('转换对象到文本失败:', e);
    }
  }
  
  return '获取回复失败';
};

/**
 * 保存聊天历史到localStorage
 */
const saveChatHistoryToStorage = (history: AIHistoryItem[]) => {
  try {
    localStorage.setItem('ai-chat-history', JSON.stringify(history));
  } catch (err) {
    console.error('保存聊天历史失败:', err);
  }
};

/**
 * AI对话组件
 * 独立页面版本，用于在路由页面中展示
 */
const AIChat: React.FC = () => {
  const {
    history,
    chatWithAI,
    resetConversation,
    clearHistory,
    loading
  } = useAIHelper();

  const [message, setMessage] = useState('');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 当历史记录更新时，保存到localStorage
  useEffect(() => {
    if (history.length > 0) {
      const chatHistory = history.filter(item => item.type === 'chat');
      saveChatHistoryToStorage(chatHistory);
    }
  }, [history]);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, pendingMessage, loading]);

  const handleSend = () => {
    if (message.trim()) {
      // 设置待处理消息，在UI中立即显示
      setPendingMessage(message);
      
      // 发送消息到AI
      chatWithAI(message).finally(() => {
        // 消息处理完成后清除待处理状态
        setPendingMessage(null);
      });
      
      // 清空输入框
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 清除历史记录同时也清除localStorage
  const handleClearHistory = () => {
    resetConversation();
    clearHistory();
    localStorage.removeItem('ai-chat-history');
  };

  // 过滤获取聊天历史记录
  const chatHistory = history.filter(item => item.type === 'chat');

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button
            type="text"
            icon={<ClearOutlined />}
            onClick={handleClearHistory}
          >
            清除对话历史
          </Button>
        </div>
      </div>
    
      <div className={styles.chatMessages}>
        {chatHistory.length === 0 && !pendingMessage ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="开始与AI助手对话吧"
            className={styles.emptyChat}
          />
        ) : (
          <div>
            {/* 直接展示每条历史记录 */}
            {chatHistory.map((item, index) => (
              <React.Fragment key={item.id || index}>
                {/* 如果有prompt则显示用户消息 */}
                {item.prompt && (
                  <List.Item className={styles.messageItem}>
                    <div className={styles.userMessage}>
                      <div className={styles.messageHeader}>
                        <Text strong>你</Text>
                        <Avatar
                          icon={<UserOutlined />}
                          className={styles.userAvatar}
                        />
                      </div>
                      <div className={styles.messageContent}>
                        <Paragraph>{item.prompt}</Paragraph>
                      </div>
                    </div>
                  </List.Item>
                )}
                
                {/* 如果有response则显示AI回复 */}
                {item.response && item.response.data && (
                  <List.Item className={styles.messageItem}>
                    <div className={styles.aiMessage}>
                      <div className={styles.messageHeader}>
                        <Avatar
                          icon={<RobotOutlined />}
                          className={styles.aiAvatar}
                        />
                        <Text strong>AI助手</Text>
                      </div>
                      <div className={styles.messageContent}>
                        <div>
                          <ReactMarkdown>
                            {getReplyContent(item.response.data)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              </React.Fragment>
            ))}
        
            {/* 显示待处理的消息 */}
            {pendingMessage && (
              <List.Item className={styles.messageItem}>
                <div className={styles.userMessage}>
                  <div className={styles.messageHeader}>
                    <Text strong>你</Text>
                    <Avatar
                      icon={<UserOutlined />}
                      className={styles.userAvatar}
                    />
                  </div>
                  <div className={styles.messageContent}>
                    <Paragraph>{pendingMessage}</Paragraph>
                  </div>
                </div>
              </List.Item>
            )}
            
            {/* 显示加载指示器 */}
            {loading && (
              <List.Item className={styles.messageItem}>
                <div className={styles.aiMessage}>
                  <div className={styles.messageHeader}>
                    <Avatar
                      icon={<RobotOutlined />}
                      className={styles.aiAvatar}
                    />
                    <Text strong>AI助手</Text>
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.loadingContainer}>
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                      <span className={styles.loadingText}>思考中...</span>
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          </div>
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
          disabled={!message.trim() || loading}
          className={styles.sendButton}
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default AIChat;