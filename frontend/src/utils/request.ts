import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import apiConfig from '@/config/api.config';

// 错误码映射
const ERROR_CODE_MAP: Record<number, string> = {
  0: '成功',
  1001: '参数缺失或格式错误',
  1002: '未授权或Token无效',
  1003: '权限不足',
  1004: '资源不存在或账号不存在',
  1005: '操作冲突或状态异常',
  1006: '服务器内部错误'
};

// 扩展AxiosRequestConfig类型，支持自定义选项
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorHandler?: boolean;
    showSuccessMessage?: boolean;
    successMessage?: string;
  }
}

// 创建axios实例
const request = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  withCredentials: true, // 默认允许跨域携带cookie
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
    console.log('响应拦截器', response);
    const res = response.data;
    
    // 处理201 Created状态码 - 创建成功
    if (response.status === 201 || response.status === 200) {
      return {
        code: 0,
        message: 'success',
        data: res
      };
    }
    
    // 处理304 Not Modified状态码 - 使用缓存内容
    if (response.status === 304) {
      console.log('资源未修改，使用缓存内容:', response);
      // 这里应该直接从浏览器缓存获取数据，而不是返回空数组
      // 因为304意味着应该使用客户端已有的缓存内容
      if (response.data) {
        return response.data;
      }
      // 如果确实没有缓存数据，则提示用户刷新页面
      message.info('数据可能已过期，请刷新页面');
      return {
        code: 0,
        message: 'success',
        data: [] // 作为应急处理返回空数组
      };
    }
    
    // 如果返回的code不是0，则表示请求出错
    if (res.code !== 0) {
      // 如果请求配置了skipErrorHandler，则不进行错误处理
      if (response.config.skipErrorHandler) {
        return Promise.reject(res);
      }
      
      // 根据错误码处理不同情况
      switch (res.code) {
        case 1001:
          // 参数错误
          message.error(res.message || ERROR_CODE_MAP[1001]);
          break;
        case 1002:
          // 未授权/Token无效，清除token并跳转到登录页
          message.error(res.message || ERROR_CODE_MAP[1002]);
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 1003:
          // 权限不足
          message.error(res.message || ERROR_CODE_MAP[1003]);
          break;
        case 1004:
          // 资源不存在
          message.error(res.message || ERROR_CODE_MAP[1004]);
          break;
        case 1005:
          // 操作冲突
          message.error(res.message || ERROR_CODE_MAP[1005]);
          break;
        default:
          // 其他错误
          message.error(res.message || ERROR_CODE_MAP[1006] || '请求失败');
      }
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    
    // 成功情况下，统一处理响应格式
    // 有些接口可能直接返回数据，有些可能包装在data字段中
    if (res.data !== undefined) {
      return res; // 返回整个响应对象，后续可以通过res.data获取数据
    } else {
      // 构造一个符合预期的返回值，将数据放在data字段中
      const { code, message, ...rest } = res;
      return {
        code,
        message,
        data: rest, // 其他字段作为data返回
      };
    }
  },
  (error) => {
    // 如果请求配置了skipErrorHandler，则不进行错误处理
    if (error.config && error.config.skipErrorHandler) {
      return Promise.reject(error);
    }
    
    // 处理网络错误
    if (error.response) {
      // 请求已发出，但服务器响应状态码不在 2xx 范围内
      const status = error.response.status;
      
      // 特殊处理304状态码 - 使用缓存的内容
      if (status === 304) {
        console.log('错误处理器中处理304状态码', error.response);
        
        // 尝试从headers中获取原始URL
        const url = error.config?.url || '';
        
        // 如果有缓存数据就使用
        if (error.response.data) {
          return Promise.resolve({
            code: 0,
            message: 'success',
            data: error.response.data
          });
        }
        
        // 对于项目列表请求，我们应该提示用户刷新页面，而不是默认返回空数组
        if (url.includes('/projects')) {
          console.log('项目列表304请求处理');
          message.info('项目列表数据可能已过期，请刷新页面');
        }
        
        // 返回一个带有提示的响应对象
        return Promise.resolve({
          code: 0,
          message: 'cache_expired',
          data: []
        });
      }
      
      // 特殊处理400错误
      if (status === 400) {
        console.error('请求参数错误:', error.response.data);
        
        // 处理项目列表请求的400错误 - 通常是由于参数问题
        if (error.config?.url?.includes('/projects') && !error.config?.url?.includes('/projects/')) {
          console.warn('项目列表请求参数错误，返回空数组');
          return Promise.resolve({
            code: 0,
            message: 'success',
            data: []
          });
        }
        
        // 显示错误消息但避免使用错误响应中的property should not exist等技术细节
        message.error('请求参数错误，请稍后重试');
        return Promise.reject(error);
      }
      
      switch (status) {
        case 401:
          // 身份验证失败
          console.error('授权失败:', error.response.data);
          
          // 如果是项目列表请求，返回空数组避免UI报错
          if (error.config?.url?.includes('/projects')) {
            console.log('项目列表请求授权失败，返回空数组');
            return Promise.resolve({
              code: 0,
              message: 'success',
              data: []
            });
          }
          
          message.error('会话已过期，请重新登录');
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          message.error('您没有权限访问此资源');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 429:
          // 处理频率限制错误，显示自定义消息
          if (error.response.data && error.response.data.message) {
            message.warning(error.response.data.message);
          } else {
            message.warning('请求过于频繁，请稍后再试');
          }
          break;
        case 500:
          message.error('服务器内部错误');
          break;
        default:
          message.error(`请求失败，状态码：${status}`);
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      message.error('网络连接超时，请检查您的网络');
    } else {
      // 请求配置出错
      message.error('请求配置错误：' + error.message);
    }
    return Promise.reject(error);
  }
);

