import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { useUserStore } from '@/stores/userStore';
import { LoginParams, RegisterParams } from '@/types/auth';
import { UserProfile, User } from '@/types/user';
import authService from '@/services/auth';
import { AxiosError } from 'axios';
import messageUtil from '@/utils/message-util';
import { saveTokenInfo, clearTokenInfo, getToken, isTokenExpiredOrExpiring, isTokenRemembered } from '@/utils/token-util';

// 类型转换工具函数
const mapRoleToStoreRole = (role: string): 'admin' | 'editor' | 'viewer' => {
  if (role === 'admin') return 'admin';
  if (role === 'editor') return 'editor';
  return 'viewer';
};

// 将UserProfile映射为User的函数
const mapUserProfileToUser = (profile: UserProfile): User => {
  return {
    id: profile.id || profile.userId || '',
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
        identifier: params.identifier,
        password: params.password,
        remember: params.remember,
        captchaId,
        captchaCode: params.captchaCode
      };
      
      console.log('登录参数:', loginParams); // 添加日志，便于排查问题
      
      const res = await authService.login(loginParams);
      console.log('登录成功:', res);
      
      // 检查响应结构
      if (!res.data) {
        console.error('登录响应缺少data字段:', res);
        throw new Error('登录响应格式错误');
      }

      // 从res.data中获取数据
      const { accessToken, user } = res.data;
      console.log('accessToken:', accessToken);
      console.log('user:', user);
      
      // 确保accessToken存在再保存
      if (accessToken) {
        // 登录成功后保存token和相关信息
        saveTokenInfo(accessToken, params.remember || false);
      } else {
        console.error('登录响应中缺少accessToken');
        throw new Error('登录响应中缺少accessToken');
      }
      
      // 使用用户信息
      if (user) {
        // 更新全局状态 - 使用映射函数处理差异
        const mappedUser = mapUserProfileToUser(user as unknown as UserProfile);
        setUser(mappedUser, accessToken, mapRoleToStoreRole(user.permission), params.remember || false);
      } else {
        console.error('登录响应中缺少用户信息');
        throw new Error('登录响应中缺少用户信息');
      }
      
      messageUtil.success('登录成功');
      return res;
    } catch (error: any) {
      console.error('登录失败:', error);
      
      // 更详细地记录错误信息
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('请求已发送但未收到响应:', error.request);
      } else {
        console.error('请求配置出错:', error.message);
      }
      
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
      clearTokenInfo();
      storeLogout();
      message.success('退出成功');
    } catch (error) {
      console.error('退出失败:', error);
      // 即使退出接口报错，也要清除本地登录状态
      clearTokenInfo();
      storeLogout();
    } finally {
      setLoading(false);
    }
  }, [storeLogout]);

  // 自动登录（检查token有效性并在需要时刷新）
  const autoLogin = useCallback(async () => {
    try {
      // 检查localStorage中是否存在token
      const token = getToken();
      const currentState = useUserStore.getState();
      
      // 首先检查是否已有完整的登录状态(token+用户信息)
      if (token && currentState.user && (currentState.user.id || currentState.user.userId)) {
        console.log('已有完整登录状态，跳过所有自动登录流程');
        return true; // 直接返回，不做任何API请求
      }
      
      if (!token) {
        console.log('本地不存在token，无法进行自动登录');
        return false;
      }

      // 检查token是否过期或即将过期
      const tokenExpiring = isTokenExpiredOrExpiring();
      const isRemembered = isTokenRemembered();
      
      console.log(
        `自动登录检查 - Token${tokenExpiring ? '已过期或即将过期' : '有效'}, ${
          isRemembered ? '记住用户' : '未记住用户'
        }`
      );

      // 如果token有效且不是即将过期，直接使用已有信息
      if (!tokenExpiring) {
        console.log('token有效且未接近过期，使用现有登录状态');
        
        // 获取用户信息
        try {
          setLoading(true);
          let userInfo = await authService.getCurrentUser();
          userInfo = {
            ...userInfo,
            id: userInfo.userId || ''  //这里为森么这样写 是因为 getCurrentUser接口返回的是id 登录接口返回是id
          }
          console.log('获取到的用户信息:', userInfo);
          const mappedUser = mapUserProfileToUser(userInfo);
          setUser(mappedUser, token, mapRoleToStoreRole(userInfo.permission), isRemembered);
          return true;
        } catch (error: any) {
          console.error('获取用户信息失败:', error);

          // 不论什么错误都清除token，确保状态一致
          clearTokenInfo();
          
          // 如果是401错误，表示token实际已失效
          if (error.response && error.response.status === 401) {
            messageUtil.warning('登录已失效，请重新登录');
          } else {
            messageUtil.error('获取用户信息失败，请重新登录');
          }
          
          return false;
        } finally {
          setLoading(false);
        }
      }
      
      // 如果token已过期或即将过期，且是"记住我"用户，尝试刷新token
      if (isRemembered && tokenExpiring) {
        try {
          setLoading(true);
          console.log('token即将过期且已记住用户，尝试刷新token...');
          const res = await authService.refreshToken();
          
          // 保存新的accessToken和相关信息
          saveTokenInfo(res.accessToken, true);
          
          // 获取用户信息
          const userInfo = await authService.getCurrentUser();
          
          // 更新全局状态
          const mappedUser = mapUserProfileToUser(userInfo);
          setUser(mappedUser, res.accessToken, mapRoleToStoreRole(userInfo.permission), true);
          
          return true;
        } catch (error: any) {
          console.error('刷新Token失败:', error);
          
          // 处理超时或其他错误
          if (error.message && error.message.includes('timeout')) {
            messageUtil.warning('自动登录失败，请手动登录');
          } else if (error.response && error.response.status === 401) {
            messageUtil.warning('登录已过期，请重新登录');
          }
          
          // 清除所有token相关信息
          clearTokenInfo();
          
          return false;
        } finally {
          setLoading(false);
        }
      } else if (tokenExpiring) {
        // 未勾选"记住我"且token过期，提示重新登录
        console.log('token已过期且未勾选"记住我"，需要重新登录');
        clearTokenInfo();
        messageUtil.warning('登录已过期，请重新登录');
        return false;
      }
      
      return false;
    } catch (error: any) {
      console.error('自动登录过程出现未处理的错误:', error);
      clearTokenInfo();
      return false;
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
    login,
    register,
    logout,
    autoLogin,
    getCaptcha,
    forgotPassword,
    resetPassword
  };
}