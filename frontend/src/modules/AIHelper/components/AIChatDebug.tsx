 import React, { useState } from 'react';
import { List, Avatar, Typography, Button } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import styles from './AIChat.module.scss';
import { useAIHelperStore } from '@/stores/aiHelperStore';

const { Text, Paragraph } = Typography;

/**
 * 简化版的AI聊天组件，用于调试
 */
const AIChatDebug: React.FC = () => {
  const { history } = useAIHelperStore();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // 筛选出聊天类型的历史记录
  const chatHistory = history.filter(item => item.type === 'chat');
  
  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={() => setShowDebugInfo(!showDebugInfo)}>
            {showDebugInfo ? '隐藏调试信息' : '显示调试信息'}
          </Button>
        </div>
      </div>
      
      {showDebugInfo && (
        <div style={{ padding: '10px', backgroundColor: '#f0f0f0', margin: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '200px' }}>
          <h4>历史记录数据 ({history.length} 条, 聊天记录 {chatHistory.length} 条):</h4>
          <pre>{JSON.stringify(chatHistory, null, 2)}</pre>
        </div>
      )}
      
      <div className={styles.chatMessages}>
        {chatHistory.length === 0 ? (
          <div className={styles.emptyChat}>没有聊天记录</div>
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
                        <Avatar icon={<UserOutlined />} className={styles.userAvatar} />
                      </div>
                      <div className={styles.messageContent}>
                        <Paragraph>{item.prompt}</Paragraph>
                      </div>
                    </div>
                  </List.Item>
                )}
                
                {/* 如果有response则显示AI回复 */}
                {item.response && (
                  <List.Item className={styles.messageItem}>
                    <div className={styles.aiMessage}>
                      <div className={styles.messageHeader}>
                        <Avatar icon={<RobotOutlined />} className={styles.aiAvatar} />
                        <Text strong>AI助手</Text>
                      </div>
                      <div className={styles.messageContent}>
                        <div>
                          <ReactMarkdown>
                            {item.response.data 
                              ? (typeof item.response.data === 'string' 
                                ? item.response.data 
                                : (item.response.data.reply || 
                                   item.response.data.response || 
                                   item.response.data.message || 
                                   JSON.stringify(item.response.data)))
                              : '无响应数据'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatDebug;