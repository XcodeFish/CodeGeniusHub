import axios, { AxiosRequestConfig } from 'axios';

// 创建axios实例
const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 如果返回的code不是0，则表示请求出错
    if (res.code !== 0) {
      // 处理401未授权
      if (res.code === 1002) {
        // 清除token并跳转到登录页
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res;
  },
  (error) => {
    // 处理网络错误
    return Promise.reject(error);
  }
);

export default request; 