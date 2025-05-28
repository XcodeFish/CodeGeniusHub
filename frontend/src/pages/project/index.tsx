import React from 'react';
import { ProjectList } from '@/modules/Project';
import MainLayout from '@/components/layout/MainLayout';

/**
 * 项目列表页面
 */
const ProjectListPage: React.FC = () => {
  return (
    <MainLayout title="项目列表 - AI智能代码生成与协作平台">
      <ProjectList />
    </MainLayout>
  );
};

export default ProjectListPage; 