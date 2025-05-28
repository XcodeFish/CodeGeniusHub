import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useProject } from '../../hooks/useProject';
import styles from './styles.module.scss';

const { TextArea } = Input;

/**
 * 项目创建组件
 */
const ProjectCreate: React.FC = () => {
  const { createProject, navigateToProject, navigateToProjectList } = useProject();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // 处理表单提交
  const handleSubmit = async (values: { name: string; description?: string }) => {
    setLoading(true);
    try {
      const projectId = await createProject(values);
      if (projectId) {
        message.success('项目创建成功');
        navigateToProject(projectId);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 返回项目列表
  const handleBack = () => {
    navigateToProjectList();
  };

  return (
    <div className={styles.projectCreateContainer}>
      <div className={styles.header}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          className={styles.backButton}
        >
          返回项目列表
        </Button>
        <h1>创建新项目</h1>
      </div>
      
      <Card className={styles.formCard}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { min: 3, max: 30, message: '项目名称长度为3-30个字符' }
            ]}
          >
            <Input placeholder="请输入项目名称" maxLength={30} />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="项目描述"
            rules={[
              { max: 200, message: '项目描述最多200个字符' }
            ]}
          >
            <TextArea 
              placeholder="请输入项目描述（选填）" 
              autoSize={{ minRows: 4, maxRows: 6 }}
              maxLength={200}
              showCount
            />
          </Form.Item>
          
          <Form.Item className={styles.formButtons}>
            <Button type="default" onClick={handleBack} className={styles.cancelButton}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              创建项目
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProjectCreate; 