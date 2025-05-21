import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUrl,
  IsNotEmpty,
  IsMongoId,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  Length,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Permission } from '@/modules/user/schemas/user.schema';

// 创建项目DTO
export class CreateProjectDto {
  @ApiProperty({ description: '项目名称', example: 'My Project' })
  @IsNotEmpty({ message: '项目名称不能为空' })
  @IsString()
  @Length(2, 20, { message: '项目名称长度应在2-20个字符之间' })
  name: string;

  @ApiPropertyOptional({
    description: '项目描述',
    example: '这是一个使用AI技术辅助代码开发的项目',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '项目描述最多500个字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '代码仓库URL',
    example: 'https://github.com/username/repo',
  })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: '仓库地址必须是有效的URL' },
  )
  @IsOptional()
  repositoryUrl?: string;

  @ApiPropertyOptional({
    description: '项目标签',
    type: [String],
    example: ['AI', 'NestJS', 'React'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// 更新项目DTO
export class UpdateProjectDto {
  @ApiPropertyOptional({ description: '项目名称', example: 'My Project' })
  @IsString()
  @IsOptional()
  @Length(2, 20, { message: '项目名称长度应在2-20个字符之间' })
  name?: string;

  @ApiPropertyOptional({
    description: '项目描述',
    example: '这是一个使用AI技术辅助代码开发的项目',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '项目描述最多500个字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '代码仓库URL',
    example: 'https://github.com/username/repo',
  })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: '仓库地址必须是有效的URL' },
  )
  @IsOptional()
  repositoryUrl?: string;

  @ApiPropertyOptional({
    description: '项目标签',
    type: [String],
    example: ['AI', 'NestJS', 'React'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// 项目成员DTO
export class ProjectMemberDto {
  @ApiProperty({ description: '用户ID', example: '6123456789abcdef12345678' })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: '成员权限',
    enum: Permission,
    example: Permission.VIEWER,
  })
  @IsEnum(Permission)
  @IsNotEmpty()
  permission: Permission;
}

// 添加成员DTO
export class AddMemberDto {
  @ApiProperty({ description: '成员ID', example: '60a0b0b0c0c0c0c0c0c0c0c0' })
  @IsMongoId({ message: '成员ID必须是有效的MongoDB ObjectId' })
  @IsNotEmpty({ message: '成员ID不能为空' })
  userId: string;

  @ApiProperty({
    description: '成员权限',
    example: Permission.VIEWER,
    enum: Permission,
  })
  @IsEnum(Permission, { message: '权限必须是有效的枚举值' })
  @IsNotEmpty({ message: '权限不能为空' })
  permission: Permission;
}

// 更新项目成员
export class UpdateProjectMemberDto {
  @ApiProperty({
    description: '成员权限',
    enum: Permission,
    example: Permission.VIEWER,
  })
  @IsEnum(Permission)
  @IsNotEmpty()
  permission: Permission;
}

// 批量添加项目成员DTO
export class BulkAddMembersDto {
  @ApiProperty({
    description: '项目成员列表',
    type: [ProjectMemberDto],
    example: [
      { userId: '6123456789abcdef12345678', permission: Permission.VIEWER },
      { userId: '6123456789abcdef87654321', permission: Permission.VIEWER },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: '至少需要添加一个成员' })
  @Type(() => ProjectMemberDto)
  members: ProjectMemberDto[];
}

// 项目查询过滤DTO
export class ProjectFilterDto {
  @ApiPropertyOptional({ description: '项目名称搜索', example: '智能' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '是否包含已归档项目', example: false })
  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional({
    description: '标签过滤',
    type: [String],
    example: ['AI'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// 项目响应DTO - 基本信息
export class ProjectResponseDto {
  id: string;
  name: string;
  description: string;
  createdBy: any; // 用户基本信息
  createdAt: Date;
  updatedAt: Date;
  membersCount: number;
  isArchived: boolean;
  repositoryUrl: string;
  tags: string[];
  filesCount: number;
  collaboratorsCount: number;
  lastActivityAt: Date;
  permission?: Permission; // 当前用户在项目中的权限
}

// 项目详情响应DTO - 包含成员信息
export class ProjectDetailResponseDto extends ProjectResponseDto {
  members: Array<{
    user: any; // 用户基本信息
    permission: Permission;
    joinedAt: Date;
  }>;
}

// 项目常量错误码
export const PROJECT_ERROR = {
  NOT_FOUND: '项目不存在',
  NAME_TAKEN: '项目名称已存在',
  NO_PERMISSION: '您没有权限执行此操作',
  USER_NOT_FOUND: '用户不存在',
  MEMBER_NOT_FOUND: '成员不存在',
  MEMBER_ALREADY_EXISTS: '该成员已经在项目中',
  OWNER_CANNOT_LEAVE: '项目创建者不能离开项目',
  OWNER_ROLE_CANNOT_CHANGE: '项目创建者角色不能被修改',
  INTERNAL_ERROR: '服务器内部错误',
};
