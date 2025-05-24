import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

/**
 * Socket状态接口
 */
interface SocketState {
  // Socket实例
  socket: Socket | null;
  // 连接状态
  connected: boolean;
  // 连接中状态 
  connecting: boolean;
  // 连接Socket
  connect: (token: string) => Promise<Socket>;
  // 断开Socket连接
  disconnect: () => void;
  // 设置连接状态
  setConnected: (connected: boolean) => void;
}

/**
 * Socket状态管理
 */
export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  connecting: false,

  // 连接Socket
  connect: async (token: string) => {
    // 如果正在连接中，返回已有的promise以避免重复连接
    if (get().connecting) {
      return new Promise<Socket>((resolve, reject) => {
        const checkSocket = () => {
          const { socket, connected } = get();
          if (socket && connected) {
            resolve(socket);
          } else if (!get().connecting) {
            reject(new Error('连接失败'));
          } else {
            setTimeout(checkSocket, 100);
          }
        };
        checkSocket();
      });
    }

    // 如果已经连接，先断开
    const { socket: existingSocket, disconnect } = get();
    if (existingSocket) {
      disconnect();
    }

    // 设置连接中状态
    set({ connecting: true });

    try {
      // 创建新的Socket连接
      // 使用相对路径，由Next.js处理代理 (默认使用根路径)
      const socket = io('http://localhost:9000', {
        auth: {
          token
        },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      return new Promise<Socket>((resolve, reject) => {
        // 监听连接事件
        socket.on('connect', () => {
          console.log('WebSocket connected');
          set({ socket, connected: true, connecting: false });
          resolve(socket);
        });

        // 监听断开连接事件
        socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          set({ connected: false });
        });

        // 监听连接错误事件
        socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          set({ connected: false, connecting: false });
          reject(error);
        });

        // 设置连接超时
        setTimeout(() => {
          if (!get().connected) {
            socket.disconnect();
            set({ connecting: false });
            reject(new Error('连接超时'));
          }
        }, 10000); // 设置为与socket配置中相同的超时时间
      });
    } catch (error) {
      set({ connecting: false });
      throw error;
    }
  },

  // 断开Socket连接
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false, connecting: false });
    }
  },

  // 设置连接状态
  setConnected: (connected) => set({ connected })
})); 