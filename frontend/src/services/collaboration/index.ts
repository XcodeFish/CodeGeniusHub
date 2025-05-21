import { io, Socket } from 'socket.io-client';
import {
  CursorPosition,
  SelectionRange,
  EditMessage,
  CursorMessage,
  CommentMessage,
  StatusMessage
} from '@/types';


// 定义协作服务类
class CollaborationService {
  private socket: Socket | null = null;
  private projectId: string | null = null;

  // 连接到WebSocket服务器
  connect(projectId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.disconnect();
      }

      this.projectId = projectId;
      
      this.socket = io(`/ws/project/${projectId}`, {
        auth: {
          token
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });
    });
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.projectId = null;
    }
  }

  // 发送编辑消息
  sendEdit(message: EditMessage): void {
    if (!this.socket || !this.socket.connected) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.emit('edit', message);
  }

  // 发送光标位置消息
  sendCursor(message: CursorMessage): void {
    if (!this.socket || !this.socket.connected) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.emit('cursor', message);
  }

  // 发送评论消息
  sendComment(message: CommentMessage): void {
    if (!this.socket || !this.socket.connected) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.emit('comment', message);
  }

  // 监听编辑消息
  onEdit(callback: (message: EditMessage) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.on('edit', callback);
  }

  // 监听光标消息
  onCursor(callback: (message: CursorMessage) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.on('cursor', callback);
  }

  // 监听评论消息
  onComment(callback: (message: CommentMessage) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.on('comment', callback);
  }

  // 监听状态消息
  onStatus(callback: (message: StatusMessage) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.on('status', callback);
  }

  // 移除事件监听
  removeListener(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.off(event, callback);
  }

  // 获取当前连接状态
  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  // 获取当前项目ID
  getProjectId(): string | null {
    return this.projectId;
  }
}

// 导出单例实例
export default new CollaborationService(); 