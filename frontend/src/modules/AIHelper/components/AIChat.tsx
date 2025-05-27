import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input, Button, List, Avatar, Typography, Empty, Spin, Select } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ClearOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAIHelper } from '@/hooks/useAIHelper';
import ReactMarkdown from 'react-markdown';
import styles from './AIChat.module.scss';
import { AIResponseData, AIResponseObject, AIHistoryItem, AIResponse } from '@/stores/aiHelperStore';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { Option } = Select;

// 定义对话项类型接口
interface DialogItem {
  id: string;
  timestamp: number;
  userMessage: { content: string };
  aiMessage: { content: string; raw: any } | null;
}

// 定义模型选项接口
interface ModelOption {
  value: string;
  label: string;
  provider?: string;
  isOllama?: boolean;
  ollamaApiUrl?: string;
}

// 在类型定义部分添加扩展的历史记录类型
interface ExtendedAIHistoryItem extends AIHistoryItem {
  source?: 'system' | 'ollama';
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
    loading,
    error,
    selectedModel,
    setSelectedModel,
    aiService,
    fetchAIConfig
  } = useAIHelper();

  // 定义状态变量
  const [message, setMessage] = useState('');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [ollamaResponse, setOllamaResponse] = useState<string>('');
  const [processingOllama, setProcessingOllama] = useState(false);
  const [configFetched, setConfigFetched] = useState(false);
  const [ollamaHistory, setOllamaHistory] = useState<ExtendedAIHistoryItem[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 组件加载时从localStorage读取Ollama聊天记录
  useEffect(() => {
    console.log('读取Ollama聊天历史...');
    try {
      const savedHistory = localStorage.getItem('ollama-chat-history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        console.log('从localStorage读取到Ollama聊天历史:', parsed);
        
        // 兼容新旧格式
        if (Array.isArray(parsed)) {
          // 旧格式: 直接是数组
          setOllamaHistory(parsed);
          console.log('使用旧格式加载了', parsed.length, '条Ollama聊天记录');
        } else if (parsed.items && Array.isArray(parsed.items)) {
          // 新格式: {timestamp, items}
          setOllamaHistory(parsed.items);
          console.log('使用新格式加载了', parsed.items.length, '条Ollama聊天记录', '保存时间:', new Date(parsed.timestamp));
        } else {
          console.warn('无法识别的Ollama聊天历史格式');
        }
      }
    } catch (err) {
      console.error('读取Ollama聊天历史出错:', err);
    }
  }, []);
  
  // 保存Ollama聊天记录到localStorage
  const saveOllamaHistory = (items: ExtendedAIHistoryItem[]) => {
    try {
      // 添加时间戳，确保保存成功
      const dataToSave = {
        timestamp: Date.now(),
        items: items
      };
      
      localStorage.setItem('ollama-chat-history', JSON.stringify(dataToSave));
      console.log('保存了Ollama聊天历史到localStorage:', dataToSave);
    } catch (err) {
      console.error('保存Ollama聊天历史出错:', err);
    }
  };
  
  // 添加一条Ollama聊天记录
  const addOllamaHistoryItem = (item: ExtendedAIHistoryItem) => {
    const updatedHistory = [...ollamaHistory, item];
    setOllamaHistory(updatedHistory);
    saveOllamaHistory(updatedHistory);
  };
  
  // 清除所有聊天历史，包括Ollama
  const handleClearHistory = () => {
    resetConversation();
    clearHistory();
    localStorage.removeItem('ollama-chat-history');
    setOllamaHistory([]);
    console.log('已清除所有聊天历史，包括Ollama');
  };

  // 添加一个手动刷新模型列表的方法
  const handleRefreshModels = async () => {
    setLoadingModels(true);
    setConfigFetched(false); // 重置配置状态，允许重新加载
    try {
      await loadModels(); // 调用加载模型的方法
    } catch (error) {
      console.error('刷新模型列表失败:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // 提取加载模型的逻辑为一个独立函数
  const loadModels = async () => {
    try {
      // 先从配置获取默认模型和提供商
      const config = await fetchAIConfig();
      
      // 创建模型选项列表
      const options: ModelOption[] = [];
      
      if (config && config.availableModels) {
        // 如果配置中有可用模型，优先使用
        config.availableModels.forEach(model => {
          options.push({
            value: model.id,
            label: model.name,
            provider: model.provider,
            isOllama: model.provider === 'Ollama' // 标记是否为Ollama模型
          });
        });
      } else if (config) {
        // 如果没有可用模型列表但有当前配置的模型
        options.push({
          value: config.model,
          label: config.model,
          provider: config.provider,
          isOllama: config.provider === 'Ollama' // 标记是否为Ollama模型
        });
      }
      
      // 额外获取Ollama模型
      try {
        // 尝试获取本地Ollama模型
        const ollamaApiUrl = config?.ollamaApiUrl || 'http://localhost:11434'; // 默认使用本地URL
        const ollamaModels = await aiService.getOllamaModels(ollamaApiUrl);
        if (ollamaModels && ollamaModels.length > 0) {
          ollamaModels.forEach(model => {
            options.push({
              value: model.name,
              label: `${model.name}${model.details?.parameter_size ? ` (${model.details.parameter_size})` : ''}`,
              provider: 'Ollama',
              isOllama: true, // 标记为Ollama模型
              ollamaApiUrl: ollamaApiUrl // 保存Ollama API地址
            });
          });
        }
      } catch (ollamaError) {
        console.warn('获取Ollama模型失败:', ollamaError);
      }
      
      setModelOptions(options);
      
      // 如果还没有选择过模型，使用默认配置的模型
      if (!selectedModel && config) {
        setSelectedModel(config.model);
      }
      
      setConfigFetched(true);
      return true;
    } catch (error) {
      console.error('加载AI模型失败:', error);
      return false;
    }
  };
  
  // 加载可用的AI模型
  useEffect(() => {
    if (configFetched) return;
    
    setLoadingModels(true);
    loadModels().finally(() => {
      setLoadingModels(false);
    });
  }, [aiService, fetchAIConfig, selectedModel, setSelectedModel, configFetched]);

  // 当历史记录更新时，保存到localStorage
  useEffect(() => {
    if (history.length > 0) {
      const chatHistory = history.filter(item => item.type === 'chat');
      saveChatHistoryToStorage(chatHistory);
    }
  }, [history]);

  // 合并系统历史记录和本地历史记录
  const mergedChatHistory = useMemo(() => {
    // 添加日志，查看当前记录状态
    console.log('系统聊天历史:', history.filter(item => item.type === 'chat'));
    console.log('Ollama聊天历史:', ollamaHistory);
    
    // 确保每条记录都有id和timestamp
    const processedSystemHistory: ExtendedAIHistoryItem[] = history.filter(item => item.type === 'chat').map(item => ({
      ...item,
      id: item.id || `sys_${item.timestamp || Date.now()}`,
      timestamp: item.timestamp || Date.now(),
      source: 'system' // 标记来源为系统
    }));
    
    // Ollama历史记录已经是ExtendedAIHistoryItem类型
    const processedOllamaHistory = ollamaHistory;
    
    // 合并并排序
    const combinedHistory = [...processedSystemHistory, ...processedOllamaHistory]
      .sort((a, b) => a.timestamp - b.timestamp);
      
    console.log('合并后的聊天历史:', combinedHistory);
    return combinedHistory;
  }, [history, ollamaHistory]);

  // 强制滚动到底部的函数
  const scrollToBottom = (smooth = true) => {
    // 直接使用chatContainerRef滚动到底部
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const scrollHeight = container.scrollHeight;
      
      // 记录滚动前状态
      const beforeScroll = {
        scrollHeight,
        clientHeight: container.clientHeight,
        scrollTop: container.scrollTop
      };
      
      console.log('滚动前状态:', beforeScroll);
      
      // 立即滚动到底部
      container.scrollTop = scrollHeight;
      
      // 如果需要平滑滚动，使用scrollTo API
      if (smooth) {
        try {
          container.scrollTo({
            top: scrollHeight,
            behavior: 'smooth'
          });
        } catch (e) {
          console.error('平滑滚动失败，使用直接滚动', e);
          container.scrollTop = scrollHeight;
        }
      }
      
      // 记录滚动后状态
      setTimeout(() => {
        const afterScroll = {
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          scrollTop: container.scrollTop
        };
        
        console.log('滚动后状态:', afterScroll);
        console.log('是否滚动到底部:', afterScroll.scrollTop + afterScroll.clientHeight >= afterScroll.scrollHeight);
      }, 50);
    } else {
      console.warn('滚动容器未找到');
    }
  };

  // 当任何可能影响滚动的内容变化时，滚动到底部
  useEffect(() => {
    // 使用requestAnimationFrame确保DOM已更新
    const scrollId = requestAnimationFrame(() => {
      scrollToBottom();
      
      // 双重保险，100ms后再次滚动，确保所有内容都已加载
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    });
    
    return () => cancelAnimationFrame(scrollId);
  }, [mergedChatHistory.length, pendingMessage, ollamaResponse]);

  // 初始加载时滚动到底部
  useEffect(() => {
    // 等待DOM完全加载
    const timer = setTimeout(() => {
      scrollToBottom(false);
      console.log('初始化滚动到底部');
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // 当加载组件时将显示模式输出到控制台
  useEffect(() => {
    console.log('============================================');
    console.log('AI聊天组件已加载');
    console.log('当前AI模型:', selectedModel);
    console.log('当前可用模型:', modelOptions);
    console.log('系统历史记录数量:', history.filter(item => item.type === 'chat').length);
    console.log('Ollama历史记录数量:', ollamaHistory.length);
    console.log('============================================');
  }, []);

  // 发送消息
  const handleSend = async () => {
    if (!message.trim()) return;
    
    // 设置待处理消息，在UI中立即显示
    setPendingMessage(message);
    
    // 获取选中的模型信息
    const selectedModelInfo = modelOptions.find(option => option.value === selectedModel);
    const userMessage = message.trim();
    
    // 清空输入框
    setMessage('');
    
    // 如果是Ollama模型，使用Ollama API
    if (selectedModelInfo?.isOllama && selectedModelInfo.ollamaApiUrl) {
      await handleOllamaChat(userMessage, selectedModelInfo);
    } else {
      // 使用标准聊天接口
      await chatWithAI(userMessage);
    }
    
    // 消息处理完成后清除待处理状态
    setPendingMessage(null);
  };

  // 处理Ollama聊天
  const handleOllamaChat = async (userMessage: string, modelInfo: ModelOption) => {
    console.log('开始Ollama聊天, 模型:', modelInfo);
    // 标记开始处理Ollama请求
    setProcessingOllama(true);
    setOllamaResponse('');
    
    try {
      // 创建Ollama消息格式
      const messages = [{ role: 'user' as const, content: userMessage }];
      const apiUrl = modelInfo.ollamaApiUrl || 'http://localhost:11434';
      const modelName = modelInfo.value;
      
      console.log(`请求Ollama API ${apiUrl}, 模型: ${modelName}`);
      
      // 使用流式响应
      let fullResponse = '';
      const response = await aiService.ollamaChat(apiUrl, modelName, messages, {}, true);
      const reader = response.body?.getReader();
      
      if (!reader) {
        throw new Error('无法获取Ollama响应流');
      }
      
      // 处理流式响应
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullResponse += data.message.content;
              
              // 实时更新UI显示
              setOllamaResponse(fullResponse);
            }
          } catch (e) {
            console.warn('解析Ollama流式响应失败:', e);
          }
        }
      }
      
      console.log('Ollama响应完成, 内容长度:', fullResponse.length);
      
      // 构造聊天响应对象
      const aiResponse: AIResponse = {
        code: 0,
        message: '使用Ollama本地模型',
        data: {
          reply: fullResponse
        }
      };
      
      // 创建历史记录项 - 使用明确的ID格式避免冲突
      const timestamp = Date.now();
      const historyItem: ExtendedAIHistoryItem = {
        id: `ollama_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        prompt: userMessage,
        response: aiResponse,
        type: 'chat',
        model: `${modelInfo.provider}:${modelInfo.value}`,
        timestamp: timestamp,
        source: 'ollama' // 显式标记来源
      };
      
      console.log('创建Ollama聊天历史:', historyItem);
      
      // 添加到Ollama历史记录
      addOllamaHistoryItem(historyItem);
      
    } catch (error) {
      console.error('Ollama聊天出错:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      
      console.error(`Ollama请求失败: ${errorMsg}`);
      
      // 简单显示错误消息
      setOllamaResponse(`Ollama请求失败: ${errorMsg}\n\n请确保Ollama服务正在运行并且模型已下载。`);
      
      // 创建错误响应
      const errorResponse: AIResponse = {
        code: 1,
        message: `Ollama请求失败: ${errorMsg}`,
        data: `请确保Ollama服务正在运行并且模型已下载。错误: ${errorMsg}`
      };
      
      // 创建错误历史记录 - 同样使用明确的ID格式
      const timestamp = Date.now();
      const errorItem: ExtendedAIHistoryItem = {
        id: `ollama_error_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        prompt: userMessage,
        response: errorResponse,
        type: 'chat',
        model: `${modelInfo.provider}:${modelInfo.value}`,
        timestamp: timestamp,
        source: 'ollama' // 显式标记来源
      };
      
      console.log('创建Ollama错误历史记录:', errorItem);
      
      // 添加到Ollama历史记录
      addOllamaHistoryItem(errorItem);
      
    } finally {
      setProcessingOllama(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理模型变更
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    // 更换模型时重置对话
    resetConversation();
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <Button
          type="text"
          icon={<ClearOutlined />}
          onClick={handleClearHistory}
        >
          清除对话历史
        </Button>
        
        <div className={styles.modelSelectWrapper}>
          <Select
            placeholder="选择模型"
            value={selectedModel}
            onChange={handleModelChange}
            loading={loadingModels}
            className={styles.modelSelect}
            optionLabelProp="label"
          >
            {modelOptions.map(option => (
              <Option key={option.value} value={option.value} label={option.label}>
                <div>
                  <span>{option.label}</span>
                  {option.provider && (
                    <span className={styles.modelInfo}>
                      ({option.provider})
                    </span>
                  )}
                </div>
              </Option>
            ))}
          </Select>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={handleRefreshModels}
            loading={loadingModels}
            className={styles.refreshButton}
            title="刷新模型列表"
          />
        </div>
      </div>
    
      <div className={styles.chatMessages} ref={chatContainerRef}>
        {mergedChatHistory.length === 0 && !pendingMessage && !processingOllama ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="开始与AI助手对话吧"
            className={styles.emptyChat}
          />
        ) : (
          <div>
            {/* 历史聊天记录 */}
            {mergedChatHistory.map((item: ExtendedAIHistoryItem, index) => (
              <React.Fragment key={item.id || index}>
                {/* 用户消息 */}
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
                
                {/* AI响应 */}
                {item.response && item.response.data && (
                  <List.Item className={styles.messageItem}>
                    <div className={styles.aiMessage}>
                      <div className={styles.messageHeader}>
                        <Avatar
                          icon={<RobotOutlined />}
                          className={item.source === 'ollama' ? styles.ollamaAvatar : styles.aiAvatar}
                        />
                        <Text strong>
                          AI助手{item.model ? ` (${item.model})` : ''}
                          {item.source === 'ollama' && (
                            <span className={styles.sourceTag}>[本地]</span>
                          )}
                        </Text>
                      </div>
                      <div className={styles.messageContent}>
                        <ReactMarkdown>
                          {getReplyContent(item.response.data)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </List.Item>
                )}
              </React.Fragment>
            ))}
        
            {/* 待处理的用户消息 */}
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
            
            {/* Ollama流式响应 */}
            {processingOllama && ollamaResponse && (
              <List.Item className={styles.messageItem}>
                <div className={styles.aiMessage}>
                  <div className={styles.messageHeader}>
                    <Avatar
                      icon={<RobotOutlined />}
                      className={styles.ollamaAvatar}
                    />
                    <Text strong>AI助手 (Ollama:{selectedModel})</Text>
                  </div>
                  <div className={styles.messageContent}>
                    <ReactMarkdown>
                      {ollamaResponse}
                    </ReactMarkdown>
                  </div>
                </div>
              </List.Item>
            )}
            
            {/* 加载指示器 */}
            {(loading || (processingOllama && !ollamaResponse)) && (
              <List.Item className={styles.messageItem}>
                <div className={styles.aiMessage}>
                  <div className={styles.messageHeader}>
                    <Avatar
                      icon={<RobotOutlined />}
                      className={styles.aiAvatar}
                    />
                    <Text strong>AI助手{selectedModel ? ` (${selectedModel})` : ''}</Text>
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
        
        {/* 底部引用点，放在消息列表内部末尾 */}
        <div 
          ref={messagesEndRef} 
          style={{ height: '1px', margin: 0, padding: 0 }}
        />
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
          disabled={!message.trim() || loading || processingOllama}
          className={styles.sendButton}
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default AIChat;