// 登录参数类型
export interface LoginParams {
  identifier: string;
  password: string;
  remember: boolean;
  captchaId: string;
  captchaCode: string;
}

// 登录响应内部数据类型
export interface LoginResponseData {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    username: string;
    email: string;
    phone: string;
    permission: string;
    firstLogin?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

// 登录响应类型
export interface LoginResponse {
  code: number;
  message: string;
  data: LoginResponseData;
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