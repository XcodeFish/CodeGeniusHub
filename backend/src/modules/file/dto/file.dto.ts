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
}
