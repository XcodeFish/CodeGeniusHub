// frontend/src/modules/User/useUser.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { ChangePasswordParams } from '@/types';
import userService from '@/services/user';
import { AxiosError } from 'axios';
import messageUtil from '@/utils/message-util';
import { clearTokenInfo } from '@/utils/token-util';

// 创建自定义Hook
export const useUser = () => {

  const { logout: storeLogout} = useUserStore();

  const changePassword = useCallback(async (params: ChangePasswordParams) => {
    try {
      const res = await userService.changePassword(params);

      messageUtil.success('密码更新成功，请重新登录');

      // 3. 清除token和用户信息
      clearTokenInfo();
      storeLogout();

      return res;
    } catch (error) {
      throw error;
    }
  }, [storeLogout]);

  return {
    changePassword
  };
};

// 为了向后兼容，也可以直接导出changePassword函数
export const changePassword = async (params: ChangePasswordParams) => {
  try {
    const res = await userService.changePassword(params);
    return res;
  } catch (error) {
    throw error;
  }
};