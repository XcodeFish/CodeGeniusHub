import { message } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

/**
 * 统一的消息提示工具
 * 注意: 组件内部推荐使用 useApp() 获取message实例使用
 */
const messageUtil = {
  /**
   * 成功提示
   * @param content 提示内容
   * @param duration 显示时间，单位秒
   */
  success: (content: string, duration: number = 3) => {
    return message.success(content, duration);
  },

  /**
   * 错误提示
   * @param content 提示内容
   * @param duration 显示时间，单位秒
   */
  error: (content: string, duration: number = 3) => {
    return message.error(content, duration);
  },

  /**
   * 警告提示
   * @param content 提示内容
   * @param duration 显示时间，单位秒
   */
  warning: (content: string, duration: number = 3) => {
    return message.warning(content, duration);
  },

  /**
   * 普通信息提示
   * @param content 提示内容
   * @param duration 显示时间，单位秒
   */
  info: (content: string, duration: number = 3) => {
    return message.info(content, duration);
  },

  /**
   * 加载中提示
   * @param content 提示内容
   * @param duration 显示时间，单位秒
   */
  loading: (content: string, duration?: number) => {
    return message.loading(content, duration);
  },
  
  /**
   * 为组件内部提供的message hooks提示
   */
  useMessage: () => message.useMessage()
};

export default messageUtil; 