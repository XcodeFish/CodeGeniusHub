// 基础用户信息
export interface UserBase {
  userId: string;
  username: string;
  email: string;
}

// 用户详情信息类型
export interface UserProfile extends UserBase {
  permission: string;
  phone?: string;
}

// 前端存储用户信息类型 - 与UserStore保持一致
export interface User {
  id: string; // 对应后端的userId 
  username: string;
  email: string;
  permission: string; // 对应后端返回的permission
  phone?: string;
}

// 用户资料更新参数
export interface UpdateProfileParams {
  username?: string;
  email?: string;
}

// 密码修改参数
export interface ChangePasswordParams {
  oldPassword: string;
  newPassword: string;
} 