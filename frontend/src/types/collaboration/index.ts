// 光标位置类型
export interface CursorPosition {
  line: number;
  column: number;
}

// 选择范围类型
export interface SelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

// 文本编辑类型
export interface TextEdit {
  range: SelectionRange;
  text: string;
}

// 编辑消息类型
export interface EditMessage {
  userId: string;
  fileId: string;
  range: SelectionRange;
  text: string;
}

// 光标消息类型
export interface CursorMessage {
  userId: string;
  fileId: string;
  position: CursorPosition;
  selection?: SelectionRange;
}

// 评论消息类型
export interface CommentMessage {
  userId: string;
  fileId: string;
  line: number;
  content: string;
}

// 状态消息类型
export interface StatusMessage {
  userId: string;
  online: boolean;
  username?: string;
  role?: string;
}

// 用户信息类型
export interface CollaboratorInfo {
  userId: string;
  username: string;
  role: string;
  online: boolean;
  lastSeen?: string;
  cursorPosition?: CursorPosition;
  selection?: SelectionRange;
}

// 评论类型
export interface Comment {
  id: string;
  userId: string;
  username: string;
  fileId: string;
  line: number;
  content: string;
  timestamp: string;
} 