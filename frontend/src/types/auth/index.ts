// 登录参数类型
export interface LoginParams {
  email: string;
  password: string;
  remember: boolean;
  captchaId: string;
  captchaCode: string;
}

// 登录响应类型
export interface LoginResponse {
  token: string;
  userId: string;
  permission: string;
}

// 注册参数类型
export interface RegisterParams {
  email: string;
  password: string;
  username: string;
  phone?: string;
}

// 注册响应类型
export interface RegisterResponse {
  userId: string;
  token: string;
}

// 图形验证码响应类型
export interface CaptchaResponse {
  captchaId: string;
  captchaImg: string;
}

// 忘记密码响应类型
export interface ForgotPasswordResponse {
  code: number;
  message: string;
} 