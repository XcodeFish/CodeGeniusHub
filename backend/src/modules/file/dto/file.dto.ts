import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
} from 'class-validator';

// 文件操作错误码
export const FILE_ERROR = {
  NOT_FOUND: { code: 1004, message: '文件不存在' },
  PERMISSION_DENIED: { code: 1003, message: '权限不足' },
  ALREADY_EXISTS: { code: 1005, message: '文件已存在' },
  INVALID_PARAMS: { code: 1001, message: '参数缺失/格式错误' },
  INTERNAL_ERROR: { code: 1006, message: '服务器内部错误' },
};

// 创建文件DTO
export class CreateFileDto {
  @ApiProperty({ description: '文件名', example: 'index.js' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  filename: string;

  @ApiProperty({
    description: '文件内容',
    example: 'console.log("Hello World");',
  })
  @IsString()
  @IsOptional()
  content: string;

  @ApiProperty({
    description: '文件MIME类型',
    example: 'text/javascript',
    required: false,
  })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({
    description: '文件路径',
    example: 'src/components',
    required: false,
  })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiProperty({
    description: '文件标签',
    example: ['frontend', 'component'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];
}

// 更新文件DTO
export class UpdateFileDto {
  @ApiProperty({
    description: '文件内容',
    example: 'console.log("Updated content");',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: '提交信息',
    example: '修复了错误处理',
    required: false,
  })
  @IsString()
  @IsOptional()
  commitMessage?: string;
}

// 重命名文件DTO
export class RenameFileDto {
  @ApiProperty({ description: '新文件名', example: 'new-filename.js' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  newFilename: string;
}

// 移动文件DTO
export class MoveFileDto {
  @ApiProperty({ description: '新路径', example: 'src/utils' })
  @IsString()
  @IsNotEmpty()
  newPath: string;
}

// 回滚文件DTO
export class RollbackFileDto {
  @ApiProperty({ description: '版本ID', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  versionId: string;

  @ApiProperty({
    description: '提交信息',
    example: '回滚到之前的稳定版本',
    required: false,
  })
  @IsString()
  @IsOptional()
  commitMessage?: string;
}

// 添加版本标签DTO
export class AddVersionTagDto {
  @ApiProperty({ description: '标签列表', example: ['stable', 'release'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  tags: string[];

  @ApiProperty({
    description: '标签颜色',
    example: 'green',
    enum: ['red', 'green', 'blue', 'yellow', 'purple', 'gray'],
    required: false,
  })
  @IsString()
  @IsOptional()
  tagColor?: string;

  @ApiProperty({
    description: '重要程度',
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical'],
    required: false,
  })
  @IsString()
  @IsOptional()
  importance?: string;

  @ApiProperty({
    description: '是否为发布版本',
    example: true,
    required: false,
  })
  @IsOptional()
  isReleaseVersion?: boolean;

  @ApiProperty({
    description: '发布说明',
    example: '修复了关键bug，提升了性能',
    required: false,
  })
  @IsString()
  @IsOptional()
  releaseNote?: string;

  @ApiProperty({
    description: '版本类型',
    example: 'minor',
    enum: ['major', 'minor', 'patch'],
    required: false,
  })
  @IsString()
  @IsOptional()
  versionType?: string;
}

// 版本查询参数DTO
export class VersionQueryDto {
  @ApiProperty({
    description: '按标签筛选',
    example: 'stable',
    required: false,
  })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiProperty({
    description: '按重要程度筛选',
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical'],
    required: false,
  })
  @IsString()
  @IsOptional()
  importance?: string;

  @ApiProperty({
    description: '只显示发布版本',
    example: true,
    required: false,
  })
  @IsOptional()
  onlyReleaseVersions?: boolean;

  @ApiProperty({
    description: '最大版本数',
    example: 10,
    required: false,
  })
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: '创建者ID',
    example: '60d0fe4f5311236168a109cc',
    required: false,
  })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiProperty({
    description: '开始时间',
    example: '2023-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: '结束时间',
    example: '2023-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  endDate?: string;
}

// 增强版本差异比较DTO
export class DiffOptionsDto {
  @ApiProperty({
    description: '差异格式',
    example: 'unified',
    enum: ['unified', 'json', 'line-by-line'],
    required: false,
  })
  @IsString()
  @IsOptional()
  format?: 'unified' | 'json' | 'line-by-line' = 'unified';

  @ApiProperty({
    description: '上下文行数',
    example: 3,
    required: false,
  })
  @IsOptional()
  contextLines?: number = 3;

  @ApiProperty({
    description: '忽略空白',
    example: true,
    required: false,
  })
  @IsOptional()
  ignoreWhitespace?: boolean = false;
}

// 文件响应DTO
export class FileResponseDto {
  @ApiProperty({ description: '错误码', example: 0 })
  code: number;

  @ApiProperty({ description: '提示信息', example: '操作成功' })
  message: string;

  @ApiProperty({ description: '文件ID', example: '60d0fe4f5311236168a109ca' })
  fileId: string;

  @ApiProperty({ description: '文件名', example: 'index.js' })
  filename: string;

  @ApiProperty({ description: '项目ID', example: '60d0fe4f5311236168a109cb' })
  projectId: string;

  @ApiProperty({ description: '文件大小', example: 1024 })
  size: number;

  @ApiProperty({ description: '文件MIME类型', example: 'text/javascript' })
  mimeType: string;

  @ApiProperty({ description: '创建者ID', example: '60d0fe4f5311236168a109cc' })
  createdBy: string;

  @ApiProperty({ description: '创建时间', example: '2023-05-20T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({
    description: '最后修改者ID',
    example: '60d0fe4f5311236168a109cc',
  })
  lastModifiedBy: string;

  @ApiProperty({ description: '最后修改时间', example: '2023-05-21T14:30:00Z' })
  lastModifiedAt: Date;

  @ApiProperty({ description: '版本数量', example: 3 })
  versionsCount: number;

  @ApiProperty({ description: '文件路径', example: 'src/components' })
  path: string;

  @ApiProperty({ description: '文件标签', example: ['frontend', 'component'] })
  tags: string[];
}

// 文件内容响应DTO
export class FileContentResponseDto extends FileResponseDto {
  @ApiProperty({
    description: '文件内容',
    example: 'console.log("Hello World");',
  })
  content: string;
}

// 文件版本响应DTO
export class FileVersionResponseDto {
  @ApiProperty({ description: '版本ID', example: '60d0fe4f5311236168a109cd' })
  versionId: string;

  @ApiProperty({ description: '版本号', example: 1 })
  versionNumber: number;

  @ApiProperty({ description: '创建者ID', example: '60d0fe4f5311236168a109cc' })
  createdBy: string;

  @ApiProperty({ description: '创建时间', example: '2023-05-20T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '提交信息', example: '初始版本' })
  commitMessage: string;

  @ApiProperty({ description: '文件大小', example: 1024 })
  size: number;

  @ApiProperty({ description: '是否为回滚版本', example: false })
  isRollback: boolean;

  @ApiProperty({ description: '标签', example: ['stable', 'release'] })
  tags: string[];

  @ApiProperty({ description: '标签颜色', example: 'green' })
  tagColor: string;

  @ApiProperty({ description: '重要程度', example: 'high' })
  importance: string;

  @ApiProperty({ description: '是否为发布版本', example: true })
  isReleaseVersion: boolean;

  @ApiProperty({
    description: '发布说明',
    example: '修复了关键bug，提升了性能',
  })
  releaseNote: string;

  @ApiProperty({ description: '版本类型', example: 'minor', nullable: true })
  versionType: string | null;
}

// 文件版本列表响应DTO
export class FileVersionsResponseDto {
  @ApiProperty({ description: '错误码', example: 0 })
  code: number;

  @ApiProperty({ description: '提示信息', example: '获取成功' })
  message: string;

  @ApiProperty({ description: '文件ID', example: '60d0fe4f5311236168a109ca' })
  fileId: string;

  @ApiProperty({ description: '文件名', example: 'index.js' })
  filename: string;

  @ApiProperty({ type: [FileVersionResponseDto] })
  versions: FileVersionResponseDto[];
}

// Diff响应DTO
export class DiffResponseDto {
  @ApiProperty({ description: '错误码', example: 0 })
  code: number;

  @ApiProperty({ description: '提示信息', example: '获取成功' })
  message: string;

  @ApiProperty({
    description: 'diff内容',
    example:
      '@@ -1,3 +1,4 @@\n console.log("Hello");\n+console.log("World");\n',
  })
  diff: string;

  @ApiProperty({ description: '源版本ID', example: '60d0fe4f5311236168a109cd' })
  fromVersionId: string;

  @ApiProperty({
    description: '目标版本ID',
    example: '60d0fe4f5311236168a109ce',
  })
  toVersionId: string;

  @ApiProperty({
    description: '原始版本信息',
    type: FileVersionResponseDto,
  })
  fromVersion: FileVersionResponseDto;

  @ApiProperty({
    description: '目标版本信息',
    type: FileVersionResponseDto,
  })
  toVersion: FileVersionResponseDto;

  @ApiProperty({
    description: '差异统计',
    example: { additions: 1, deletions: 0, changes: 1 },
  })
  stats?: { additions: number; deletions: number; changes: number };
}

// 版本比较结果DTO
export class CompareVersionsResponseDto {
  @ApiProperty({ description: '错误码', example: 0 })
  code: number;

  @ApiProperty({ description: '提示信息', example: '获取成功' })
  message: string;

  @ApiProperty({ description: '文件ID', example: '60d0fe4f5311236168a109ca' })
  fileId: string;

  @ApiProperty({ description: '文件名', example: 'index.js' })
  filename: string;

  @ApiProperty({ description: '项目ID', example: '60d0fe4f5311236168a109cb' })
  projectId: string;

  @ApiProperty({
    description: '版本间比较列表',
    type: [DiffResponseDto],
  })
  comparisons: any[];
}
