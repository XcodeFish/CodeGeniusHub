import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  message, 
  Popconfirm, 
  Select,
  Tabs,
  Typography,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  SyncOutlined,
  CodeOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import MainLayout from '@/components/layout/MainLayout';
import { useAIHelper } from '@/hooks/useAIHelper';
import { PromptTemplate } from '@/types';
import styles from '@/styles/system/prompt-templates.module.scss';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

/**
 * 提示词模板管理页面
 */
function PromptTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [testVisible, setTestVisible] = useState(false);
  const [testTemplate, setTestTemplate] = useState<string>('');
  const [testVariables, setTestVariables] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const [testLoading, setTestLoading] = useState(false);
  const [form] = Form.useForm();

  const { 
    getPromptTemplates, 
    testPromptTemplate, 
    aiService 
  } = useAIHelper();

  // 获取提示词模板列表
  useEffect(() => {
    fetchTemplates();
  }, []);

  // 获取提示词模板列表
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await aiService.getPromptTemplates();
      // 正确处理API返回的嵌套结构
      const templatesData = response.templates || [];
      setTemplates(templatesData);
    } catch (error) {
      message.error('获取提示词模板失败');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始化系统模板
  const handleInitTemplates = async () => {
    try {
      setLoading(true);
      const result = await aiService.initPromptTemplates();
      
      if (result && result.count > 0) {
        message.success(`成功初始化${result.count}个系统提示词模板`);
        await fetchTemplates(); // 刷新列表
      } else {
        message.info('没有新的系统模板需要初始化');
      }
    } catch (error) {
      message.error('初始化提示词模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开创建/编辑模态框
  const showModal = (record?: PromptTemplate) => {
    setEditingTemplate(record || null);
    
    if (record) {
      form.setFieldsValue({
        name: record.name,
        description: record.description,
        template: record.template,
        type: record.type,
        tags: record.tags || [],
        language: record.language || undefined,
        framework: record.framework || undefined,
      });
    } else {
      form.resetFields();
    }
    
    setVisible(true);
  };
  
  // 关闭模态框
  const handleCancel = () => {
    setVisible(false);
    form.resetFields();
    setEditingTemplate(null);
  };

  // 提交创建/更新
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (editingTemplate) {
        const templateId = editingTemplate._id || editingTemplate.id;
        if (!templateId) {
          message.error('模板ID无效，无法更新');
          return;
        }
        await aiService.updatePromptTemplate(templateId, values);
        message.success('提示词模板更新成功');
      } else {
        await aiService.createPromptTemplate(values);
        message.success('提示词模板创建成功');
      }
      
      setVisible(false);
      form.resetFields();
      fetchTemplates();
    } catch (error) {
      message.error('操作失败，请检查表单');
    } finally {
      setLoading(false);
    }
  };

  // 删除提示词模板
  const handleDelete = async (id: string | undefined) => {
    if (!id) {
      message.error('模板ID无效');
      return;
    }
    try {
      setLoading(true);
      await aiService.deletePromptTemplate(id as string);
      message.success('提示词模板删除成功');
      fetchTemplates();
    } catch (error) {
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试提示词模板
  const showTestModal = (template: string) => {
    setTestTemplate(template);
    setTestVariables('{\n  "example": "value"\n}');
    setTestResult('');
    setTestVisible(true);
  };

  // 执行测试
  const handleTest = async () => {
    setTestLoading(true);
    try {
      // 解析变量JSON
      let variables = {};
      try {
        variables = testVariables ? JSON.parse(testVariables) : {};
      } catch (e) {
        message.error('变量格式错误，请提供有效的JSON');
        setTestLoading(false);
        return;
      }
      
      const result = await testPromptTemplate(testTemplate, variables);
      
      if (result) {
        setTestResult(result.renderedPrompt);
        message.success(`测试成功，使用了${result.tokensUsed}个tokens`);
      } else {
        setTestResult('测试失败，未返回结果');
        message.error('测试失败');
      }
    } catch (error) {
      message.error('测试失败，请检查模板格式');
    } finally {
      setTestLoading(false);
    }
  };
  
  // 表格列定义
  const columns: ColumnsType<PromptTemplate> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      filters: [
        { text: '聊天', value: 'chat' },
        { text: '代码解释', value: 'explain' },
        { text: '代码生成', value: 'code-generation' },
        { text: '代码优化', value: 'code-optimization' },
        { text: '代码分析', value: 'code-analysis' },
      ],
      onFilter: (value, record) => 
        record.type === value,
      render: (type) => {
        const typeMap: Record<string, string> = {
          'chat': '聊天',
          'explain': '代码解释',
          'code-generation': '代码生成',
          'code-optimization': '代码优化',
          'code-analysis': '代码分析'
        };
        return typeMap[type] || type || '未分类';
      }
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <span>
          {tags && tags.map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </span>
      ),
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 80,
      ellipsis: true,
    },
    {
      title: '框架',
      dataIndex: 'framework',
      key: 'framework',
      width: 80,
      ellipsis: true,
    },
    {
      title: '系统模板',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 90,
      render: (isSystem: boolean) => (
        isSystem ? '是' : '否'
      ),
      filters: [
        { text: '系统', value: 'true' },
        { text: '自定义', value: 'false' },
      ],
      onFilter: (value, record) => 
        record.isSystem === (value === 'true'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<CodeOutlined />}
            size="small"
            onClick={() => showTestModal(record.template)}
            title="测试"
          >
            测试
          </Button>
          
          {!record.isSystem && (
            <>
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => showModal(record)}
                title="编辑"
              />
              
              <Popconfirm
                title="确定要删除这个提示词模板吗？"
                onConfirm={() => {
                  const templateId = record._id || record.id;
                  if (templateId) {
                    handleDelete(templateId);
                  }
                }}
                okText="确认"
                cancelText="取消"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  title="删除"
                />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <MainLayout title="提示词模板管理 - 系统设置">
      <div className={styles.container}>
        <Card
          title={
            <div className={styles.cardTitle}>
              <FileTextOutlined /> 提示词模板管理
            </div>
          }
          extra={
            <Space>
              <Button
                icon={<SyncOutlined />}
                onClick={handleInitTemplates}
              >
                初始化系统模板
              </Button>
              
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal()}
              >
                创建模板
              </Button>
            </Space>
          }
          bordered={false}
          className={styles.card}
        >
          <Table
            columns={columns}
            dataSource={templates || []}
            rowKey={(record) => record._id || record.id || ''}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
        
        {/* 创建/编辑模态框 */}
        <Modal
          title={`${editingTemplate ? '编辑' : '创建'}提示词模板`}
          open={visible}
          onOk={handleSubmit}
          onCancel={handleCancel}
          width={800}
          okText="确认"
          cancelText="取消"
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              name="name"
              label="名称"
              rules={[{ required: true, message: '请输入模板名称' }]}
            >
              <Input placeholder="输入模板名称" maxLength={50} />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="描述"
              rules={[{ required: true, message: '请输入模板描述' }]}
            >
              <Input placeholder="简要描述此模板的用途" maxLength={200} />
            </Form.Item>
            
            <Form.Item
              name="type"
              label="类型"
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Select placeholder="选择类型">
                <Select.Option value="chat">聊天</Select.Option>
                <Select.Option value="explain">代码解释</Select.Option>
                <Select.Option value="code-generation">代码生成</Select.Option>
                <Select.Option value="code-optimization">代码优化</Select.Option>
                <Select.Option value="code-analysis">代码分析</Select.Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="tags"
              label="标签"
              extra="多个标签用逗号分隔"
            >
              <Select 
                mode="tags"
                tokenSeparators={[',']}
                placeholder="输入标签，回车或逗号分隔"
              />
            </Form.Item>
            
            <Form.Item
              name="language"
              label="编程语言"
            >
              <Input placeholder="可选，如JavaScript, Python等" />
            </Form.Item>
            
            <Form.Item
              name="framework"
              label="框架"
            >
              <Input placeholder="可选，如React, Vue等" />
            </Form.Item>
            
            <Form.Item
              name="template"
              label="模板内容"
              rules={[{ required: true, message: '请输入模板内容' }]}
              extra="使用 {{变量名}} 语法插入变量"
            >
              <TextArea rows={10} placeholder="输入提示词模板内容，可以使用 {{变量名}} 语法" />
            </Form.Item>
          </Form>
        </Modal>
        
        {/* 测试模态框 */}
        <Modal
          title="测试提示词模板"
          open={testVisible}
          onCancel={() => setTestVisible(false)}
          footer={[
            <Button key="back" onClick={() => setTestVisible(false)}>
              关闭
            </Button>,
            <Button key="submit" type="primary" loading={testLoading} onClick={handleTest}>
              测试
            </Button>
          ]}
          width={800}
        >
          <Tabs 
            defaultActiveKey="template"
            items={[
              {
                key: 'template',
                label: '模板',
                children: (
                  <TextArea
                    rows={5}
                    value={testTemplate}
                    onChange={(e) => setTestTemplate(e.target.value)}
                    placeholder="提示词模板"
                  />
                )
              },
              {
                key: 'variables',
                label: '变量',
                children: (
                  <TextArea
                    rows={5}
                    value={testVariables}
                    onChange={(e) => setTestVariables(e.target.value)}
                    placeholder='JSON格式的变量，如: { "name": "value" }'
                  />
                )
              },
              {
                key: 'result',
                label: '结果',
                children: (
                  testResult ? (
                    <div className={styles.testResult}>
                      <TextArea
                        rows={10}
                        value={testResult}
                        readOnly
                      />
                    </div>
                  ) : (
                    <Paragraph className={styles.noResult}>
                      测试后查看渲染结果
                    </Paragraph>
                  )
                )
              }
            ]}
          />
        </Modal>
      </div>
    </MainLayout>
  );
}

export default PromptTemplates; 