// 文件版本类型
export interface FileVersion {
  versionId: string;
  timestamp: string;
  author: string;
  authorId: string;
}

// 文件内容类型
export interface FileContent {
  fileId: string;
  filename: string;
  content: string;
  versions: FileVersion[];
}

// 文件创建参数
export interface CreateFileParams {
  filename: string;
  content?: string;
}

// 文件更新参数
export interface UpdateFileParams {
  content: string;
}

// 版本回滚参数
export interface RollbackParams {
  versionId: string;
}

// 文件操作响应
export interface FileOperationResponse {
  success: boolean;
  versionId?: string;
} 