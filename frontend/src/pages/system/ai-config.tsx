import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  InputNumber,
  message, 
  Divider, 
  Spin,
  Switch,
  Tooltip,
  Alert 
} from 'antd';
import { 
  CloudServerOutlined, 
  ApiOutlined, 
  ExclamationCircleOutlined,
  KeyOutlined,
  InfoCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import MainLayout from '@/components/layout/MainLayout';
import { useAIHelper } from '@/hooks/useAIHelper';
import styles from '@/styles/system/ai-config.module.scss';
import { AIProviderEnum, PRESET_MODELS, type AIProvider } from '@/types';

/**
 * AI配置管理页面
 */
function AIConfig() {
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOllamaModels, setLoadingOllamaModels] = useState(false);
  const { 
    fetchAIConfig, 
    updateAIConfig, 
    testAIConfig,
    aiService 
  } = useAIHelper();

  const [availableProviders, setAvailableProviders] = useState([
    { value: AIProviderEnum.OPENAI, label: 'OpenAI' },
    { value: AIProviderEnum.DEEPSEEK, label: 'DeepSeek' },
    { value: AIProviderEnum.OLLAMA, label: 'Ollama (本地模型)' },
  ]);
  
  const [availableModels, setAvailableModels] = useState<{[key: string]: {value: string, label: string}[]}>({});
  const [showApiKey, setShowApiKey] = useState(true);
  const [showOllamaFields, setShowOllamaFields] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{connected: boolean; message: string} | null>(null);
  
  // 处理提供商变更
  const handleProviderChange = (value: string) => {
    form.setFieldsValue({ model: undefined }); // 清除已选模型
    
    // 根据选择的提供商决定是否显示API Key输入框
    setShowApiKey(value !== AIProviderEnum.OLLAMA);
    
    // 显示Ollama特有字段
    setShowOllamaFields(value === AIProviderEnum.OLLAMA);
    
    // 更新可用模型列表
    updateModelOptions(value);
    
    // 如果选择Ollama，尝试加载本地模型列表
    if (value === AIProviderEnum.OLLAMA) {
      loadOllamaModels();
    }
  };
  
  // 加载Ollama模型列表
  const loadOllamaModels = async () => {
    const ollamaUrl = form.getFieldValue('ollamaApiUrl') || 'http://localhost:11434';
    setLoadingOllamaModels(true);
    setOllamaStatus(null);
    
    try {
      const models = await aiService.getOllamaModels(ollamaUrl);
      
      if (models && models.length > 0) {
        const modelOptions = models.map(model => ({
          value: model.name,
          label: `${model.name}${model.details?.parameter_size ? ` (${model.details.parameter_size})` : ''}`
        }));
        
        setAvailableModels(prevModels => ({
          ...prevModels,
          [AIProviderEnum.OLLAMA]: modelOptions
        }));
        
        setOllamaStatus({
          connected: true,
          message: `已连接到Ollama服务，检测到${models.length}个模型`
        });
      } else {
        setOllamaStatus({
          connected: false,
          message: '已连接到Ollama服务，但未检测到可用模型，请确保至少下载了一个模型'
        });
      }
    } catch (error) {
      console.error('加载Ollama模型失败:', error);
      setOllamaStatus({
        connected: false,
        message: '连接Ollama服务失败，请确认服务是否启动'
      });
      
      // 使用默认模型列表
      updateModelOptions(AIProviderEnum.OLLAMA);
    } finally {
      setLoadingOllamaModels(false);
    }
  };
  
  // 更新模型选项
  const updateModelOptions = (provider: string) => {
    if (PRESET_MODELS[provider as AIProvider]) {
      const models = PRESET_MODELS[provider as AIProvider].map(model => ({
        value: model,
        label: model
      }));
      setAvailableModels(prevModels => ({
        ...prevModels,
        [provider]: models
      }));
    }
  };
  
  // 在页面加载时初始化模型列表
  useEffect(() => {
    // 初始化各提供商的模型列表
    Object.keys(PRESET_MODELS).forEach(provider => {
      updateModelOptions(provider);
    });
  }, []);

  // 加载AI配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fetchAIConfig();
        if (config) {
          // 设置表单默认值
          form.setFieldsValue({
            provider: config.provider,
            model: config.model,
            apiKey: '••••••••••••••••••••', // 出于安全考虑，不显示完整API密钥
            baseUrl: config.baseUrl,
            ollamaApiUrl: config.ollamaApiUrl || 'http://localhost:11434',
            temperature: config.temperature || 0.7,
            dailyTokenLimit: config.usageLimit?.dailyTokenLimit,
            userTokenLimit: config.usageLimit?.userTokenLimit,
            requestsPerMinute: config.rateLimit?.requestsPerMinute,
            tokensPerHour: config.rateLimit?.tokensPerHour,
            monitoringEnabled: config.monitoringEnabled,
          });

          // 如果有返回可用提供商，更新选项
          if (config.availableProviders && Array.isArray(config.availableProviders)) {
            const formattedProviders = config.availableProviders.map(provider => ({
              value: provider,
              label: provider === 'Claude' ? 'Claude (Anthropic)' : 
                   provider === 'Ollama' ? 'Ollama (本地模型)' : provider
            }));
            setAvailableProviders(formattedProviders);
          }

          // 根据提供商设置显示状态
          setShowApiKey(config.provider !== AIProviderEnum.OLLAMA);
          setShowOllamaFields(config.provider === AIProviderEnum.OLLAMA);
          
          // 根据当前提供商更新模型列表
          updateModelOptions(config.provider);
          
          // 如果当前配置是Ollama，尝试加载本地模型
          if (config.provider === AIProviderEnum.OLLAMA) {
            loadOllamaModels();
          }
        }
      } catch (error) {
        message.error('获取AI配置失败');
        console.error('获取AI配置失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // 测试AI配置
  const handleTest = async () => {
    try {
      await form.validateFields(['provider', 'model']);
      
      const values = form.getFieldsValue();
      setTesting(true);
      
      // 添加Ollama API地址
      const testParams = {
        provider: values.provider, 
        model: values.model,
        apiKey: values.apiKey,
        baseUrl: values.baseUrl,
        ollamaApiUrl: values.provider === AIProviderEnum.OLLAMA ? values.ollamaApiUrl : undefined
      };
      
      if (values.provider === AIProviderEnum.OLLAMA) {
        testParams.apiKey = 'not-required'; // Ollama通常不需要API密钥
      }
      
      const result = await testAIConfig(
        testParams.provider, 
        testParams.model,
        testParams.apiKey,
        testParams.baseUrl,
        testParams.ollamaApiUrl // 添加Ollama API地址参数
      );
      
      if (result && result.success) {
        message.success('连接测试成功');
      } else {
        message.error(`连接测试失败: ${result?.message || '未知错误'}`);
      }
    } catch (error) {
      message.error('表单验证失败，请检查填写内容');
    } finally {
      setTesting(false);
    }
  };

  // 保存AI配置
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // 构造符合后端要求的配置参数
      const configParams = {
        provider: values.provider,
        model: values.model,
        apiKey: values.apiKey && values.apiKey.includes('•') ? undefined : values.apiKey, // 如果没有修改，则不提交
        baseUrl: values.baseUrl,
        ollamaApiUrl: values.provider === AIProviderEnum.OLLAMA ? values.ollamaApiUrl : undefined,
        temperature: values.temperature,
        usageLimit: {
          dailyTokenLimit: values.dailyTokenLimit,
          userTokenLimit: values.userTokenLimit,
        },
        rateLimit: {
          requestsPerMinute: values.requestsPerMinute,
          tokensPerHour: values.tokensPerHour,
        },
        monitoringEnabled: values.monitoringEnabled,
      };
      
      const success = await updateAIConfig(configParams);
      
      if (success) {
        message.success('AI配置更新成功');
      } else {
        message.error('AI配置更新失败');
      }
    } catch (error) {
      message.error('表单验证失败，请检查填写内容');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="AI配置 - 系统设置">
      <div className={styles.container}>
        <Card 
          title={
            <div className={styles.cardTitle}>
              <CloudServerOutlined /> AI服务配置
            </div>
          }
          bordered={false}
          className={styles.card}
        >
          <Spin spinning={loading}>
            <Form
              form={form}
              layout="vertical"
              requiredMark="optional"
              preserve={false}
            >
              <div className={styles.formSection}>
                <h3>基本设置</h3>
                
                <Form.Item
                  name="provider"
                  label="AI提供商"
                  rules={[{ required: true, message: '请选择AI提供商' }]}
                  extra="选择要使用的AI服务提供商"
                >
                  <Select
                    options={availableProviders}
                    placeholder="选择AI提供商"
                    onChange={handleProviderChange}
                  />
                </Form.Item>
                
                {showOllamaFields && ollamaStatus && (
                  <Alert
                    message={ollamaStatus.message}
                    type={ollamaStatus.connected ? "success" : "warning"}
                    showIcon
                    style={{ marginBottom: '16px' }}
                    action={
                      ollamaStatus.connected && (
                        <Button size="small" type="primary" onClick={() => window.open('/ollama-test', '_blank')}>
                          测试Ollama模型
                        </Button>
                      )
                    }
                  />
                )}
                
                <Form.Item
                  name="model"
                  label="模型"
                  rules={[{ required: true, message: '请选择模型' }]}
                  extra="选择AI模型"
                >
                  <Select
                    placeholder="选择模型"
                    loading={loadingOllamaModels && showOllamaFields}
                    options={availableModels[form.getFieldValue('provider')] || []}
                  />
                </Form.Item>
                
                {showApiKey && (
                  <Form.Item
                    name="apiKey"
                    label={
                      <span>
                        API密钥 <Tooltip title="API密钥将加密存储，出于安全考虑不会完整显示">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </span>
                    }
                    rules={[{ required: showApiKey, message: '请输入API密钥' }]}
                  >
                    <Input
                      prefix={<KeyOutlined />}
                      placeholder="输入API密钥"
                    />
                  </Form.Item>
                )}
                
                {showOllamaFields ? (
                  <Form.Item
                    name="ollamaApiUrl"
                    label="Ollama API地址"
                    rules={[{ required: showOllamaFields, message: '请输入Ollama API地址' }]}
                    extra="本地Ollama服务地址，默认为http://localhost:11434"
                  >
                    <Input
                      prefix={<ApiOutlined />}
                      placeholder="例如: http://localhost:11434"
                      suffix={
                        <Tooltip title="检测可用模型">
                          <Button 
                            type="text" 
                            icon={<ReloadOutlined />} 
                            loading={loadingOllamaModels}
                            onClick={loadOllamaModels}
                          />
                        </Tooltip>
                      }
                    />
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="baseUrl"
                    label="API基础URL"
                    rules={[{ required: !showOllamaFields, message: '请输入API基础URL' }]}
                    extra="API服务地址，默认或留空使用官方地址"
                  >
                    <Input
                      prefix={<ApiOutlined />}
                      placeholder="例如: https://api.openai.com/v1"
                    />
                  </Form.Item>
                )}
                
                <Form.Item
                  name="temperature"
                  label="温度值"
                  extra="控制AI回复的创意度/随机性，0最保守，1最创意"
                  rules={[{ required: true, message: '请输入温度值' }]}
                >
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
              
              <Divider />
              
              <div className={styles.formSection}>
                <h3>使用限制</h3>
                
                <Form.Item
                  name="dailyTokenLimit"
                  label="每日Token限制"
                  extra="系统每日可使用的总Token数量"
                  rules={[{ required: true, message: '请输入每日Token限制' }]}
                >
                  <InputNumber
                    min={1000}
                    step={1000}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="userTokenLimit"
                  label="用户Token限制"
                  extra="每个用户每日可使用的Token数量"
                  rules={[{ required: true, message: '请输入用户Token限制' }]}
                >
                  <InputNumber
                    min={100}
                    step={100}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="requestsPerMinute"
                  label="每分钟请求限制"
                  extra="限制系统每分钟可发送的API请求数"
                  rules={[{ required: true, message: '请输入每分钟请求限制' }]}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="tokensPerHour"
                  label="每小时Token限制"
                  extra="限制系统每小时可使用的Token数量"
                  rules={[{ required: true, message: '请输入每小时Token限制' }]}
                >
                  <InputNumber
                    min={100}
                    step={100}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
              
              <Divider />
              
              <div className={styles.formSection}>
                <h3>监控与日志</h3>
                
                <Form.Item
                  name="monitoringEnabled"
                  label="启用使用监控"
                  valuePropName="checked"
                  extra="记录并统计AI使用情况，包括请求数、Token使用量等"
                >
                  <Switch />
                </Form.Item>
              </div>
              
              <div className={styles.formActions}>
                <Button 
                  type="default"
                  onClick={handleTest}
                  loading={testing}
                  disabled={loading}
                >
                  测试连接
                </Button>
                <Button 
                  type="primary"
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={testing}
                >
                  保存配置
                </Button>
              </div>
            </Form>
          </Spin>
        </Card>
      </div>
    </MainLayout>
  );
}

export default AIConfig;