import http from '@/utils/request';
import { ResponseData } from '@/types/common';
import { UserProfile, UpdateProfileParams, ChangePasswordParams } from '@/types';

// 用户服务
const userService = {
  // 获取当前用户信息
  getUserProfile(): Promise<UserProfile> {
    return http.get<ResponseData<UserProfile>>('/user/profile').then(res => res.data!);
  },

  // 更新用户信息
  updateUserProfile(data: UpdateProfileParams): Promise<void> {
    return http.put('/user/profile', data);
  },

  // 更改密码
  changePassword(data: ChangePasswordParams): Promise<void> {
    return http.put('/user/change-password', data);
  }
};

export default userService; 