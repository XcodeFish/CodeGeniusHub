import React from 'react';
import { ProjectCreate } from '@/modules/Project';
import MainLayout from '@/components/layout/MainLayout';

/**
 * 创建项目页面
 */
const ProjectCreatePage: React.FC = () => {
  return (
    <MainLayout title="创建项目 - AI智能代码生成与协作平台">
      <ProjectCreate />
    </MainLayout>
  );
};

export default ProjectCreatePage; 