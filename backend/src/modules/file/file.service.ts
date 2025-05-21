import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as diff from 'diff';
import { ProjectService } from '../project/project.service';
import { PermissionService } from '../../common/services/permission.service';
import { File, FileDocument } from './schemas/file.schema';
import {
  FileVersion,
  FileVersionDocument,
} from './schemas/file-version.schema';
import {
  CreateFileDto,
  UpdateFileDto,
  RenameFileDto,
  MoveFileDto,
  RollbackFileDto,
  FILE_ERROR,
  AddVersionTagDto,
  VersionQueryDto,
  DiffOptionsDto,
} from './dto/file.dto';
import { Permission } from '@/modules/user/schemas/user.schema';

interface FileChangeHistory {
  fileId: string;
  projectId: string;
  userId: string;
  type: 'create' | 'update' | 'delete' | 'rename' | 'move' | 'rollback';
  timestamp: Date;
  details: {
    filename?: string;
    oldFilename?: string;
    oldPath?: string;
    newPath?: string;
    content?: string;
    size?: number;
    versionId?: string;
    commitMessage?: string;
  };
}

export interface SearchResult {
  fileId: string;
  filename: string;
  projectId: string;
  path: string;
  content: string;
  matches: {
    line: number;
    text: string;
  }[];
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectModel(File.name) private fileModel: Model<FileDocument>,
    @InjectModel(FileVersion.name)
    private fileVersionModel: Model<FileVersionDocument>,
    private readonly projectService: ProjectService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * 创建新文件
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param createFileDto 文件创建DTO
   * @returns 创建的文件
   */
  async createFile(
    projectId: string,
    userId: string,
    createFileDto: CreateFileDto,
  ): Promise<FileDocument> {
    // 验证用户有编辑权限
    await this.permissionService.validateProjectEditAccess(userId, projectId);

    // 检查同名文件是否存在
    const existingFile = await this.fileModel.findOne({
      projectId,
      filename: createFileDto.filename,
      path: createFileDto.path || null,
      isDeleted: false,
    });

    if (existingFile) {
      throw new BadRequestException(FILE_ERROR.ALREADY_EXISTS);
    }

    // 创建文件
    const content = createFileDto.content || '';
    const fileData = {
      ...createFileDto,
      projectId,
      createdBy: userId,
      lastModifiedBy: userId,
      lastModifiedAt: new Date(),
      size: content.length,
    };

    const file = await this.fileModel.create(fileData);

    // 创建初始版本
    if (content) {
      await this.createFileVersion(
        file._id.toString(),
        projectId,
        userId,
        content,
        '初始版本',
      );

      // 更新版本计数
      await this.fileModel.findByIdAndUpdate(file._id, {
        versionsCount: 1,
      });
    }

    // 记录文件变更历史
    await this.recordFileChange({
      fileId: file._id.toString(),
      projectId,
      userId,
      type: 'create',
      timestamp: new Date(),
      details: {
        filename: file.filename,
        size: file.size,
      },
    });

    return file;
  }

  /**
   * 获取项目中的所有文件
   * @param projectId 项目ID
   * @param userId 用户ID
   * @returns 文件列表
   */
  async getProjectFiles(
    projectId: string,
    userId: string,
  ): Promise<FileDocument[]> {
    // 验证用户有项目访问权限
    await this.permissionService.validateProjectAccess(userId, projectId);

    // 获取项目文件
    return this.fileModel
      .find({
        projectId,
        isDeleted: false,
      })
      .sort({ filename: 1 });
  }

  /**
   * 获取文件详情
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @returns 文件详情
   */
  async getFileById(
    fileId: string,
    projectId: string,
    userId: string,
  ): Promise<FileDocument> {
    // 验证用户有项目访问权限
    await this.permissionService.validateProjectAccess(userId, projectId);

    // 获取文件
    const file = await this.fileModel.findOne({
      _id: fileId,
      projectId,
      isDeleted: false,
    });

    if (!file) {
      throw new NotFoundException(FILE_ERROR.NOT_FOUND);
    }

    return file;
  }

