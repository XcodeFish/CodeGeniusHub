import React, { useEffect, useState } from 'react';
import { Button, Card, List, Skeleton, Empty, Space, Tooltip, Dropdown } from 'antd';
import { 
  PlusOutlined,
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useProject } from '../../hooks/useProject';
import {Modal} from 'antd';
import styles from './styles.module.scss';
import { ProjectBasic } from '@/types/project';

/**
 * 项目列表组件
 */
const ProjectList: React.FC = () => {
  const { 
    loading, 
    projects, 
    fetchProjects, 
    deleteProject, 
    navigateToProject,
    navigateToCreateProject
  } = useProject();
  
  // 初始化时获取项目列表
  useEffect(() => {
    console.log('ProjectList 组件挂载，获取项目列表');
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    console.log('ProjectList projects数据变化:', projects);
    // 尝试深度打印第一个项目的完整信息
    if (projects && projects.length > 0) {
      try {
        console.log('第一个项目详情:', JSON.stringify(projects[0]));
      } catch (e) {
        console.error('打印项目详情失败:', e);
      }
    }
  }, [projects]);

  // 手动刷新项目列表
  const handleRefresh = () => {
    console.log('手动刷新项目列表');
    fetchProjects();
  };

  // 处理点击项目卡片
  const handleProjectClick = (projectId: string) => {
    console.log('点击项目:', projectId);
    navigateToProject(projectId);
  };

  // 处理创建项目
  const handleCreateProject = () => {
    navigateToCreateProject();
  };

  // 处理删除项目
  const handleDeleteProject = async (project: ProjectBasic, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    Modal.confirm({
      title: '确定删除该项目吗？',
      icon: <ExclamationCircleOutlined />,
      content: '删除后将无法恢复，项目内的所有文件和历史记录都将被删除。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const success = await deleteProject(project.id);
        if (success) {
          fetchProjects();
        }
      }
    });
  };

  // 渲染项目列表为空时的状态
  const renderEmpty = () => (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="暂无项目"
      className={styles.emptyContainer}
    >
      <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
        创建项目
      </Button>
    </Empty>
  );

  // 项目操作菜单
  const getProjectMenu = (project: ProjectBasic) => [
    {
      key: 'edit',
      label: (
        <Space onClick={(e) => e.stopPropagation()}>
          <EditOutlined />
          编辑
        </Space>
      ),
      onClick: (e: any) => {
        e.domEvent.stopPropagation();
        navigateToProject(project.id);
      }
    },
    {
      key: 'delete',
      danger: true,
      label: (
        <Space onClick={(e) => e.stopPropagation()}>
          <DeleteOutlined />
          删除
        </Space>
      ),
      onClick: (e: any) => {
        e.domEvent.stopPropagation();
        handleDeleteProject(project);
      }
    }
  ];

  // 格式化最后更新时间
  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className={styles.projectListContainer}>
      <div className={styles.header}>
        <h1>项目列表</h1>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateProject}
          >
            创建项目
          </Button>
        </Space>
      </div>
      
      {loading && projects.length === 0 ? (
        <div className={styles.loadingContainer}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      ) : !projects || projects.length === 0 ? (
        renderEmpty()
      ) : (
        <List
          grid={{ 
            gutter: 16,
            xs: 1,
            sm: 2,
            md: 2,
            lg: 3,
            xl: 4,
            xxl: 4
          }}
          dataSource={projects}
          loading={loading}
          renderItem={(project: any) => {
            // 记录项目的关键属性
            console.log('渲染项目:', project.id || project._id, 'name:', project.name);
            
            // 即使没有某些属性也尝试渲染
            const projectId = project.id || project._id || '';
            const projectName = project.name || '未命名项目';
            
            // 如果没有ID则跳过渲染
            if (!projectId) {
              console.warn('跳过无ID项目:', project);
              return null;
            }
            
            return (
              <List.Item key={projectId}>
                <Card 
                  hoverable
                  className={styles.projectCard}
                  onClick={() => handleProjectClick(projectId)}
                  title={projectName}
                  extra={
                    <Dropdown menu={{ items: getProjectMenu({...project, id: projectId}) }} trigger={['click']}>
                      <Button 
                        type="text" 
                        icon={<EllipsisOutlined />} 
                        onClick={e => e.stopPropagation()}
                      />
                    </Dropdown>
                  }
                >
                  <div className={styles.projectDescription}>
                    {project.description || '暂无描述'}
                  </div>
                  <div className={styles.projectMeta}>
                    <span>最后更新: {project.updatedAt ? formatLastUpdated(project.updatedAt) : '未知'}</span>
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
};

export default ProjectList; 