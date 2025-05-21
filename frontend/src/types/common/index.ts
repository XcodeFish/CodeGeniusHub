// API响应数据类型
export interface ResponseData<T = any> {
  code: number;
  message: string;
  data?: T; // 某些接口可能将数据包装在data字段中
  [key: string]: any; // 允许其他字段，适应不同接口返回格式
}

// 系统角色类型
export type SystemRole = 'admin' | 'editor' | 'viewer';

// 项目角色类型
export type ProjectRole = 'admin' | 'editor' | 'viewer'; 