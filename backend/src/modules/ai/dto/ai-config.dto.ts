import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { AiProvider } from '../schemas/ai-config.schema';

export class UpdateAiConfigDto {
  @ApiPropertyOptional({
    description: 'AI提供商',
    example: 'OpenAI',
    enum: ['OpenAI', 'Claude', 'LocalLLM'],
  })
  @IsEnum(['OpenAI', 'Claude', 'LocalLLM'])
  @IsOptional()
  provider?: AiProvider;

  @ApiPropertyOptional({ description: '模型名称', example: 'gpt-3.5-turbo' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'API密钥' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'API基础URL',
    example: 'https://api.openai.com/v1',
  })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({ description: '创意度(0.0-1.0)', default: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({ description: '使用限制配置' })
  @IsObject()
  @IsOptional()
  usageLimit?: {
    dailyTokenLimit: number;
    userTokenLimit: number;
  };

  @ApiPropertyOptional({ description: '请求频率限制' })
  @IsObject()
  @IsOptional()
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerHour: number;
  };
}

export class TestAiConfigDto {
  @ApiProperty({ description: '测试的AI提供商', example: 'OpenAI' })
  @IsString()
  provider: string;

  @ApiProperty({ description: '测试的API密钥' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: '测试的模型', example: 'gpt-3.5-turbo' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: '测试的API基础URL' })
  @IsString()
  @IsOptional()
  baseUrl?: string;
}

export class GetUsageStatsDto {
  @ApiPropertyOptional({ description: '开始日期', example: '2023-01-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2023-12-31' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: '分组方式',
    example: 'day',
    enum: ['day', 'week', 'month', 'user'],
  })
  @IsString()
  @IsOptional()
  groupBy?: 'day' | 'week' | 'month' | 'user';
}
