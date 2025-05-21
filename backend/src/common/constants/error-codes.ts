// 用户相关错误码和友好消息
export const USER_ERROR = {
  NOT_FOUND: '用户不存在',
  FORBIDDEN: '没有权限操作',
  INTERNAL: '服务器内部错误',
};

// src/common/constants/error-codes.ts (添加项目模块错误码)
export const PROJECT_ERROR = {
  NOT_FOUND: '项目不存在',
  NAME_TAKEN: '项目名称已存在',
  NO_PERMISSION: '您没有权限执行此操作',
  USER_NOT_FOUND: '用户不存在',
  MEMBER_NOT_FOUND: '成员不存在',
  MEMBER_ALREADY_EXISTS: '该成员已经在项目中',
  OWNER_CANNOT_LEAVE: '项目创建者不能离开项目',
  OWNER_ROLE_CANNOT_CHANGE: '项目创建者角色不能被修改',
  INTERNAL_ERROR: '服务器内部错误',
};
