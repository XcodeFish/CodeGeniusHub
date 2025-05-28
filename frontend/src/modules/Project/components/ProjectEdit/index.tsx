import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { useProject } from '../../hooks/useProject';
import { ProjectDetail } from '@/types';

const { TextArea } = Input;

interface ProjectEditProps {
  project: ProjectDetail;
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * 项目编辑组件
 */
const ProjectEdit: React.FC<ProjectEditProps> = ({
  project,
  visible,
  onCancel,
  onSuccess
}) => {
  const { updateProject } = useProject();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // 初始化表单数据
  useEffect(() => {
    if (visible && project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description
      });
    }
  }, [form, project, visible]);
  
  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const success = await updateProject(project.projectId, values);
      if (success) {
        onSuccess();
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      title="编辑项目"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading} 
          onClick={handleSubmit}
        >
          保存
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
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
      </Form>
    </Modal>
  );
};

export default ProjectEdit; 