  /**
   * 更新文件内容
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param updateFileDto 文件更新DTO
   * @returns 更新后的文件
   */
  async updateFileContent(
    fileId: string,
    projectId: string,
    userId: string,
    updateFileDto: UpdateFileDto,
  ): Promise<FileDocument> {
    // 验证用户有编辑权限
    await this.permissionService.validateProjectEditAccess(userId, projectId);

    // 获取文件
    const file = await this.getFileById(fileId, projectId, userId);

    // 创建新版本
    const versionNumber = await this.createFileVersion(
      fileId,
      projectId,
      userId,
      updateFileDto.content,
      updateFileDto.commitMessage || '更新文件内容',
    );

    // 更新文件
    const updatedFile = await this.fileModel.findByIdAndUpdate(
      fileId,
      {
        content: updateFileDto.content,
        size: updateFileDto.content.length,
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
        versionsCount: versionNumber,
      },
      { new: true },
    );

    if (!updatedFile) {
      throw new NotFoundException(FILE_ERROR.NOT_FOUND);
    }

    // 记录文件变更历史
    await this.recordFileChange({
      fileId: fileId,
      projectId,
      userId,
      type: 'update',
      timestamp: new Date(),
      details: {
        content: updateFileDto.content,
        size: updateFileDto.content.length,
      },
    });

    return updatedFile;
  }

