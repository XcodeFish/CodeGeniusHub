import http from '@/utils/request';
import { ResponseData } from '@/types/common';
import { 
  LoginParams, 
  LoginResponse, 
  RegisterParams, 
  RegisterResponse, 
  CaptchaResponse,
  ForgotPasswordResponse
} from '@/types/auth';
import { UserProfile } from '@/types';

// 身份认证相关接口
const authService = {
  // 获取图形验证码
  getCaptcha(): Promise<CaptchaResponse> {
    return http.get<ResponseData<CaptchaResponse>>('/auth/captcha', undefined, {
      showSuccessMessage: false,
      skipErrorHandler: false, // 确保错误被正确处理
    }).then(res => res.data!);
  },

  // 登录
  login(params: LoginParams): Promise<LoginResponse> {
    return http.post<ResponseData<LoginResponse>>('/auth/login', params).then(res => res.data!);
  },

  // 注册
  register(params: RegisterParams): Promise<RegisterResponse> {
    return http.post<ResponseData<RegisterResponse>>('/auth/register', params).then(res => res.data!);
  },

  // 登出
  logout(): Promise<void> {
    return http.post('/auth/logout');
  },

  // 刷新token
  refreshToken(): Promise<{ token: string }> {
    return http.post<ResponseData<{ token: string }>>('/auth/refresh').then(res => res.data!);
  },

  // 忘记密码发送邮件
  forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return http.post<ResponseData<ForgotPasswordResponse>>('/auth/forgot-password', { email }).then(res => res.data!);
  },

  // 重置密码 - 修改为与后端API一致的参数
  resetPassword(email: string, verifyCode: string, password: string): Promise<void> {
    return http.post('/auth/reset-password', { email, verifyCode, password });
  },

  // 获取当前用户信息
  getCurrentUser(): Promise<UserProfile> {
    return http.get<ResponseData<UserProfile>>('/user/current').then(res => res.data!);
  }
};

export default authService; 