import { ProjectRole } from '../common';

// 项目成员类型
export interface ProjectMember {
  userId: string;
  username: string;
  email: string;
  permission: ProjectRole;
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
  projectId: string;
  name: string;
  description?: string;
  lastUpdated: string;
}

// 项目详情信息类型
export interface ProjectDetail extends ProjectBasic {
  files: ProjectFile[];
  members: ProjectMember[];
}

// 项目创建参数
export interface CreateProjectParams {
  name: string;
  description?: string;
}

// 项目更新参数
export interface UpdateProjectParams {
  name?: string;
  description?: string;
}

// 成员邀请参数
export interface InviteMemberParams {
  email: string;
  permission: ProjectRole;
}

// 成员权限修改参数
export interface ChangeMemberPermissionParams {
  userId: string;
  permission: ProjectRole;
} 