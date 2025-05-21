import http from '@/utils/request';
import { ResponseData } from '@/types/common';
import { 
  FileVersion, 
  FileContent, 
  CreateFileParams, 
  RollbackParams,
  FileOperationResponse
} from '@/types';

// 文件服务
const fileService = {
  // 创建新文件
  createFile(projectId: string, data: CreateFileParams): Promise<{ fileId: string; filename: string }> {
    return http.post<ResponseData<{ fileId: string; filename: string }>>(`/project/${projectId}/file`, data).then(res => res.data!);
  },

  // 获取文件内容
  getFileContent(projectId: string, fileId: string): Promise<FileContent> {
    return http.get<ResponseData<FileContent>>(`/project/${projectId}/file/${fileId}`).then(res => res.data!);
  },

  // 更新文件内容
  updateFileContent(projectId: string, fileId: string, content: string): Promise<FileOperationResponse> {
    return http.put<ResponseData<FileOperationResponse>>(`/project/${projectId}/file/${fileId}`, { content }).then(res => res.data!);
  },

  // 删除文件
  deleteFile(projectId: string, fileId: string): Promise<FileOperationResponse> {
    return http.delete<ResponseData<FileOperationResponse>>(`/project/${projectId}/file/${fileId}`).then(res => res.data!);
  },

  // 获取文件历史版本
  getFileVersions(projectId: string, fileId: string): Promise<FileVersion[]> {
    return http.get<ResponseData<FileVersion[]>>(`/project/${projectId}/file/${fileId}/versions`).then(res => res.data!);
  },

  // 获取diff对比
  getFileDiff(projectId: string, fileId: string, fromVersion: string, toVersion: string): Promise<{ diff: string }> {
    return http.get<ResponseData<{ diff: string }>>(`/project/${projectId}/file/${fileId}/diff?from=${fromVersion}&to=${toVersion}`).then(res => res.data!);
  },

  // 回滚到指定版本
  rollbackToVersion(projectId: string, fileId: string, versionId: string): Promise<FileOperationResponse> {
    return http.post<ResponseData<FileOperationResponse>>(`/project/${projectId}/file/${fileId}/rollback`, { versionId }).then(res => res.data!);
  }
};

export default fileService; 