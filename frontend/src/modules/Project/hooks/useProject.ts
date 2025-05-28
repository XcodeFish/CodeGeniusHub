import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { message } from 'antd';
import projectService from '@/services/project';
import { 
  ProjectBasic, 
  ProjectDetail, 
  CreateProjectParams, 
  UpdateProjectParams,
  AddProjectMemberParams,
  UpdateProjectMemberParams,
  BatchUpdateMembersParams,
  ProjectFilterParams
} from '@/types/project';
import { ProjectRole } from '@/types/common';

/**
 * 项目管理Hook - 处理项目相关的所有业务逻辑
 */
export function useProject() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectBasic[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectDetail | null>(null);

  /**
   * 获取项目列表
   */
  const fetchProjects = useCallback(async (params?: ProjectFilterParams) => {
    setLoading(true);
    try {
      console.log('开始获取项目列表');
      // 清空现有项目，避免展示旧数据
      setProjects([]);
      
      const data = await projectService.getProjects(params);
      console.log('获取项目列表成功，数据:', data);
      // 打印项目数据基本信息
      console.log('获取项目列表成功，是否数组:', Array.isArray(data), '长度:', Array.isArray(data) ? data.length : 0);
      
      // 仅设置有效的项目数组
      if (Array.isArray(data)) {
        setProjects(data);
        
        if (data.length > 0) {
          console.log('已设置项目列表数据，项目数:', data.length);
        } else {
          console.log('项目列表为空');
        }
      } else {
        console.warn('项目列表格式异常，使用空数组');
        setProjects([]);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
      message.error('获取项目列表失败，请稍后重试');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取项目详情
   */
  const fetchProjectDetail = useCallback(async (projectId: string) => {
    // 添加ID有效性检查
    if (!projectId || projectId === 'list' || projectId === 'my' || projectId === 'create') {
      console.warn('无效的项目ID:', projectId);
      return null;
    }
    
    setLoading(true);
    console.log('fetchProjectDetail', projectId);
    try {
      const data = await projectService.getProjectDetail(projectId);
      setCurrentProject(data);
      return data;
    } catch (error) {
      console.error('获取项目详情失败:', error);
      message.error('获取项目详情失败，请稍后重试');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 创建项目
   */
  const createProject = useCallback(async (data: CreateProjectParams) => {
    setLoading(true);
    try {
      const result = await projectService.createProject(data);
      message.success('项目创建成功');
      // 只返回id，避免类型错误
      return result.id;
    } catch (error) {
      console.error('创建项目失败:', error);
      message.error('创建项目失败，请稍后重试');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 更新项目信息
   */
  const updateProject = useCallback(async (projectId: string, data: UpdateProjectParams) => {
    setLoading(true);
    try {
      await projectService.updateProject(projectId, data);
      message.success('项目信息已更新');
      // 刷新项目详情
      await fetchProjectDetail(projectId);
      return true;
    } catch (error) {
      console.error('更新项目失败:', error);
      message.error('更新项目失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjectDetail]);

  /**
   * 删除项目
   */
  const deleteProject = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      await projectService.deleteProject(projectId);
      message.success('项目已删除');
      // 刷新项目列表
      await fetchProjects();
      return true;
    } catch (error) {
      console.error('删除项目失败:', error);
      message.error('删除项目失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  /**
   * 归档项目
   */
  const archiveProject = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      await projectService.archiveProject(projectId);
      message.success('项目已归档');
      // 刷新项目详情
      await fetchProjectDetail(projectId);
      return true;
    } catch (error) {
      console.error('归档项目失败:', error);
      message.error('归档项目失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjectDetail]);

  /**
   * 取消归档项目
   */
  const unarchiveProject = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      await projectService.unarchiveProject(projectId);
      message.success('项目已取消归档');
      // 刷新项目详情
      await fetchProjectDetail(projectId);
      return true;
    } catch (error) {
      console.error('取消归档项目失败:', error);
      message.error('取消归档项目失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjectDetail]);

  /**
   * 获取项目成员
   */
  const getProjectMembers = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const members = await projectService.getProjectMembers(projectId);
      return members;
    } catch (error) {
      console.error('获取项目成员失败:', error);
      message.error('获取项目成员失败，请稍后重试');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 添加项目成员
   */
  const addProjectMember = useCallback(async (projectId: string, data: AddProjectMemberParams) => {
    setLoading(true);
    try {
      await projectService.addProjectMember(projectId, data);
      message.success('成员已添加');
      // 刷新项目详情
      await fetchProjectDetail(projectId);
      return true;
    } catch (error) {
      console.error('添加成员失败:', error);
      message.error('添加成员失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjectDetail]);

  /**
   * 更新项目成员权限
   */
  const updateMemberPermission = useCallback(async (
    projectId: string, 
    userId: string, 
    permission: ProjectRole
  ) => {
    setLoading(true);
    try {
      await projectService.updateProjectMember(projectId, userId, { permission });
      message.success('成员权限已更新');
      // 刷新项目详情
      await fetchProjectDetail(projectId);
      return true;
    } catch (error) {
      console.error('更新成员权限失败:', error);
      message.error('更新成员权限失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjectDetail]);

  /**
   * 移除项目成员
   */
  const removeProjectMember = useCallback(async (projectId: string, userId: string) => {
    setLoading(true);
    try {
      await projectService.removeProjectMember(projectId, userId);
      message.success('成员已移除');
      // 刷新项目详情
      await fetchProjectDetail(projectId);
      return true;
    } catch (error) {
      console.error('移除成员失败:', error);
      message.error('移除成员失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjectDetail]);

  /**
   * 批量更新项目成员
   */
  const batchUpdateMembers = useCallback(async (projectId: string, data: BatchUpdateMembersParams) => {
    setLoading(true);
    try {
      await projectService.batchUpdateProjectMembers(projectId, data);
      message.success('成员权限已批量更新');
      // 刷新项目详情
      await fetchProjectDetail(projectId);
      return true;
    } catch (error) {
      console.error('批量更新成员权限失败:', error);
      message.error('批量更新成员权限失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjectDetail]);

  /**
   * 跳转到项目详情页
   */
  const navigateToProject = useCallback((projectId: string) => {
    router.push(`/project/${projectId}`);
  }, [router]);

  /**
   * 跳转到项目创建页
   */
  const navigateToCreateProject = useCallback(() => {
    router.push('/project/create');
  }, [router]);

  /**
   * 跳转到项目列表页
   */
  const navigateToProjectList = useCallback(() => {
    router.push('/project');
  }, [router]);

  return {
    loading,
    projects,
    currentProject,
    fetchProjects,
    fetchProjectDetail,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    getProjectMembers,
    addProjectMember,
    updateMemberPermission,
    removeProjectMember,
    batchUpdateMembers,
    navigateToProject,
    navigateToCreateProject,
    navigateToProjectList
  };
} 