  /**
   * 重命名文件
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param renameFileDto 文件重命名DTO
   * @returns 更新后的文件
   */
  async renameFile(
    fileId: string,
    projectId: string,
    userId: string,
    renameFileDto: RenameFileDto,
  ): Promise<FileDocument> {
    // 验证用户有编辑权限
    await this.permissionService.validateProjectEditAccess(userId, projectId);

    // 获取文件
    const file = await this.getFileById(fileId, projectId, userId);

    // 检查同名文件是否存在
    const existingFile = await this.fileModel.findOne({
      projectId,
      filename: renameFileDto.newFilename,
      path: file.path,
      isDeleted: false,
      _id: { $ne: fileId }, // 排除当前文件
    });

    if (existingFile) {
      throw new BadRequestException(FILE_ERROR.ALREADY_EXISTS);
    }

    // 更新文件名
    const updatedFile = await this.fileModel.findByIdAndUpdate(
      fileId,
      {
        filename: renameFileDto.newFilename,
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedFile) {
      throw new NotFoundException(FILE_ERROR.NOT_FOUND);
    }

    // 记录文件变更历史
    await this.recordFileChange({
      fileId: fileId,
      projectId,
      userId,
      type: 'rename',
      timestamp: new Date(),
      details: {
        oldFilename: file.filename,
        filename: renameFileDto.newFilename,
      },
    });

    return updatedFile;
  }

  /**
   * 移动文件
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param moveFileDto 文件移动DTO
   * @returns 更新后的文件
   */
  async moveFile(
    fileId: string,
    projectId: string,
    userId: string,
    moveFileDto: MoveFileDto,
  ): Promise<FileDocument> {
    // 验证用户有编辑权限
    await this.permissionService.validateProjectEditAccess(userId, projectId);

    // 获取文件
    const file = await this.getFileById(fileId, projectId, userId);

    // 检查同名文件是否存在
    const existingFile = await this.fileModel.findOne({
      projectId,
      filename: file.filename,
      path: moveFileDto.newPath,
      isDeleted: false,
      _id: { $ne: fileId }, // 排除当前文件
    });

    if (existingFile) {
      throw new BadRequestException(FILE_ERROR.ALREADY_EXISTS);
    }

    // 更新文件路径
    const updatedFile = await this.fileModel.findByIdAndUpdate(
      fileId,
      {
        path: moveFileDto.newPath,
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedFile) {
      throw new NotFoundException(FILE_ERROR.NOT_FOUND);
    }

    // 记录文件变更历史
    await this.recordFileChange({
      fileId: fileId,
      projectId,
      userId,
      type: 'move',
      timestamp: new Date(),
      details: {
        oldPath: file.path,
        newPath: moveFileDto.newPath,
      },
    });

    return updatedFile;
  }

  /**
   * 删除文件
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @returns 是否成功
   */
  async deleteFile(
    fileId: string,
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    // 验证用户有编辑权限
    await this.permissionService.validateProjectEditAccess(userId, projectId);

    // 获取文件
    const file = await this.getFileById(fileId, projectId, userId);

    // 标记文件为已删除
    await this.fileModel.findByIdAndUpdate(fileId, {
      isDeleted: true,
      lastModifiedBy: userId,
      lastModifiedAt: new Date(),
    });

    // 记录文件变更历史
    await this.recordFileChange({
      fileId: fileId,
      projectId,
      userId,
      type: 'delete',
      timestamp: new Date(),
      details: {
        filename: file.filename,
      },
    });

    return true;
  }

  /**
   * 获取文件历史版本
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param query 查询参数
   * @returns 版本列表
   */
  async getFileVersions(
    fileId: string,
    projectId: string,
    userId: string,
    query?: VersionQueryDto,
  ): Promise<FileVersionDocument[]> {
    // 验证用户有项目访问权限
    await this.permissionService.validateProjectAccess(userId, projectId);

    // 获取文件
    await this.getFileById(fileId, projectId, userId);

    // 构建查询条件
    const filter: any = { fileId, projectId };

    // 应用筛选条件
    if (query) {
      if (query.tag) {
        filter.tags = query.tag;
      }

      if (query.importance) {
        filter.importance = query.importance;
      }

      if (query.onlyReleaseVersions) {
        filter.isReleaseVersion = true;
      }

      if (query.createdBy) {
        filter.createdBy = query.createdBy;
      }

      if (query.startDate || query.endDate) {
        filter.createdAt = {};

        if (query.startDate) {
          filter.createdAt.$gte = new Date(query.startDate);
        }

        if (query.endDate) {
          filter.createdAt.$lte = new Date(query.endDate);
        }
      }
    }

    // 构建查询
    let versionsQuery = this.fileVersionModel
      .find(filter)
      .sort({ versionNumber: -1 });

    // 应用限制条件
    if (query && query.limit) {
      versionsQuery = versionsQuery.limit(query.limit);
    }

    // 获取文件版本
    return versionsQuery.exec();
  }

  /**
   * 获取文件版本内容
   * @param versionId 版本ID
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @returns 版本内容
   */
  async getFileVersionContent(
    versionId: string,
    fileId: string,
    projectId: string,
    userId: string,
  ): Promise<FileVersionDocument> {
    // 验证项目存在且用户有访问权限
    await this.projectService.getProjectById(projectId, userId);

    // 获取文件
    await this.getFileById(fileId, projectId, userId);

    // 获取版本
    const version = await this.fileVersionModel.findOne({
      _id: versionId,
      fileId,
      projectId,
    });

    if (!version) {
      throw new NotFoundException(FILE_ERROR.NOT_FOUND);
    }

    return version;
  }

  /**
   * 获取文件版本差异
   * @param fromVersionId 源版本ID
   * @param toVersionId 目标版本ID
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param options 差异选项
   * @returns 差异内容和统计信息
   */
  async getFileDiff(
    fromVersionId: string,
    toVersionId: string,
    fileId: string,
    projectId: string,
    userId: string,
    options?: DiffOptionsDto,
  ): Promise<{
    diff: string;
    fromVersion: FileVersionDocument;
    toVersion: FileVersionDocument;
    stats: { additions: number; deletions: number; changes: number };
  }> {
    // 获取源版本
    const fromVersion = await this.getFileVersionContent(
      fromVersionId,
      fileId,
      projectId,
      userId,
    );

    // 获取目标版本
    const toVersion = await this.getFileVersionContent(
      toVersionId,
      fileId,
      projectId,
      userId,
    );

    // 设置默认选项
    const diffOptions = {
      format: options?.format || 'unified',
      contextLines: options?.contextLines || 3,
      ignoreWhitespace: options?.ignoreWhitespace || false,
    };

    // 预处理内容（如果需要忽略空白）
    let fromContent = fromVersion.content;
    let toContent = toVersion.content;

    if (diffOptions.ignoreWhitespace) {
      fromContent = fromContent.replace(/\s+/g, ' ').trim();
      toContent = toContent.replace(/\s+/g, ' ').trim();
    }

    // 计算差异
    let diffResult: string;
    const stats = { additions: 0, deletions: 0, changes: 0 };

    if (diffOptions.format === 'unified') {
      diffResult = diff.createPatch(
        'file',
        fromContent,
        toContent,
        `版本 ${fromVersion.versionNumber}`,
        `版本 ${toVersion.versionNumber}`,
        { context: diffOptions.contextLines },
      );

      // 分析统计信息
      const diffLines = diffResult.split('\n').slice(4); // 跳过头部信息
      for (const line of diffLines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          stats.additions++;
          stats.changes++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          stats.deletions++;
          stats.changes++;
        }
      }
    } else if (diffOptions.format === 'json') {
      const changes = diff.diffLines(fromContent, toContent, {
        ignoreWhitespace: diffOptions.ignoreWhitespace,
      });

      // 为JSON格式准备数据
      const jsonDiff = changes.map((part, index) => {
        const item: any = {
          value: part.value,
          lineNumber: index + 1,
        };

        if (part.added) {
          item.type = 'addition';
          stats.additions += part.count || part.value.split('\n').length - 1;
          stats.changes += part.count || part.value.split('\n').length - 1;
        } else if (part.removed) {
          item.type = 'deletion';
          stats.deletions += part.count || part.value.split('\n').length - 1;
          stats.changes += part.count || part.value.split('\n').length - 1;
        } else {
          item.type = 'unchanged';
        }

        return item;
      });

      diffResult = JSON.stringify(jsonDiff, null, 2);
    } else {
      // line-by-line
      const changes = diff.diffLines(fromContent, toContent, {
        ignoreWhitespace: diffOptions.ignoreWhitespace,
      });

      // 为line-by-line格式准备数据
      let lineByLineDiff = '';
      let oldLineNum = 1;
      let newLineNum = 1;

      for (const part of changes) {
        if (part.added) {
          const lines = part.value.split('\n');
          for (let i = 0; i < lines.length - 1; i++) {
            lineByLineDiff += `+  ${newLineNum++} | ${lines[i]}\n`;
            stats.additions++;
            stats.changes++;
          }
        } else if (part.removed) {
          const lines = part.value.split('\n');
          for (let i = 0; i < lines.length - 1; i++) {
            lineByLineDiff += `-  ${oldLineNum++} | ${lines[i]}\n`;
            stats.deletions++;
            stats.changes++;
          }
        } else {
          const lines = part.value.split('\n');
          for (let i = 0; i < lines.length - 1; i++) {
            lineByLineDiff += `   ${oldLineNum++}/${newLineNum++} | ${lines[i]}\n`;
          }
        }
      }

      diffResult = lineByLineDiff;
    }

    return {
      diff: diffResult,
      fromVersion,
      toVersion,
      stats,
    };
  }

  /**
   * 回滚文件到指定版本
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param rollbackDto 回滚DTO
   * @returns 更新后的文件
   */
  async rollbackFile(
    fileId: string,
    projectId: string,
    userId: string,
    rollbackDto: RollbackFileDto,
  ): Promise<FileDocument> {
    // 验证项目存在且用户有编辑权限
    const project = await this.projectService.getProjectById(projectId, userId);
    const userRole = this.projectService.getUserRoleInProject(project, userId);

    if (userRole === Permission.VIEWER) {
      throw new ForbiddenException(FILE_ERROR.PERMISSION_DENIED);
    }

    // 获取文件
    const file = await this.getFileById(fileId, projectId, userId);

    // 获取目标版本
    const targetVersion = await this.getFileVersionContent(
      rollbackDto.versionId,
      fileId,
      projectId,
      userId,
    );

    // 创建新版本（标记为回滚版本）
    const commitMessage =
      rollbackDto.commitMessage || `回滚到版本 ${targetVersion.versionNumber}`;

    const versionNumber = await this.createFileVersion(
      fileId,
      projectId,
      userId,
      targetVersion.content,
      commitMessage,
      true,
      rollbackDto.versionId,
    );

    // 更新文件
    const updatedFile = await this.fileModel.findByIdAndUpdate(
      fileId,
      {
        content: targetVersion.content,
        size: targetVersion.content.length,
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
        versionsCount: versionNumber,
      },
      { new: true },
    );

    if (!updatedFile) {
      throw new NotFoundException(FILE_ERROR.NOT_FOUND);
    }

    // 记录文件变更历史
    await this.recordFileChange({
      fileId: fileId,
      projectId,
      userId,
      type: 'rollback',
      timestamp: new Date(),
      details: {
        versionId: rollbackDto.versionId,
        commitMessage: rollbackDto.commitMessage,
      },
    });

    return updatedFile;
  }

  /**
   * 创建文件版本
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param content 文件内容
   * @param commitMessage 提交信息
   * @param isRollback 是否为回滚版本
   * @param rollbackFromVersion 回滚源版本ID
   * @returns 版本号
   */
  private async createFileVersion(
    fileId: string,
    projectId: string,
    userId: string,
    content: string,
    commitMessage: string,
    isRollback: boolean = false,
    rollbackFromVersion: string | null = null,
  ): Promise<number> {
    // 获取最新版本号
    const latestVersion = await this.fileVersionModel
      .findOne({
        fileId,
      })
      .sort({ versionNumber: -1 });

    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // 创建版本
    await this.fileVersionModel.create({
      fileId,
      projectId,
      content,
      versionNumber,
      size: content.length,
      createdBy: userId,
      commitMessage,
      isRollback,
      rollbackFromVersion,
      tags: [],
      tagColor: 'gray',
      importance: 'medium',
      isReleaseVersion: false,
      releaseNote: '',
      versionType: null,
      metadata: {},
    });

    return versionNumber;
  }

  /**
   * 记录文件变更历史
   * @param change 变更记录
   */
  private async recordFileChange(change: FileChangeHistory): Promise<void> {
    try {
      await this.fileVersionModel.create({
        fileId: change.fileId,
        projectId: change.projectId,
        content: change.details.content || '',
        versionNumber: await this.getNextVersionNumber(change.fileId),
        size: change.details.size || 0,
        createdBy: change.userId,
        commitMessage: this.generateCommitMessage(change),
        changeType: change.type,
        changeDetails: change.details,
      });
    } catch (error) {
      this.logger.error(`Failed to record file change: ${error.message}`);
    }
  }

  /**
   * 获取下一个版本号
   * @param fileId 文件ID
   * @returns 下一个版本号
   */
  private async getNextVersionNumber(fileId: string): Promise<number> {
    const latestVersion = await this.fileVersionModel
      .findOne({ fileId })
      .sort({ versionNumber: -1 });
    return latestVersion ? latestVersion.versionNumber + 1 : 1;
  }

  /**
   * 生成提交信息
   * @param change 变更记录
   * @returns 提交信息
   */
  private generateCommitMessage(change: FileChangeHistory): string {
    switch (change.type) {
      case 'create':
        return `创建文件 ${change.details.filename}`;
      case 'update':
        return `更新文件内容`;
      case 'delete':
        return `删除文件 ${change.details.filename}`;
      case 'rename':
        return `重命名文件 ${change.details.oldFilename} -> ${change.details.filename}`;
      case 'move':
        return `移动文件 ${change.details.oldPath} -> ${change.details.newPath}`;
      case 'rollback':
        return `回滚到版本 ${change.details.versionId} - ${change.details.commitMessage}`;
      default:
        return '未知操作';
    }
  }

  /**
   * 获取文件变更历史
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @returns 变更历史列表
   */
  async getFileChangeHistory(
    fileId: string,
    projectId: string,
    userId: string,
  ): Promise<FileChangeHistory[]> {
    // 验证项目存在且用户有访问权限
    await this.projectService.getProjectById(projectId, userId);

    // 获取文件
    await this.getFileById(fileId, projectId, userId);

    // 获取变更历史
    const versions = await this.fileVersionModel
      .find({
        fileId,
        projectId,
      })
      .sort({ versionNumber: -1 });

    // 创建自定义的FileChangeHistory响应格式
    return versions.map((version) => {
      // 需要手动转换version到FileChangeHistory格式
      const result: FileChangeHistory = {
        fileId: version.fileId,
        projectId: version.projectId,
        userId: version.createdBy.toString(),
        type: version.isRollback ? 'rollback' : 'update',
        timestamp: new Date(version['createdAt']), // 创建时间在MongoDB document的元数据中
        details: {
          content: version.content,
          size: version.size,
          commitMessage: version.commitMessage,
          versionId: version.rollbackFromVersion,
        },
      };
      return result;
    });
  }

  /**
   * 搜索文件
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param query 搜索关键词
   * @param options 搜索选项
   * @returns 搜索结果
   */
  async searchFiles(
    projectId: string,
    userId: string,
    query: string,
    options: {
      caseSensitive?: boolean;
      regex?: boolean;
      includeContent?: boolean;
    } = {},
  ): Promise<SearchResult[]> {
    // 验证项目存在且用户有访问权限
    await this.projectService.getProjectById(projectId, userId);

    // 获取项目中的所有文件
    const files = await this.fileModel.find({
      projectId,
      isDeleted: false,
    });

    const results: SearchResult[] = [];

    for (const file of files) {
      const matches: { line: number; text: string }[] = [];
      let searchRegex: RegExp;

      try {
        if (options.regex) {
          searchRegex = new RegExp(query, options.caseSensitive ? '' : 'i');
        } else {
          searchRegex = new RegExp(
            query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            options.caseSensitive ? '' : 'i',
          );
        }
      } catch (error) {
        throw new BadRequestException('无效的正则表达式');
      }

      // 搜索文件名
      if (searchRegex.test(file.filename)) {
        matches.push({
          line: 0,
          text: `文件名匹配: ${file.filename}`,
        });
      }

      // 搜索文件内容
      if (options.includeContent && file.content) {
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (searchRegex.test(lines[i])) {
            matches.push({
              line: i + 1,
              text: lines[i],
            });
          }
        }
      }

      if (matches.length > 0) {
        results.push({
          fileId: file._id.toString(),
          filename: file.filename,
          projectId: file.projectId,
          path: file.path || '',
          content: options.includeContent ? file.content : '',
          matches,
        });
      }
    }

    return results;
  }

