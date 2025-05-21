import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FileService } from './file.service';
import {
  CreateFileDto,
  UpdateFileDto,
  RenameFileDto,
  MoveFileDto,
  RollbackFileDto,
  FileResponseDto,
  FileContentResponseDto,
  FileVersionsResponseDto,
  DiffResponseDto,
  FILE_ERROR,
  AddVersionTagDto,
  VersionQueryDto,
  DiffOptionsDto,
  CompareVersionsResponseDto,
} from './dto/file.dto';

@Controller('projects/:projectId/files')
@ApiTags('文件管理')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * 创建新文件
   * @param req 请求对象
   * @param projectId 项目ID
   * @param createFileDto 文件创建DTO
   * @returns 创建的文件信息
   */
  @Post()
  @ApiOperation({ summary: '创建新文件' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiBody({ type: CreateFileDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '文件创建成功',
    type: FileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数校验失败或文件已存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  @HttpCode(HttpStatus.CREATED)
  async createFile(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() createFileDto: CreateFileDto,
  ): Promise<FileResponseDto> {
    try {
      const userId = req.user.userId;
      const file = await this.fileService.createFile(
        projectId,
        userId,
        createFileDto,
      );

      return this.transformFileResponse(file);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('创建文件失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 获取项目文件列表
   * @param req 请求对象
   * @param projectId 项目ID
   * @returns 文件列表
   */
  @Get()
  @ApiOperation({ summary: '获取项目文件列表' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: [FileResponseDto],
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async getProjectFiles(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<FileResponseDto[]> {
    try {
      const userId = req.user.userId;
      const files = await this.fileService.getProjectFiles(projectId, userId);

      return files.map((file) => this.transformFileResponse(file));
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('获取项目文件列表失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 获取文件详情
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @returns 文件详情
   */
  @Get(':fileId')
  @ApiOperation({ summary: '获取文件详情' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: FileContentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async getFileById(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
  ): Promise<FileContentResponseDto> {
    try {
      const userId = req.user.userId;
      const file = await this.fileService.getFileById(
        fileId,
        projectId,
        userId,
      );

      return this.transformFileContentResponse(file);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('获取文件详情失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 更新文件内容
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @param updateFileDto 文件更新DTO
   * @returns 更新后的文件
   */
  @Put(':fileId')
  @ApiOperation({ summary: '更新文件内容' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiBody({ type: UpdateFileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: FileContentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async updateFileContent(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Body() updateFileDto: UpdateFileDto,
  ): Promise<FileContentResponseDto> {
    try {
      const userId = req.user.userId;
      const file = await this.fileService.updateFileContent(
        fileId,
        projectId,
        userId,
        updateFileDto,
      );

      return this.transformFileContentResponse(file);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('更新文件内容失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 重命名文件
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @param renameFileDto 文件重命名DTO
   * @returns 更新后的文件
   */
  @Patch(':fileId/rename')
  @ApiOperation({ summary: '重命名文件' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiBody({ type: RenameFileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '重命名成功',
    type: FileResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async renameFile(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Body() renameFileDto: RenameFileDto,
  ): Promise<FileResponseDto> {
    try {
      const userId = req.user.userId;
      const file = await this.fileService.renameFile(
        fileId,
        projectId,
        userId,
        renameFileDto,
      );

      return this.transformFileResponse(file);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('重命名文件失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 移动文件
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @param moveFileDto 文件移动DTO
   * @returns 更新后的文件
   */
  @Patch(':fileId/move')
  @ApiOperation({ summary: '移动文件' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiBody({ type: MoveFileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '移动成功',
    type: FileResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async moveFile(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Body() moveFileDto: MoveFileDto,
  ): Promise<FileResponseDto> {
    try {
      const userId = req.user.userId;
      const file = await this.fileService.moveFile(
        fileId,
        projectId,
        userId,
        moveFileDto,
      );

      return this.transformFileResponse(file);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('移动文件失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 删除文件
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @returns 操作结果
   */
  @Delete(':fileId')
  @ApiOperation({ summary: '删除文件' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: '删除成功' },
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async deleteFile(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
  ): Promise<{ code: number; message: string; success: boolean }> {
    try {
      const userId = req.user.userId;
      const success = await this.fileService.deleteFile(
        fileId,
        projectId,
        userId,
      );

      return {
        code: 0,
        message: '删除成功',
        success,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('删除文件失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 获取文件历史版本
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @returns 版本列表
   */
  @Get(':fileId/versions')
  @ApiOperation({ summary: '获取文件历史版本' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiQuery({ name: 'tag', description: '按标签筛选', required: false })
  @ApiQuery({
    name: 'importance',
    description: '按重要程度筛选',
    required: false,
  })
  @ApiQuery({
    name: 'onlyReleaseVersions',
    description: '只显示发布版本',
    required: false,
  })
  @ApiQuery({ name: 'limit', description: '最大版本数', required: false })
  @ApiQuery({ name: 'createdBy', description: '创建者ID', required: false })
  @ApiQuery({ name: 'startDate', description: '开始时间', required: false })
  @ApiQuery({ name: 'endDate', description: '结束时间', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: FileVersionsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async getFileVersions(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Query() query?: VersionQueryDto,
  ): Promise<FileVersionsResponseDto> {
    try {
      const userId = req.user.userId;
      const file = await this.fileService.getFileById(
        fileId,
        projectId,
        userId,
      );
      const versions = await this.fileService.getFileVersions(
        fileId,
        projectId,
        userId,
        query,
      );

      return {
        code: 0,
        message: '获取成功',
        fileId,
        filename: file.filename,
        versions: versions.map((version) => ({
          versionId: version._id.toString(),
          versionNumber: version.versionNumber,
          createdBy: version.createdBy.toString(),
          createdAt: version['createdAt'] || new Date(),
          commitMessage: version.commitMessage,
          size: version.size,
          isRollback: version.isRollback,
          tags: version.tags || [],
          tagColor: version.tagColor || 'gray',
          importance: version.importance || 'medium',
          isReleaseVersion: version.isReleaseVersion || false,
          releaseNote: version.releaseNote || '',
          versionType: version.versionType || null,
        })),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('获取文件历史版本失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 获取版本差异
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @param fromVersionId 源版本ID
   * @param toVersionId 目标版本ID
   * @param options 差异选项
   * @returns 差异内容
   */
  @Get(':fileId/diff')
  @ApiOperation({ summary: '获取版本差异' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiQuery({ name: 'from', description: '源版本ID', required: true })
  @ApiQuery({ name: 'to', description: '目标版本ID', required: true })
  @ApiQuery({
    name: 'format',
    description: '差异格式',
    required: false,
    enum: ['unified', 'json', 'line-by-line'],
  })
  @ApiQuery({
    name: 'contextLines',
    description: '上下文行数',
    required: false,
  })
  @ApiQuery({
    name: 'ignoreWhitespace',
    description: '忽略空白',
    required: false,
    type: 'boolean',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: DiffResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '文件或版本不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async getFileDiff(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Query('from') fromVersionId: string,
    @Query('to') toVersionId: string,
    @Query() options?: DiffOptionsDto,
  ): Promise<DiffResponseDto> {
    try {
      const userId = req.user.userId;
      const diffResult = await this.fileService.getFileDiff(
        fromVersionId,
        toVersionId,
        fileId,
        projectId,
        userId,
        options,
      );

      const fromVersionData = {
        versionId: diffResult.fromVersion._id.toString(),
        versionNumber: diffResult.fromVersion.versionNumber,
        createdBy: diffResult.fromVersion.createdBy.toString(),
        createdAt: diffResult.fromVersion['createdAt'] || new Date(),
        commitMessage: diffResult.fromVersion.commitMessage,
        size: diffResult.fromVersion.size,
        isRollback: diffResult.fromVersion.isRollback,
        tags: diffResult.fromVersion.tags || [],
        tagColor: diffResult.fromVersion.tagColor || 'gray',
        importance: diffResult.fromVersion.importance || 'medium',
        isReleaseVersion: diffResult.fromVersion.isReleaseVersion || false,
        releaseNote: diffResult.fromVersion.releaseNote || '',
        versionType: diffResult.fromVersion.versionType || null,
      };

      const toVersionData = {
        versionId: diffResult.toVersion._id.toString(),
        versionNumber: diffResult.toVersion.versionNumber,
        createdBy: diffResult.toVersion.createdBy.toString(),
        createdAt: diffResult.toVersion['createdAt'] || new Date(),
        commitMessage: diffResult.toVersion.commitMessage,
        size: diffResult.toVersion.size,
        isRollback: diffResult.toVersion.isRollback,
        tags: diffResult.toVersion.tags || [],
        tagColor: diffResult.toVersion.tagColor || 'gray',
        importance: diffResult.toVersion.importance || 'medium',
        isReleaseVersion: diffResult.toVersion.isReleaseVersion || false,
        releaseNote: diffResult.toVersion.releaseNote || '',
        versionType: diffResult.toVersion.versionType || null,
      };

      return {
        code: 0,
        message: '获取成功',
        diff: diffResult.diff,
        fromVersionId,
        toVersionId,
        fromVersion: fromVersionData,
        toVersion: toVersionData,
        stats: diffResult.stats,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('获取版本差异失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 回滚文件到指定版本
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @param rollbackDto 回滚DTO
   * @returns 更新后的文件
   */
  @Post(':fileId/rollback')
  @ApiOperation({ summary: '回滚文件到指定版本' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiBody({ type: RollbackFileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '回滚成功',
    type: FileContentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '文件或版本不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async rollbackFile(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Body() rollbackDto: RollbackFileDto,
  ): Promise<FileContentResponseDto> {
    try {
      const userId = req.user.userId;
      const file = await this.fileService.rollbackFile(
        fileId,
        projectId,
        userId,
        rollbackDto,
      );

      return this.transformFileContentResponse(file);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('回滚文件失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 转换文件响应
   * @param file 文件对象
   * @returns 文件响应DTO
   */
  private transformFileResponse(file: any): FileResponseDto {
    return {
      code: 0,
      message: '操作成功',
      fileId: file._id.toString(),
      filename: file.filename,
      projectId: file.projectId,
      size: file.size,
      mimeType: file.mimeType,
      createdBy: file.createdBy.toString(),
      createdAt: file.createdAt,
      lastModifiedBy: file.lastModifiedBy
        ? file.lastModifiedBy.toString()
        : file.createdBy.toString(),
      lastModifiedAt: file.lastModifiedAt,
      versionsCount: file.versionsCount,
      path: file.path || '',
      tags: file.tags || [],
    };
  }

  /**
   * 转换文件内容响应
   * @param file 文件对象
   * @returns 文件内容响应DTO
   */
  private transformFileContentResponse(file: any): FileContentResponseDto {
    return {
      ...this.transformFileResponse(file),
      content: file.content,
    };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchFiles(
    @Request() req: any,
    @Query('projectId') projectId: string,
    @Query('query') query: string,
    @Query('caseSensitive') caseSensitive?: boolean,
    @Query('regex') regex?: boolean,
    @Query('includeContent') includeContent?: boolean,
  ) {
    return this.fileService.searchFiles(projectId, req.user.userId, query, {
      caseSensitive,
      regex,
      includeContent,
    });
  }

  /**
   * 比较多个版本
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @param versionIds 版本ID列表
   * @param options 差异选项
   * @returns 比较结果
   */
  @Post(':fileId/compare-versions')
  @ApiOperation({ summary: '比较多个版本' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['versionIds'],
      properties: {
        versionIds: {
          type: 'array',
          items: { type: 'string' },
          description: '版本ID列表',
        },
        format: {
          type: 'string',
          enum: ['unified', 'json', 'line-by-line'],
          description: '差异格式',
        },
        contextLines: {
          type: 'number',
          description: '上下文行数',
        },
        ignoreWhitespace: {
          type: 'boolean',
          description: '忽略空白',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: CompareVersionsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '文件或版本不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数校验失败或版本数量不足',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async compareVersions(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Body()
    body: {
      versionIds: string[];
      format?: string;
      contextLines?: number;
      ignoreWhitespace?: boolean;
    },
  ): Promise<CompareVersionsResponseDto> {
    try {
      const userId = req.user.userId;

      if (
        !body.versionIds ||
        !Array.isArray(body.versionIds) ||
        body.versionIds.length < 2
      ) {
        throw new BadRequestException('至少需要两个版本进行比较');
      }

      const options: DiffOptionsDto = {
        format: body.format as any,
        contextLines: body.contextLines,
        ignoreWhitespace: body.ignoreWhitespace,
      };

      const result = await this.fileService.compareVersions(
        fileId,
        projectId,
        userId,
        body.versionIds,
        options,
      );

      // 转换响应格式
      const comparisons = result.comparisons.map((comp) => ({
        code: 0,
        message: '比较成功',
        diff: comp.diff,
        fromVersionId: comp.fromVersion._id.toString(),
        toVersionId: comp.toVersion._id.toString(),
        fromVersion: {
          versionId: comp.fromVersion._id.toString(),
          versionNumber: comp.fromVersion.versionNumber,
          createdBy: comp.fromVersion.createdBy.toString(),
          createdAt: comp.fromVersion['createdAt'] || new Date(),
          commitMessage: comp.fromVersion.commitMessage,
          size: comp.fromVersion.size,
          isRollback: comp.fromVersion.isRollback,
          tags: comp.fromVersion.tags || [],
          tagColor: comp.fromVersion.tagColor || 'gray',
          importance: comp.fromVersion.importance || 'medium',
          isReleaseVersion: comp.fromVersion.isReleaseVersion || false,
          releaseNote: comp.fromVersion.releaseNote || '',
          versionType: comp.fromVersion.versionType || null,
        },
        toVersion: {
          versionId: comp.toVersion._id.toString(),
          versionNumber: comp.toVersion.versionNumber,
          createdBy: comp.toVersion.createdBy.toString(),
          createdAt: comp.toVersion['createdAt'] || new Date(),
          commitMessage: comp.toVersion.commitMessage,
          size: comp.toVersion.size,
          isRollback: comp.toVersion.isRollback,
          tags: comp.toVersion.tags || [],
          tagColor: comp.toVersion.tagColor || 'gray',
          importance: comp.toVersion.importance || 'medium',
          isReleaseVersion: comp.toVersion.isReleaseVersion || false,
          releaseNote: comp.toVersion.releaseNote || '',
          versionType: comp.toVersion.versionType || null,
        },
        stats: comp.stats,
      }));

      return {
        code: 0,
        message: '获取成功',
        fileId: result.fileId,
        filename: result.filename,
        projectId: result.projectId,
        comparisons,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('比较多个版本失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 添加版本标签
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @param versionId 版本ID
   * @param tagDto 标签DTO
   * @returns 更新后的版本
   */
  @Post(':fileId/versions/:versionId/tags')
  @ApiOperation({ summary: '添加版本标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiParam({ name: 'versionId', description: '版本ID' })
  @ApiBody({ type: AddVersionTagDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '添加成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: '添加成功' },
        version: {
          type: 'object',
          properties: {
            versionId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            tagColor: { type: 'string' },
            importance: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '文件或版本不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async addVersionTag(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Param('versionId') versionId: string,
    @Body() tagDto: AddVersionTagDto,
  ): Promise<{ code: number; message: string; version: any }> {
    try {
      const userId = req.user.userId;
      const updatedVersion = await this.fileService.addVersionTag(
        versionId,
        fileId,
        projectId,
        userId,
        tagDto,
      );

      return {
        code: 0,
        message: '添加成功',
        version: {
          versionId: updatedVersion._id.toString(),
          versionNumber: updatedVersion.versionNumber,
          tags: updatedVersion.tags,
          tagColor: updatedVersion.tagColor,
          importance: updatedVersion.importance,
          isReleaseVersion: updatedVersion.isReleaseVersion,
          releaseNote: updatedVersion.releaseNote,
          versionType: updatedVersion.versionType,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('添加版本标签失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }

  /**
   * 删除版本标签
   * @param req 请求对象
   * @param projectId 项目ID
   * @param fileId 文件ID
   * @param versionId 版本ID
   * @param tag 标签
   * @returns 操作结果
   */
  @Delete(':fileId/versions/:versionId/tags/:tag')
  @ApiOperation({ summary: '删除版本标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiParam({ name: 'versionId', description: '版本ID' })
  @ApiParam({ name: 'tag', description: '标签' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 0 },
        message: { type: 'string', example: '删除成功' },
        version: {
          type: 'object',
          properties: {
            versionId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '文件或版本不存在',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async removeVersionTag(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Param('versionId') versionId: string,
    @Param('tag') tag: string,
  ): Promise<{ code: number; message: string; version: any }> {
    try {
      const userId = req.user.userId;
      const updatedVersion = await this.fileService.removeVersionTag(
        versionId,
        fileId,
        projectId,
        userId,
        tag,
      );

      return {
        code: 0,
        message: '删除成功',
        version: {
          versionId: updatedVersion._id.toString(),
          versionNumber: updatedVersion.versionNumber,
          tags: updatedVersion.tags,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('删除版本标签失败:', error);
      throw new InternalServerErrorException(FILE_ERROR.INTERNAL_ERROR);
    }
  }
}
