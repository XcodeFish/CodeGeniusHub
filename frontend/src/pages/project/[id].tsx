import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ProjectDetail } from '@/modules/Project';
import MainLayout from '@/components/layout/MainLayout';

/**
 * 项目详情页面
 */
const ProjectDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  
  // 处理特殊路由参数，如果是list或my，重定向到正确的页面
  useEffect(() => {
    if (id) {
      if (id === 'list') {
        router.replace('/project');
      } else if (id === 'my') {
        router.replace('/project/my');
      } else if (id === 'create') {
        router.replace('/project/create');
      }
    }
  }, [id, router]);
  
  // 确保ID已加载且不是特殊路由参数
  if (!id || typeof id !== 'string' || ['list', 'my', 'create'].includes(id)) {
    return null;
  }
  
  return (
    <MainLayout title="项目详情 - AI智能代码生成与协作平台">
      <ProjectDetail projectId={id} />
    </MainLayout>
  );
};

export default ProjectDetailPage; 