  /**
   * 对文件版本添加标签
   * @param versionId 版本ID
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param tagDto 标签DTO
   * @returns 更新后的版本
   */
  async addVersionTag(
    versionId: string,
    fileId: string,
    projectId: string,
    userId: string,
    tagDto: AddVersionTagDto,
  ): Promise<FileVersionDocument> {
    // 验证项目存在且用户有编辑权限
    const project = await this.projectService.getProjectById(projectId, userId);
    const userRole = this.projectService.getUserRoleInProject(project, userId);

    if (userRole === Permission.VIEWER) {
      throw new ForbiddenException(FILE_ERROR.PERMISSION_DENIED);
    }

    // 获取文件版本
    const version = await this.getFileVersionContent(
      versionId,
      fileId,
      projectId,
      userId,
    );

    // 准备更新数据
    const updateData: any = {
      tags: Array.from(new Set([...version.tags, ...tagDto.tags])), // 合并并去重
    };

    // 添加可选字段
    if (tagDto.tagColor) updateData.tagColor = tagDto.tagColor;
    if (tagDto.importance) updateData.importance = tagDto.importance;
    if (tagDto.isReleaseVersion !== undefined)
      updateData.isReleaseVersion = tagDto.isReleaseVersion;
    if (tagDto.releaseNote) updateData.releaseNote = tagDto.releaseNote;
    if (tagDto.versionType) updateData.versionType = tagDto.versionType;

    // 更新版本
    const updatedVersion = await this.fileVersionModel.findByIdAndUpdate(
      versionId,
      { $set: updateData },
      { new: true },
    );

    if (!updatedVersion) {
      throw new NotFoundException(FILE_ERROR.NOT_FOUND);
    }

    return updatedVersion;
  }

