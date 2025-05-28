import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Button, List, Typography } from 'antd';
import { 
  ProjectOutlined, 
  TeamOutlined, 
  FileOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import styles from './dashboard.module.scss';
import projectService from '@/services/project';
import { ProjectBasic } from '@/types/project';
import { useRouter } from 'next/router';

const { Title, Text, Paragraph } = Typography;

/**
 * 仪表盘首页内容组件
 */
const DashboardContent: React.FC = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectBasic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 获取项目数据
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const projectsData = await projectService.getProjects();
        setProjects(projectsData || []);
      } catch (error) {
        console.error('获取项目列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);
  
  // 获取最近的3个项目
  const recentProjects = projects.slice(0, 3).map(project => ({
    id: project.id,
    name: project.name,
    lastUpdated: new Date(project.lastActivityAt || project.updatedAt).toLocaleDateString('zh-CN'),
    members: project.membersCount || 0
  }));
  
  // 计算统计数据
  const projectCount = projects.length;
  const totalMembers = projects.reduce((sum, project) => sum + (project.membersCount || 0), 0);
  const totalFiles = projects.reduce((sum, project) => sum + (project.filesCount || 0), 0);
  
  // 处理创建新项目
  const handleCreateProject = () => {
    router.push('/project/create');
  };
  
  // 查看所有项目
  const handleViewAllProjects = () => {
    router.push('/project');
  };
  
  // 打开项目
  const handleOpenProject = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.welcomeSection}>
        <Title level={2} className={styles.welcomeTitle}>欢迎来到 CodeGenius</Title>
        <Paragraph className={styles.welcomeText}>AI智能代码生成与协作平台，让编程更高效、协作更简单</Paragraph>
        <div className={styles.actionButtons}>
          <Button type="primary" size="large" onClick={handleCreateProject}>创建新项目</Button>
          <Button size="large" onClick={handleViewAllProjects}>探索项目</Button>
        </div>
      </div>
      
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="我的项目" 
              value={projectCount} 
              loading={loading}
              prefix={<ProjectOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="团队成员" 
              value={totalMembers} 
              loading={loading}
              prefix={<TeamOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="文件总数" 
              value={totalFiles} 
              loading={loading}
              prefix={<FileOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="活跃项目" 
              value={projects.filter(p => !p.isArchived).length}
              loading={loading}
              prefix={<ClockCircleOutlined />} 
            />
          </Card>
        </Col>
      </Row>
      
      <Card 
        title="最近项目" 
        className={styles.projectsCard}
        loading={loading}
        extra={<Button type="link" icon={<ArrowRightOutlined />} onClick={handleViewAllProjects}>查看全部</Button>}
      >
        {recentProjects.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={recentProjects}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button type="link" key="open" onClick={() => handleOpenProject(item.id)}>打开</Button>
                ]}
              >
                <List.Item.Meta
                  title={<a onClick={() => handleOpenProject(item.id)}>{item.name}</a>}
                  description={`最后更新: ${item.lastUpdated} · ${item.members} 成员`}
                />
              </List.Item>
            )}
          />
        ) : (
          <div className={styles.emptyProjects}>
            <p>暂无项目</p>
            <Button type="primary" onClick={handleCreateProject}>创建第一个项目</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardContent; 