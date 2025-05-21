import authService from './auth';
import userService from './user';
import projectService from './project';
import fileService from './file';
import aiService from './ai';
import collaborationService from './collaboration';

// 导出所有服务
export {
  authService,
  userService,
  projectService,
  fileService,
  aiService,
  collaborationService
};

// 默认导出所有服务的集合
export default {
  auth: authService,
  user: userService,
  project: projectService,
  file: fileService,
  ai: aiService,
  collaboration: collaborationService
}; 