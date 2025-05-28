import http from '@/utils/request';
import { ResponseData } from '@/types/common';
import { 
  ProjectBasic, 
  ProjectDetail, 
  CreateProjectParams, 
  UpdateProjectParams,
  ProjectFilterParams,
  AddProjectMemberParams,
  UpdateProjectMemberParams,
  BatchUpdateMembersParams
} from '@/types/project';

// 项目服务
const projectService = {
  // 获取项目列表
  getProjects(params?: ProjectFilterParams): Promise<ProjectBasic[]> {
    return http.get<ResponseData<ProjectBasic[]>>('/projects', params).then(res => res.data!);
  },

  // 获取项目详情
  getProjectDetail(projectId: string): Promise<ProjectDetail> {
    return http.get<ResponseData<ProjectDetail>>(`/projects/${projectId}`).then(res => res.data!);
  },

  // 创建项目
  createProject(data: CreateProjectParams): Promise<ProjectBasic> {
    return http.post<ResponseData<ProjectBasic>>('/projects', data, {
      // 确保201状态码被正确处理
      skipErrorHandler: false,
      showSuccessMessage: false // 在业务逻辑中处理成功消息
    }).then(res => res.data!);
  },

  // 更新项目信息
  updateProject(projectId: string, data: UpdateProjectParams): Promise<ProjectBasic> {
    return http.put<ResponseData<ProjectBasic>>(`/projects/${projectId}`, data).then(res => res.data!);
  },

  // 删除项目
  deleteProject(projectId: string): Promise<{ code: number; message: string; success: boolean }> {
    return http.delete<ResponseData<{ code: number; message: string; success: boolean }>>(`/projects/${projectId}`).then(res => res.data!);
  },

  // 归档项目
  archiveProject(projectId: string): Promise<ProjectBasic> {
    return http.patch<ResponseData<ProjectBasic>>(`/projects/${projectId}/archive`).then(res => res.data!);
  },

  // 取消归档项目
  unarchiveProject(projectId: string): Promise<ProjectBasic> {
    return http.patch<ResponseData<ProjectBasic>>(`/projects/${projectId}/unarchive`).then(res => res.data!);
  },

  // 获取项目成员
  getProjectMembers(projectId: string): Promise<any[]> {
    return http.get<ResponseData<any[]>>(`/projects/${projectId}/members`).then(res => res.data!);
  },

  // 添加项目成员
  addProjectMember(projectId: string, data: AddProjectMemberParams): Promise<ProjectDetail> {
    return http.post<ResponseData<ProjectDetail>>(`/projects/${projectId}/members`, data).then(res => res.data!);
  },

  // 更新项目成员权限
  updateProjectMember(projectId: string, userId: string, data: UpdateProjectMemberParams): Promise<ProjectDetail> {
    return http.put<ResponseData<ProjectDetail>>(`/projects/${projectId}/members/${userId}`, data).then(res => res.data!);
  },

  // 移除项目成员
  removeProjectMember(projectId: string, userId: string): Promise<ProjectDetail> {
    return http.delete<ResponseData<ProjectDetail>>(`/projects/${projectId}/members/${userId}`).then(res => res.data!);
  },

  // 批量更新项目成员
  batchUpdateProjectMembers(projectId: string, data: BatchUpdateMembersParams): Promise<ProjectDetail> {
    return http.post<ResponseData<ProjectDetail>>(`/projects/${projectId}/members/batch`, data).then(res => res.data!);
  }
};

export default projectService; 