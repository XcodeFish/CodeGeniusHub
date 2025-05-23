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
    console.log('获取验证码API路径:', '/auth/captcha');
    return http.get<ResponseData<CaptchaResponse>>('/auth/captcha', undefined, {
      showSuccessMessage: false,
      skipErrorHandler: false, // 确保错误被正确处理
    }).then(res => res.data!);
  },

  // 登录
  login(params: LoginParams): Promise<LoginResponse> {
    console.log('登录API路径:', '/auth/login');
    console.log('登录参数:', params);
    // 直接返回整个响应对象
    return http.post<LoginResponse>('/auth/login', params);
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
  refreshToken(): Promise<{ accessToken: string }> {
    console.log('刷新token API路径:', '/auth/refresh');
    
    // 不再从localStorage获取token，因为refresh token应该在cookie中
    return http.get<ResponseData<{ accessToken: string }>>('/auth/refresh', undefined, {
      withCredentials: true, // 确保携带cookie
      skipErrorHandler: true // 自己处理错误，不要全局处理
    }).then(res => {
      console.log('刷新token响应:', res);
      return res.data!;
    })
    .catch(error => {
      console.error('刷新Token失败:', error);
      throw error;
    });
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
    console.log('获取当前用户信息API路径:', '/auth/me');
    return http.get<ResponseData<any>>('/auth/me').then(res => {
      // 后端可能返回 { code, message, user: {...} } 或者直接返回用户信息
      if (res.data && res.data.user) {
        return res.data.user as unknown as UserProfile;
      }
      return res.data as unknown as UserProfile;
    });
  }
};

export default authService; 