  /**
   * 删除文件版本标签
   * @param versionId 版本ID
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param tag 标签
   * @returns 更新后的版本
   */
  async removeVersionTag(
    versionId: string,
    fileId: string,
    projectId: string,
    userId: string,
    tag: string,
  ): Promise<FileVersionDocument> {
    // 验证项目存在且用户有编辑权限
    const project = await this.projectService.getProjectById(projectId, userId);
    const userRole = this.projectService.getUserRoleInProject(project, userId);

    if (userRole === Permission.VIEWER) {
      throw new ForbiddenException(FILE_ERROR.PERMISSION_DENIED);
    }

    // 获取文件版本
    const version = await this.getFileVersionContent(
      versionId,
      fileId,
      projectId,
      userId,
    );

    // 更新版本标签
    const updatedVersion = await this.fileVersionModel.findByIdAndUpdate(
      versionId,
      { $pull: { tags: tag } },
      { new: true },
    );

    if (!updatedVersion) {
      throw new NotFoundException(FILE_ERROR.NOT_FOUND);
    }

    return updatedVersion;
  }

  /**
   * 比较多个版本
   * @param fileId 文件ID
   * @param projectId 项目ID
   * @param userId 用户ID
   * @param versionIds 版本ID列表
   * @param options 差异选项
   * @returns 版本比较结果
   */
  async compareVersions(
    fileId: string,
    projectId: string,
    userId: string,
    versionIds: string[],
    options?: DiffOptionsDto,
  ): Promise<{
    fileId: string;
    filename: string;
    projectId: string;
    comparisons: {
      diff: string;
      fromVersion: FileVersionDocument;
      toVersion: FileVersionDocument;
      stats: { additions: number; deletions: number; changes: number };
    }[];
  }> {
    // 验证用户有项目访问权限
    await this.permissionService.validateProjectAccess(userId, projectId);

    // 获取文件
    const file = await this.getFileById(fileId, projectId, userId);

    if (versionIds.length < 2) {
      throw new BadRequestException('至少需要两个版本进行比较');
    }

    // 获取所有版本
    const versions: FileVersionDocument[] = [];
    for (const versionId of versionIds) {
      const version = await this.getFileVersionContent(
        versionId,
        fileId,
        projectId,
        userId,
      );
      versions.push(version);
    }

    // 对版本按版本号排序
    versions.sort((a, b) => a.versionNumber - b.versionNumber);

    // 计算相邻版本之间的差异
    const comparisons: {
      diff: string;
      fromVersion: FileVersionDocument;
      toVersion: FileVersionDocument;
      stats: { additions: number; deletions: number; changes: number };
    }[] = [];
    for (let i = 0; i < versions.length - 1; i++) {
      const fromVersion = versions[i];
      const toVersion = versions[i + 1];

      const diffResult = await this.getFileDiff(
        fromVersion._id.toString(),
        toVersion._id.toString(),
        fileId,
        projectId,
        userId,
        options,
      );

      comparisons.push({
        diff: diffResult.diff,
        fromVersion: diffResult.fromVersion,
        toVersion: diffResult.toVersion,
        stats: diffResult.stats,
      });
    }

    return {
      fileId,
      filename: file.filename,
      projectId,
      comparisons,
    };
  }
}
