import React from 'react';
import { Row, Col, Card, Statistic, Button, List, Typography } from 'antd';
import { 
  ProjectOutlined, 
  TeamOutlined, 
  FileOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import styles from './dashboard.module.scss';

const { Title, Text, Paragraph } = Typography;

/**
 * 仪表盘首页内容组件
 */
const DashboardContent: React.FC = () => {
  // 示例数据，实际应从API获取
  const recentProjects = [
    { id: 1, name: '前端开发框架', lastUpdated: '2023-07-15', members: 5 },
    { id: 2, name: '数据分析平台', lastUpdated: '2023-07-14', members: 3 },
    { id: 3, name: '移动应用开发', lastUpdated: '2023-07-10', members: 4 },
  ];

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.welcomeSection}>
        <Title level={2} className={styles.welcomeTitle}>欢迎来到 CodeGenius</Title>
        <Paragraph className={styles.welcomeText}>AI智能代码生成与协作平台，让编程更高效、协作更简单</Paragraph>
        <div className={styles.actionButtons}>
          <Button type="primary" size="large">创建新项目</Button>
          <Button size="large">探索示例</Button>
        </div>
      </div>
      
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="我的项目" 
              value={8} 
              prefix={<ProjectOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="团队成员" 
              value={24} 
              prefix={<TeamOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="文件总数" 
              value={156} 
              prefix={<FileOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="活跃时间" 
              value={128} 
              suffix="小时"
              prefix={<ClockCircleOutlined />} 
            />
          </Card>
        </Col>
      </Row>
      
      <Card 
        title="最近项目" 
        className={styles.projectsCard}
        extra={<Button type="link" icon={<ArrowRightOutlined />}>查看全部</Button>}
      >
        <List
          itemLayout="horizontal"
          dataSource={recentProjects}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button type="link" key="open">打开</Button>,
                <Button type="text" key="detail">详情</Button>
              ]}
            >
              <List.Item.Meta
                title={<a href={`/projects/${item.id}`}>{item.name}</a>}
                description={`最后更新: ${item.lastUpdated} · ${item.members} 成员`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default DashboardContent; 