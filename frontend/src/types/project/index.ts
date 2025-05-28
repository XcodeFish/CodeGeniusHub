import { ProjectRole } from '../common';

// 项目成员类型
export interface ProjectMember {
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  permission: ProjectRole;
  joinedAt: string;
}

// 项目文件类型
export interface ProjectFile {
  fileId: string;
  filename: string;
  lastUpdated: string;
  updatedBy: string;
}

// 项目基本信息类型
export interface ProjectBasic {
  id: string;
  name: string;
  description: string;
  createdBy: {
    id: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  isArchived: boolean;
  repositoryUrl: string;
  tags: string[];
  filesCount: number;
  collaboratorsCount: number;
  lastActivityAt: string;
  permission?: ProjectRole; // 当前用户在项目中的权限
}

// 项目详情信息类型
export interface ProjectDetail extends ProjectBasic {
  files: ProjectFile[];
  members: ProjectMember[];
}

// 项目过滤参数
export interface ProjectFilterParams {
  search?: string;
  includeArchived?: boolean;
  tags?: string[];
}

// 项目创建参数
export interface CreateProjectParams {
  name: string;
  description?: string;
  repositoryUrl?: string;
  tags?: string[];
}

// 项目更新参数
export interface UpdateProjectParams {
  name?: string;
  description?: string;
  repositoryUrl?: string;
  tags?: string[];
}

// 项目成员添加参数
export interface AddProjectMemberParams {
  userId: string;
  permission: ProjectRole;
}

// 项目成员权限更新参数
export interface UpdateProjectMemberParams {
  permission: ProjectRole;
}

// 批量更新成员权限参数
export interface BatchUpdateMembersParams {
  members: {
    userId: string;
    permission: ProjectRole;
  }[];
} 