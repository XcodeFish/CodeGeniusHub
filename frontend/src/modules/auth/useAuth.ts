import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { useUserStore } from '@/stores/userStore';
import { LoginParams, RegisterParams } from '@/types/auth';
import { UserProfile, User } from '@/types/user';
import authService from '@/services/auth';
import { AxiosError } from 'axios';

// 类型转换工具函数
const mapRoleToStoreRole = (role: string): 'admin' | 'editor' | 'viewer' => {
  if (role === 'admin') return 'admin';
  if (role === 'editor') return 'editor';
  return 'viewer';
};

// 将UserProfile映射为User的函数
const mapUserProfileToUser = (profile: UserProfile): User => {
  return {
    id: profile.userId,
    username: profile.username,
    email: profile.email,
    permission: profile.permission,
    phone: profile.phone
  };
};

/**
 * 认证相关hooks，负责登录、注册、登出等认证逻辑
 */
export function useAuth() {
  const { setUser, logout: storeLogout } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [captchaImg, setCaptchaImg] = useState('');
  const [captchaId, setCaptchaId] = useState('');

  // 获取验证码
  const getCaptcha = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authService.getCaptcha();
      
      setCaptchaImg(res.captchaImg);
      setCaptchaId(res.captchaId);
      return res;
    } catch (error: unknown) {
      console.error('获取验证码失败:', error);
      
      // 错误已经由请求拦截器统一处理，这里不需要再显示消息
      // 但仍需要返回一个默认对象
      return {
        captchaImg: '',
        captchaId: ''
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // 登录
  const login = useCallback(async (params: Omit<LoginParams, 'captchaId'> & { captchaCode: string }) => {
    try {
      setLoading(true);
      const loginParams: LoginParams = {
        ...params,
        captchaId
      };
      const res = await authService.login(loginParams);
      
      // 登录成功后保存token和用户信息
      localStorage.setItem('token', res.token);
      
      // 获取用户详细信息
      const userInfo = await authService.getCurrentUser();
      
      // 更新全局状态 - 使用映射函数处理属性差异
      const mappedUser = mapUserProfileToUser(userInfo);
      setUser(mappedUser, res.token, mapRoleToStoreRole(userInfo.permission), false);
      
      message.success('登录成功');
      return res;
    } catch (error) {
      console.error('登录失败:', error);
      // 登录失败后重新获取验证码
      getCaptcha();
      throw error;
    } finally {
      setLoading(false);
    }
  }, [captchaId, setUser, getCaptcha]);

  // 注册
  const register = useCallback(async (params: RegisterParams) => {
    try {
      setLoading(true);
      const res = await authService.register(params);
      message.success('注册成功，请登录');
      return res;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authService.logout();
      localStorage.removeItem('token');
      storeLogout();
      message.success('退出成功');
    } catch (error) {
      console.error('退出失败:', error);
      // 即使退出接口报错，也要清除本地登录状态
      localStorage.removeItem('token');
      storeLogout();
    } finally {
      setLoading(false);
    }
  }, [storeLogout]);

  // 自动登录（刷新token）
  const autoLogin = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      setLoading(true);
      // 刷新token
      const res = await authService.refreshToken();
      localStorage.setItem('token', res.token);
      
      // 获取用户信息
      const userInfo = await authService.getCurrentUser();
      
      // 更新全局状态 - 使用映射函数处理属性差异
      const mappedUser = mapUserProfileToUser(userInfo);
      setUser(mappedUser, res.token, mapRoleToStoreRole(userInfo.permission), false);
      
      return true;
    } catch (error) {
      console.error('自动登录失败:', error);
      localStorage.removeItem('token');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  // 忘记密码
  const forgotPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      await authService.forgotPassword(email);
      message.success('重置密码邮件已发送，请查收');
    } catch (error) {
      console.error('发送重置邮件失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 重置密码
  const resetPassword = useCallback(async (email: string, verifyCode: string, password: string) => {
    try {
      setLoading(true);
      await authService.resetPassword(email, verifyCode, password);
      message.success('密码重置成功，请登录');
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    captchaImg,
    captchaId,
    getCaptcha,
    login,
    register,
    logout,
    autoLogin,
    forgotPassword,
    resetPassword
  };
} 