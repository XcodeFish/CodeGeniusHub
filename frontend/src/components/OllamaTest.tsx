import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Card, Space, Typography, Spin, message, Collapse, Descriptions, Badge } from 'antd';
import aiService, { OllamaModel, OllamaMessage } from '@/services/ai';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

/**
 * Ollama测试组件
 * 用于测试与本地Ollama服务的连接和功能
 */
const OllamaTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success?: boolean;
    version?: string;
    error?: string;
  }>({});
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [ollamaApiUrl, setOllamaApiUrl] = useState<string>('http://localhost:11434');
  const [streaming, setStreaming] = useState<boolean>(true);
  const [modelInfo, setModelInfo] = useState<Record<string, any> | null>(null);
  const [loadingModelInfo, setLoadingModelInfo] = useState<boolean>(false);

  // 测试Ollama连接
  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await aiService.testOllamaConnection(ollamaApiUrl);
      setConnectionStatus(result);
      if (result.success) {
        message.success(`成功连接到Ollama服务 (版本: ${result.version})`);
        loadModels();
      } else {
        message.error(`连接失败: ${result.error}`);
      }
    } catch (error) {
      console.error('测试连接时出错:', error);
      setConnectionStatus({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
      message.error('连接测试失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载模型列表
  const loadModels = async () => {
    setLoading(true);
    try {
      const modelList = await aiService.getOllamaModels(ollamaApiUrl);
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0].name);
        // 自动加载第一个模型的详细信息
        loadModelInfo(modelList[0].name);
      }
      message.success(`已加载 ${modelList.length} 个模型`);
    } catch (error) {
      console.error('加载模型列表失败:', error);
      message.error('加载模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载模型详细信息
  const loadModelInfo = async (modelName: string) => {
    if (!modelName) return;
    
    setLoadingModelInfo(true);
    setModelInfo(null);
    
    try {
      const info = await aiService.getOllamaModelInfo(ollamaApiUrl, modelName);
      setModelInfo(info);
    } catch (error) {
      console.error(`获取模型 ${modelName} 详细信息失败:`, error);
      message.error(`无法获取模型详细信息: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoadingModelInfo(false);
    }
  };

  // 处理模型选择变化
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    loadModelInfo(value);
  };

  // 发送聊天请求
  const sendChat = async () => {
    if (!selectedModel || !input.trim()) {
      message.warning('请选择模型并输入内容');
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const messages: OllamaMessage[] = [
        { role: 'user', content: input.trim() }
      ];

      if (streaming) {
        // 使用流式API
        const response = await aiService.ollamaChat(ollamaApiUrl, selectedModel, messages, {}, true);
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法获取响应流');
        }

        // 处理流式响应
        let fullResponse = '';
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
                setResponse(fullResponse);
              }
            } catch (e) {
              console.warn('解析流式响应失败:', e);
            }
          }
        }
      } else {
        // 使用非流式API
        const result = await aiService.ollamaChat(ollamaApiUrl, selectedModel, messages);
        setResponse(result.message.content);
      }
    } catch (error) {
      console.error('聊天请求失败:', error);
      message.error('聊天请求失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时测试连接
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Title level={2}>Ollama 本地模型测试</Title>
      
      <Collapse style={{ marginBottom: '20px' }}>
        <Panel header="Ollama使用指南" key="help">
          <Paragraph>
            <Text strong>Ollama是什么?</Text> Ollama允许您在本地运行开源大型语言模型，无需依赖云服务，保护隐私并节省API费用。
          </Paragraph>
          
          <Title level={4}>快速上手：</Title>
          <ol>
            <li>
              <Paragraph>
                <Text strong>安装Ollama：</Text> 从官方网站 <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a> 下载并安装对应平台的版本。
              </Paragraph>
            </li>
            <li>
              <Paragraph>
                <Text strong>启动服务：</Text> 安装后，Ollama服务会自动启动并监听11434端口。
              </Paragraph>
            </li>
            <li>
              <Paragraph>
                <Text strong>下载模型：</Text> 在终端中运行 <Text code>ollama pull llama3:8b</Text> 等命令下载模型。
              </Paragraph>
            </li>
            <li>
              <Paragraph>
                <Text strong>常用模型命令：</Text><br/>
                - 查看已安装模型：<Text code>ollama list</Text><br/>
                - 下载模型：<Text code>ollama pull [模型名称]</Text><br/>
                - 删除模型：<Text code>ollama rm [模型名称]</Text><br/>
                - 查看模型信息：<Text code>ollama show [模型名称]</Text>
              </Paragraph>
            </li>
          </ol>
          
          <Title level={4}>推荐模型：</Title>
          <ul>
            <li><Text strong>llama3:8b</Text> - Meta的最新开源模型，性能强大</li>
            <li><Text strong>mistral:7b</Text> - 良好的通用性能</li>
            <li><Text strong>codellama:13b</Text> - 专为代码生成优化</li>
            <li><Text strong>deepseek-coder:1.3b</Text> - 轻量级代码助手</li>
            <li><Text strong>mixtral:8x7b</Text> - 混合专家模型，性能优异</li>
          </ul>
        </Panel>
      </Collapse>

      <Card title="连接设置" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>Ollama API 地址:</Text>
            <Input 
              value={ollamaApiUrl} 
              onChange={e => setOllamaApiUrl(e.target.value)}
              placeholder="例如: http://localhost:11434"
              style={{ marginBottom: '10px' }}
            />
          </div>
          
          <div>
            <Space>
              <Button type="primary" onClick={testConnection} loading={loading}>
                测试连接
              </Button>
              <Button onClick={loadModels} loading={loading}>
                刷新模型列表
              </Button>
            </Space>
          </div>

          {connectionStatus.success !== undefined && (
            <div style={{ marginTop: '10px' }}>
              <Text type={connectionStatus.success ? 'success' : 'danger'}>
                连接状态: {connectionStatus.success ? '已连接' : '未连接'} 
                {connectionStatus.version && ` (版本: ${connectionStatus.version})`}
                {connectionStatus.error && ` - ${connectionStatus.error}`}
              </Text>
            </div>
          )}
        </Space>
      </Card>

      <Card title="模型聊天" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ marginBottom: '10px' }}>
            <Text>选择模型:</Text>
            <Select 
              value={selectedModel} 
              onChange={handleModelChange}
              style={{ width: '100%', marginTop: '5px' }}
              loading={loading}
              placeholder="请选择模型"
            >
              {models.map(model => (
                <Option key={model.name} value={model.name}>
                  {model.name} {model.details?.parameter_size && `(${model.details.parameter_size})`}
                </Option>
              ))}
            </Select>
          </div>

          {/* 添加模型详细信息显示 */}
          {selectedModel && (
            <Collapse>
              <Panel header="模型详细信息" key="1">
                <Spin spinning={loadingModelInfo}>
                  {modelInfo ? (
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label="模型名称">{modelInfo.name || selectedModel}</Descriptions.Item>
                      <Descriptions.Item label="模型系列">{modelInfo.details?.family || '未知'}</Descriptions.Item>
                      <Descriptions.Item label="参数规模">{modelInfo.details?.parameter_size || '未知'}</Descriptions.Item>
                      <Descriptions.Item label="量化级别">{modelInfo.details?.quantization_level || 'N/A'}</Descriptions.Item>
                      <Descriptions.Item label="模型格式">{modelInfo.details?.format || '未知'}</Descriptions.Item>
                      <Descriptions.Item label="模型大小">
                        {modelInfo.size ? `${(modelInfo.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : '未知'}
                      </Descriptions.Item>
                      <Descriptions.Item label="上下文窗口">
                        {modelInfo.context_window || modelInfo.details?.context_window || '未知'}
                      </Descriptions.Item>
                      <Descriptions.Item label="最后修改时间">
                        {modelInfo.modified_at || '未知'}
                      </Descriptions.Item>
                    </Descriptions>
                  ) : (
                    <Text>无法获取模型详细信息</Text>
                  )}
                </Spin>
              </Panel>
            </Collapse>
          )}

          <div style={{ marginBottom: '10px' }}>
            <Text>API类型:</Text>
            <Select 
              value={streaming ? 'stream' : 'normal'} 
              onChange={value => setStreaming(value === 'stream')}
              style={{ width: '100%', marginTop: '5px' }}
            >
              <Option value="stream">流式 API</Option>
              <Option value="normal">普通 API</Option>
            </Select>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <Text>输入消息:</Text>
            <TextArea 
              value={input} 
              onChange={e => setInput(e.target.value)}
              placeholder="请输入您的问题..."
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </div>
          
          <Button 
            type="primary" 
            onClick={sendChat} 
            loading={loading}
            disabled={!selectedModel || !input.trim()}
          >
            发送
          </Button>
          
          {response && (
            <div style={{ marginTop: '20px' }}>
              <Text strong>模型回复:</Text>
              <Card style={{ marginTop: '5px', background: '#f5f5f5' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{response}</div>
              </Card>
            </div>
          )}
        </Space>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Spin tip="处理中..." />
        </div>
      )}
    </div>
  );
};

export default OllamaTest; 