// 封装请求方法
interface RequestOptions extends AxiosRequestConfig {
  skipErrorHandler?: boolean; // 是否跳过默认的错误处理
  showSuccessMessage?: boolean; // 是否显示成功消息
  successMessage?: string; // 自定义成功消息
}

// 通用请求方法
const http = {
  // GET请求
  get: <T = any>(url: string, params?: any, options?: RequestOptions): Promise<T> => {
    return request({
      method: 'GET',
      url,
      params,
      ...options
    }).then((res: any) => {
      if (options?.showSuccessMessage) {
        message.success(options.successMessage || res.message || '操作成功');
      }
      
      // 处理空响应或异常格式
      if (!res) {
        console.warn(`GET ${url} 返回空响应`);
        return {} as T;
      }
      
      // 确保返回数据格式正确
      if (res.data === undefined && url.includes('/projects')) {
        console.warn(`GET ${url} 返回数据格式异常:`, res);
        // 对于项目列表，如果数据异常，尝试直接返回res作为数据
        return (Array.isArray(res) ? res : (res.data || [])) as T;
      }
      
      return res;
    });
  },

  // POST请求
  post: <T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> => {
    return request({
      method: 'POST',
      url,
      data,
      ...options
    }).then((res: any) => {
      if (options?.showSuccessMessage) {
        message.success(options.successMessage || res.message || '操作成功');
      }
      return res;
    });
  },

  // PUT请求
  put: <T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> => {
    return request({
      method: 'PUT',
      url,
      data,
      ...options
    }).then((res: any) => {
      if (options?.showSuccessMessage) {
        message.success(options.successMessage || res.message || '操作成功');
      }
      return res;
    });
  },

  // PATCH请求
  patch: <T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> => {
    return request({
      method: 'PATCH',
      url,
      data,
      ...options
    }).then((res: any) => {
      if (options?.showSuccessMessage) {
        message.success(options.successMessage || res.message || '操作成功');
      }
      return res;
    });
  },


  // DELETE请求
  delete: <T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> => {
    return request({
      method: 'DELETE',
      url,
      data,
      ...options
    }).then((res: any) => {
      if (options?.showSuccessMessage) {
        message.success(options.successMessage || res.message || '操作成功');
      }
      return res;
    });
  },

  // 上传文件
  upload: <T = any>(url: string, file: File | FormData, options?: RequestOptions): Promise<T> => {
    const formData = file instanceof FormData ? file : new FormData();
    if (!(file instanceof FormData)) {
      formData.append('file', file);
    }

    return request({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...options
    }).then((res: any) => {
      if (options?.showSuccessMessage) {
        message.success(options.successMessage || res.message || '上传成功');
      }
      return res;
    });
  }
};

export default http; 