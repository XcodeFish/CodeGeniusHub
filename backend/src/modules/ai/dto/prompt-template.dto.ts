import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromptType } from '../schemas/prompt-template.schema';

export class CreatePromptTemplateDto {
  @ApiProperty({
    description: '模板名称',
    example: '高性能React组件生成',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: '模板描述',
    example: '用于生成高性能、符合最佳实践的React函数组件',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  description: string;

  @ApiProperty({
    description: '模板内容',
    example:
      '你是一位React专家，请生成一个高性能的函数组件，需要考虑以下因素：...',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  template: string;

  @ApiProperty({
    description: '模板类型',
    enum: ['generate', 'analyze', 'optimize', 'chat', 'explain'],
    example: 'generate',
  })
  @IsEnum(['generate', 'analyze', 'optimize', 'chat', 'explain'])
  type: PromptType;

  @ApiPropertyOptional({
    description: '模板标签',
    example: ['React', '函数组件', '性能优化'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(20, { each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({
    description: '是否为系统模板',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: '是否激活',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromptTemplateDto {
  @ApiPropertyOptional({
    description: '模板名称',
    example: '高性能React组件生成',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: '模板描述',
    example: '用于生成高性能、符合最佳实践的React函数组件',
    minLength: 10,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: '模板内容',
    example:
      '你是一位React专家，请生成一个高性能的函数组件，需要考虑以下因素：...',
    minLength: 10,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  template?: string;

  @ApiPropertyOptional({
    description: '模板类型',
    enum: ['generate', 'analyze', 'optimize', 'chat', 'explain'],
    example: 'generate',
  })
  @IsOptional()
  @IsEnum(['generate', 'analyze', 'optimize', 'chat', 'explain'])
  type?: PromptType;

  @ApiPropertyOptional({
    description: '模板标签',
    example: ['React', '函数组件', '性能优化'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(20, { each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({
    description: '是否为系统模板',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: '是否激活',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FilterPromptTemplateDto {
  @ApiPropertyOptional({
    description: '模板类型',
    enum: ['generate', 'analyze', 'optimize', 'chat', 'explain'],
    example: 'generate',
  })
  @IsOptional()
  @IsEnum(['generate', 'analyze', 'optimize', 'chat', 'explain'])
  type?: PromptType;

  @ApiPropertyOptional({
    description: '搜索关键词',
    example: 'React',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '是否仅展示系统模板',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: '是否仅展示激活的模板',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '标签筛选',
    example: ['React'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TestPromptTemplateDto {
  @ApiProperty({
    description: '模板内容',
    example:
      '你是一位React专家，请生成一个高性能的函数组件，需要考虑以下因素：...',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  template: string;

  @ApiProperty({
    description: '测试输入',
    example: '创建一个带搜索和分页的用户列表组件',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  input: string;

  @ApiPropertyOptional({
    description: '模板类型',
    enum: ['generate', 'analyze', 'optimize', 'chat', 'explain'],
    example: 'generate',
  })
  @IsEnum(['generate', 'analyze', 'optimize', 'chat', 'explain'])
  type: PromptType;

  @ApiPropertyOptional({
    description: '上下文信息',
    example: '当前正在开发一个React应用',
  })
  @IsOptional()
  @IsString()
  context?: string;
}
