import http from '@/utils/request';
import { ResponseData } from '@/types/common';
import { 
  ProjectBasic, 
  ProjectDetail, 
  CreateProjectParams, 
  UpdateProjectParams,
  InviteMemberParams,
  ChangeMemberPermissionParams
} from '@/types';

// 项目服务
const projectService = {
  // 获取项目列表
  getProjects(): Promise<ProjectBasic[]> {
    return http.get<ResponseData<ProjectBasic[]>>('/project').then(res => res.data!);
  },

  // 获取项目详情
  getProjectDetail(projectId: string): Promise<ProjectDetail> {
    return http.get<ResponseData<ProjectDetail>>(`/project/${projectId}`).then(res => res.data!);
  },

  // 创建项目
  createProject(data: CreateProjectParams): Promise<{ projectId: string }> {
    return http.post<ResponseData<{ projectId: string }>>('/project', data).then(res => res.data!);
  },

  // 更新项目信息
  updateProject(projectId: string, data: UpdateProjectParams): Promise<void> {
    return http.put(`/project/${projectId}`, data);
  },

  // 删除项目
  deleteProject(projectId: string): Promise<void> {
    return http.delete(`/project/${projectId}`);
  },

  // 邀请成员
  inviteMember(projectId: string, data: InviteMemberParams): Promise<void> {
    return http.post(`/project/${projectId}/invite`, data);
  },

  // 变更成员权限
  changeMemberPermission(projectId: string, data: ChangeMemberPermissionParams): Promise<void> {
    return http.post(`/project/${projectId}/permission`, data);
  },

  // 移除成员
  removeMember(projectId: string, userId: string): Promise<void> {
    return http.delete(`/project/${projectId}/member/${userId}`);
  }
};

export default projectService; 