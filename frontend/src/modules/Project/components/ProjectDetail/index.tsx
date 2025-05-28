import React, { useEffect, useState } from 'react';
import { 
  Tabs, 
  Button, 
  Skeleton, 
  Space, 
  Typography, 
  Dropdown, 
  Empty,
  message 
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  FileOutlined
} from '@ant-design/icons';
import { useProject } from '../../hooks/useProject';
import { useRouter } from 'next/router';
import { ProjectDetail as ProjectDetailType } from '@/types';
import MemberManagement from '../MemberManagement';
import ProjectEdit from '../ProjectEdit';
import styles from './styles.module.scss';

const { Title, Text } = Typography;

interface ProjectDetailProps {
  projectId: string;
}

/**
 * 项目详情组件
 */
const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId }) => {
  const router = useRouter();
  const { 
    loading, 
    currentProject, 
    fetchProjectDetail,
    deleteProject,
    navigateToProjectList
  } = useProject();
  
  const [activeTab, setActiveTab] = useState('files');
  const [showEditModal, setShowEditModal] = useState(false);
  
  // 组件挂载时获取项目详情
  useEffect(() => {
    fetchProjectDetail(projectId);
  }, [projectId, fetchProjectDetail]);
  
  // 处理返回项目列表
  const handleBackToList = () => {
    navigateToProjectList();
  };
  
  // 处理打开编辑模态框
  const handleEdit = () => {
    setShowEditModal(true);
  };
  
  // 处理删除项目
  const handleDelete = () => {
    Modal.confirm({
      title: '确定删除该项目吗？',
      icon: <ExclamationCircleOutlined />,
      content: '删除后将无法恢复，项目内的所有文件和历史记录都将被删除。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const success = await deleteProject(projectId);
        if (success) {
          message.success('项目已删除');
          navigateToProjectList();
        }
      }
    });
  };
  
  // 项目操作菜单
  const projectMenu = [
    {
      key: 'edit',
      label: (
        <Space>
          <EditOutlined />
          编辑项目
        </Space>
      ),
      onClick: handleEdit
    },
    {
      key: 'delete',
      danger: true,
      label: (
        <Space>
          <DeleteOutlined />
          删除项目
        </Space>
      ),
      onClick: handleDelete
    }
  ];
  
  // 渲染文件列表
  const renderFileList = () => {
    if (!currentProject || !currentProject.files || currentProject.files.length === 0) {
      return (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="暂无文件"
          className={styles.emptyContainer}
        >
          <Button type="primary">新建文件</Button>
        </Empty>
      );
    }
    
    return (
      <div className={styles.fileList}>
        {/* 文件列表实现 */}
        <div className={styles.fileListHeader}>
          <div>文件名</div>
          <div>最后更新</div>
          <div>更新人</div>
          <div>操作</div>
        </div>
        {currentProject.files.map(file => (
          <div key={file.fileId} className={styles.fileItem}>
            <div className={styles.fileName}>
              <FileOutlined className={styles.fileIcon} />
              {file.filename}
            </div>
            <div>{file.lastUpdated}</div>
            <div>{file.updatedBy}</div>
            <div>
              <Button type="link" size="small">
                打开
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // 定义 Tabs 的 items 配置
  const tabItems = [
    {
      key: 'files',
      label: (
        <span>
          <FileOutlined />文件
        </span>
      ),
      children: renderFileList()
    },
    {
      key: 'members',
      label: (
        <span>
          <TeamOutlined />成员
        </span>
      ),
      children: currentProject ? (
        <MemberManagement projectId={projectId} members={currentProject.members} />
      ) : null
    }
  ];
  
  // 渲染加载状态
  if (loading && !currentProject) {
    return (
      <div className={styles.loadingContainer}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }
  
  return (
    <div className={styles.projectDetailContainer}>
      <div className={styles.header}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBackToList}
          className={styles.backButton}
        >
          返回项目列表
        </Button>
      </div>
      
      {currentProject && (
        <>
          <div className={styles.projectHeader}>
            <div className={styles.projectInfo}>
              <Title level={2}>{currentProject.name}</Title>
              {currentProject.description && (
                <Text type="secondary" className={styles.description}>
                  {currentProject.description}
                </Text>
              )}
            </div>
            <div className={styles.projectActions}>
              <Dropdown menu={{ items: projectMenu }} trigger={['click']}>
                <Button icon={<SettingOutlined />}>
                  项目设置
                </Button>
              </Dropdown>
            </div>
          </div>
          
          {/* 使用新的 items 属性代替 TabPane 子组件 */}
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            className={styles.tabs}
            items={tabItems}
          />
          
          {/* 编辑项目模态框 */}
          {showEditModal && (
            <ProjectEdit
              project={currentProject}
              visible={showEditModal}
              onCancel={() => setShowEditModal(false)}
              onSuccess={() => {
                setShowEditModal(false);
                fetchProjectDetail(projectId);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

// 导入Modal组件，解决前面的报错
import { Modal } from 'antd';

export default ProjectDetail; 