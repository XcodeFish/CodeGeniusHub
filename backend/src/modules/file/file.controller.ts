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
   * @returns 差异内容
   */
  @Get(':fileId/diff')
  @ApiOperation({ summary: '获取版本差异' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'fileId', description: '文件ID' })
  @ApiQuery({ name: 'from', description: '源版本ID', required: true })
  @ApiQuery({ name: 'to', description: '目标版本ID', required: true })
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
  ): Promise<DiffResponseDto> {
    try {
      const userId = req.user.userId;
      const diff = await this.fileService.getFileDiff(
        fromVersionId,
        toVersionId,
        fileId,
        projectId,
        userId,
      );

      return {
        code: 0,
        message: '获取成功',
        diff,
        fromVersionId,
        toVersionId,
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
}
