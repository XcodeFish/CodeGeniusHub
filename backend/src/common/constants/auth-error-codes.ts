// 认证相关错误码和友好消息
export const AUTH_ERROR = {
  UNAUTHORIZED: '未认证或Token无效',
  INVALID_CREDENTIALS: '用户名或密码错误',
  REFRESH_TOKEN_NOT_FOUND: '未找到刷新Token',
  INTERNAL: '认证服务内部错误',
  CAPTCHA_INVALID: '验证码无效',
  REGISTER_CONFLICT: '注册信息已存在',
};
