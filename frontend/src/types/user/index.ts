// 基础用户信息
export interface UserBase {
  id: string; // 与后端返回结构保持一致，使用id而非userId
  username: string;
  email: string;
  userId?: string;
}

// 用户详情信息类型
export interface UserProfile extends UserBase {
  permission: string;
  phone?: string;
  firstLogin?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  avatar?: string;
}

// 前端存储用户信息类型 - 与UserStore保持一致
export interface User {
  id: string; // 对应后端的id 
  username: string;
  email: string;
  permission: string; // 对应后端返回的permission
  phone?: string;
  avatar?: string;
  userId?: string;
}

// 用户资料更新参数
export interface UpdateProfileParams {
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// 密码修改参数
export interface ChangePasswordParams {
  oldPassword: string;
  newPassword: string;
} 

// 用户功能模块类型
export interface UserModule {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
}

// 用户权限变更日志
export interface PermissionLog {
  id: string;
  userId: string;
  action: string;
  permissionType: 'system' | 'project';
  permissionId?: string;
  oldValue?: string;
  newValue?: string;
  createdBy: string;
  createdAt: Date;
}

// 用户系统权限
export interface SystemPermission {
  userId: string;
  permission: 'admin' | 'editor' | 'viewer';
}

// 用户项目权限
export interface ProjectPermission {
  userId: string;
  projectId: string;
  permission: 'admin' | 'editor' | 'viewer';
}

// 批量更新项目权限请求参数
export interface BatchProjectPermissionsParams {
  userId: string;
  permissions: {
    projectId: string;
    permission: 'admin' | 'editor' | 'viewer';
  }[];
}

// 批量更新用户系统权限请求参数
export interface BatchSystemPermissionsParams {
  users: {
    userId: string;
    permission: 'admin' | 'editor' | 'viewer';
  }[];
}

// 用户注册参数 (后台使用)
export interface AdminRegisterUserParams {
  username: string;
  email: string;
  password: string;
  phone?: string;
  permission?: 'admin' | 'editor' | 'viewer';
}

// 用户列表过滤参数
export interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  permission?: 'admin' | 'editor' | 'viewer';
}

// 用户列表响应
export interface UserListResponse {
  total: number;
  users: UserProfile[];
}