import http from '@/utils/request';
import { ResponseData } from '@/types/common';
import { 
  UserProfile, 
  UpdateProfileParams, 
  ChangePasswordParams,
  UserModule,
  SystemPermission,
  ProjectPermission,
  BatchProjectPermissionsParams,
  BatchSystemPermissionsParams,
  AdminRegisterUserParams,
  UserListParams,
  UserListResponse,
  PermissionLog
} from '@/types';

// 用户服务
const userService = {
  // 获取当前用户信息
  getUserProfile(): Promise<UserProfile> {
    return http.get<ResponseData<UserProfile>>('/user/profile').then(res => res.data!);
  },

  // 更新用户信息
  updateUserProfile(data: UpdateProfileParams): Promise<void> {
    return http.put('/user/profile', data);
  },

  // 更改密码
  changePassword(data: ChangePasswordParams): Promise<void> {
    return http.put('/user/change-password', data);
  },

  // 根据用户ID获取用户信息
  getUserById(userId: string): Promise<UserProfile> {
    return http.get<ResponseData<UserProfile>>(`/api/user/${userId}`).then(res => res.data!);
  },

  // 删除用户 (仅限管理员)
  deleteUser(userId: string): Promise<void> {
    return http.delete(`/api/user/${userId}`);
  },

  // 更新当前登录用户信息
  updateCurrentUser(data: UpdateProfileParams): Promise<void> {
    return http.patch('/api/user/update', data);
  },

  // 获取所有用户列表 (仅限管理员)
  getUserList(params?: UserListParams): Promise<UserListResponse> {
    return http.get<ResponseData<UserListResponse>>('/api/user/list', params).then(res => res.data!);
  },

  // 注册用户 (管理员用)
  registerUser(data: AdminRegisterUserParams): Promise<UserProfile> {
    return http.post<ResponseData<UserProfile>>('/api/user/register', data).then(res => res.data!);
  },

  // 获取用户功能模块列表
  getUserModules(userId: string): Promise<UserModule[]> {
    return http.get<ResponseData<UserModule[]>>(`/api/user/${userId}/modules`).then(res => res.data!);
  },

  // 设置用户功能模块 (仅限管理员)
  updateUserModules(userId: string, modules: string[]): Promise<void> {
    return http.patch(`/api/user/${userId}/modules`, { modules });
  },

  // 批量更新项目权限
  batchUpdateProjectPermissions(data: BatchProjectPermissionsParams): Promise<void> {
    return http.post('/api/user/batch-project-permissions', data);
  },

  // 获取用户系统权限
  getUserSystemPermission(userId: string): Promise<SystemPermission> {
    return http.get<ResponseData<SystemPermission>>(`/api/user/${userId}/system-permission`).then(res => res.data!);
  },

   // 更新用户系统权限
  updateUserSystemPermission(userId: string, permission: 'admin' | 'editor' | 'viewer'): Promise<void> {
    return http.put(`/api/user/${userId}/system-permission`, { permission });
  },

  // 获取用户所有项目权限
  getUserProjectPermissions(userId: string): Promise<ProjectPermission[]> {
    return http.get<ResponseData<ProjectPermission[]>>(`/api/user/${userId}/project-permissions`).then(res => res.data!);
  },

  // 批量更新用户系统权限
  batchUpdateSystemPermissions(data: BatchSystemPermissionsParams): Promise<void> {
    return http.post('/api/user/batch-update-permissions', data);
  },

  // 获取用户权限变更日志
  getUserPermissionLogs(userId: string): Promise<PermissionLog[]> {
    return http.get<ResponseData<PermissionLog[]>>(`/api/user/${userId}/permission-logs`).then(res => res.data!);
  }
};

export default userService; 