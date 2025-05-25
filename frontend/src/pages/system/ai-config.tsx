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
  Tooltip 
} from 'antd';
import { 
  CloudServerOutlined, 
  ApiOutlined, 
  ExclamationCircleOutlined,
  KeyOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import MainLayout from '@/components/layout/MainLayout';
import { useAIHelper } from '@/hooks/useAIHelper';
import styles from '@/styles/system/ai-config.module.scss';

/**
 * AI配置管理页面
 */
function AIConfig() {
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { 
    fetchAIConfig, 
    updateAIConfig, 
    testAIConfig 
  } = useAIHelper();
  const [availableProviders, setAvailableProviders] = useState([
    { value: 'OpenAI', label: 'OpenAI' },
    { value: 'Claude', label: 'Claude (Anthropic)' },
    { value: 'LocalLLM', label: 'LocalLLM (Ollama, Llama等)' },
  ]);

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
            temperature: config.temperature,
            dailyTokenLimit: config.usageLimit?.dailyTokenLimit,
            userTokenLimit: config.usageLimit?.userTokenLimit,
            requestsPerMinute: config.rateLimit?.requestsPerMinute,
            tokensPerHour: config.rateLimit?.tokensPerHour,
            monitoringEnabled: config.monitoringEnabled,
          });
        }
      } catch (error) {
        message.error('获取AI配置失败');
        console.error('获取AI配置失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [fetchAIConfig, form]);

  // 测试AI配置
  const handleTest = async () => {
    try {
      await form.validateFields(['provider', 'apiKey']);
      
      const values = form.getFieldsValue();
      setTesting(true);
      
      const result = await testAIConfig(
        values.provider, 
        values.model,
        values.apiKey,
        values.baseUrl
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
        apiKey: values.apiKey.includes('•') ? undefined : values.apiKey, // 如果没有修改，则不提交
        baseUrl: values.baseUrl,
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
                  />
                </Form.Item>
                
                <Form.Item
                  name="model"
                  label="模型"
                  rules={[{ required: true, message: '请输入模型名称' }]}
                  extra="例如: gpt-3.5-turbo, gpt-4, claude-2 等"
                >
                  <Input placeholder="输入模型名称" />
                </Form.Item>
                
                <Form.Item
                  name="apiKey"
                  label={
                    <span>
                      API密钥 <Tooltip title="API密钥将加密存储，出于安全考虑不会完整显示">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请输入API密钥' }]}
                >
                  <Input
                    prefix={<KeyOutlined />}
                    placeholder="输入API密钥"
                  />
                </Form.Item>
                
                <Form.Item
                  name="baseUrl"
                  label="API基础URL"
                  rules={[{ required: true, message: '请输入API基础URL' }]}
                  extra="API服务地址，默认或留空使用官方地址"
                >
                  <Input
                    prefix={<ApiOutlined />}
                    placeholder="例如: https://api.openai.com/v1"
                  />
                </Form.Item>
                
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
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
                
                <Form.Item
                  name="userTokenLimit"
                  label="每用户Token限制"
                  extra="每个用户每日可使用的Token数量"
                  rules={[{ required: true, message: '请输入每用户Token限制' }]}
                >
                  <InputNumber
                    min={100}
                    step={100}
                    style={{ width: '100%' }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
              </div>
              
              <Divider />
              
              <div className={styles.formSection}>
                <h3>高级设置</h3>
                
                <Form.Item
                  name="requestsPerMinute"
                  label="每分钟请求数限制"
                  extra="限制系统每分钟可发送的API请求数量"
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                
                <Form.Item
                  name="tokensPerHour"
                  label="每小时Token限制"
                  extra="限制系统每小时可使用的Token数量"
                >
                  <InputNumber
                    min={1000}
                    step={1000}
                    style={{ width: '100%' }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
                
                <Form.Item
                  name="monitoringEnabled"
                  label="启用监控"
                  valuePropName="checked"
                  extra="记录AI使用情况与统计"
                >
                  <Switch />
                </Form.Item>
              </div>
              
              <div className={styles.formActions}>
                <Button 
                  type="primary" 
                  ghost 
                  onClick={handleTest}
                  loading={testing}
                  icon={<ExclamationCircleOutlined />}
                >
                  测试连接
                </Button>
                
                <Button 
                  type="primary" 
                  onClick={handleSubmit}
                  loading={loading}
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