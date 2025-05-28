import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Tooltip,
  Popconfirm 
} from 'antd';
import { 
  UserAddOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import { useProject } from '../../hooks/useProject';
import { ProjectMember, ProjectDetail } from '@/types/project';
import { ProjectRole } from '@/types/common';
import styles from './styles.module.scss';

const { Option } = Select;

interface MemberManagementProps {
  projectId: string;
  members: any[]; // 使用any[]类型，因为实际数据可能与ProjectMember接口不完全匹配
}

/**
 * 成员管理组件
 */
const MemberManagement: React.FC<MemberManagementProps> = ({ projectId, members = [] }) => {
  const { addProjectMember, updateMemberPermission, removeProjectMember, currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [form] = Form.useForm();
  const [normalizedMembers, setNormalizedMembers] = useState<ProjectMember[]>([]);
  
  // 标准化成员数据
  useEffect(() => {
    if (!members || !members.length) {
      setNormalizedMembers([]);
      return;
    }
    
    // 获取创建者ID，用于判断哪个成员是创建者
    const creatorId = currentProject?.createdBy?.id;
    
    // 转换成员数据为前端需要的格式
    const normalized = members.map(member => {
      // 处理user对象
      let userId = '';
      let username = '';
      let email = '';
      let avatar = undefined;
      
      // 判断user字段的结构
      if (member.user) {
        userId = member.user.id || member.user._id || '';
        username = member.user.username || '';
        email = member.user.email || '';
        avatar = member.user.avatar;
      }
      
      // 判断是否为创建者
      const isCreator = creatorId && (userId === creatorId);
      
      // 设置权限 - 对于创建者，强制设为admin
      const permission = isCreator ? 'admin' as ProjectRole : 
                         (member.permission || 'viewer' as ProjectRole);
                         
      // 返回标准化的成员对象
      return {
        user: {
          id: userId,
          username,
          email,
          avatar
        },
        permission,
        joinedAt: member.joinedAt || new Date().toISOString()
      };
    });
    
    setNormalizedMembers(normalized);
  }, [members, currentProject]);
  
  // 处理邀请成员
  const handleInvite = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const success = await addProjectMember(projectId, values);
      if (success) {
        setInviteVisible(false);
        form.resetFields();
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理变更权限
  const handlePermissionChange = async (userId: string, permission: ProjectRole) => {
    await updateMemberPermission(projectId, userId, permission);
  };
  
  // 处理移除成员
  const handleRemoveMember = async (userId: string) => {
    await removeProjectMember(projectId, userId);
  };
  
  // 渲染权限标签
  const renderPermissionTag = (permission: ProjectRole) => {
    const colors = {
      admin: 'red',
      editor: 'blue',
      viewer: 'green'
    };
    
    const labels = {
      admin: '管理员',
      editor: '编辑者',
      viewer: '只读'
    };
    
    return (
      <Tag color={colors[permission]}>{labels[permission]}</Tag>
    );
  };

  // 表格列定义
  const columns = [
    {
      title: '用户名',
      dataIndex: ['user', 'username'],
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: ['user', 'email'],
      key: 'email',
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      render: (permission: ProjectRole) => renderPermissionTag(permission)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ProjectMember) => {
        // 判断是否为创建者，创建者不能被修改权限或移除
        const isCreator = currentProject?.createdBy?.id === record.user.id;
        
        return (
          <Space size="small">
            <Select 
              value={record.permission}
              style={{ width: 100 }}
              disabled={isCreator}
              onChange={(value) => handlePermissionChange(record.user.id, value as ProjectRole)}
            >
              <Option key="admin" value="admin">管理员</Option>
              <Option key="editor" value="editor">编辑者</Option>
              <Option key="viewer" value="viewer">只读</Option>
            </Select>
            
            <Popconfirm
              title="确定要移除该成员吗？"
              onConfirm={() => handleRemoveMember(record.user.id)}
              okText="确定"
              cancelText="取消"
              disabled={isCreator}
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                disabled={isCreator}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.memberManagementContainer}>
      <div className={styles.header}>
        <h3>项目成员</h3>
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          onClick={() => setInviteVisible(true)}
        >
          邀请成员
        </Button>
      </div>
      
      <Table 
        dataSource={normalizedMembers} 
        columns={columns}
        rowKey={(record) => {
          // 确保每一行都有唯一的key
          if (record.user && record.user.id) {
            return record.user.id;
          }
          // 如果user.id为空，使用其他唯一标识
          return `${record.user?.username || ''}-${record.user?.email || ''}-${record.joinedAt}`;
        }}
        pagination={false}
        locale={{ emptyText: '暂无成员' }}
      />
      
      {/* 邀请成员模态框 */}
      <Modal
        title="邀请成员"
        open={inviteVisible}
        onCancel={() => setInviteVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setInviteVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={handleInvite}
          >
            邀请
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="userId"
            label="用户ID"
            rules={[
              { required: true, message: '请输入用户ID' }
            ]}
          >
            <Input placeholder="请输入用户ID" />
          </Form.Item>
          
          <Form.Item
            name="permission"
            label="权限"
            initialValue="viewer"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Select>
              <Option key="admin" value="admin">管理员</Option>
              <Option key="editor" value="editor">编辑者</Option>
              <Option key="viewer" value="viewer">只读</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MemberManagement; 