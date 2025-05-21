import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

enum AnalysisLevel {
  BASIC = 'basic',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
}

export class AnalyzeCodeDto {
  @ApiProperty({ description: '需要分析的代码' })
  @IsString()
  code: string;

  @ApiProperty({ description: '编程语言' })
  @IsString()
  language: string;

  @ApiPropertyOptional({
    description: '分析深度',
    enum: AnalysisLevel,
    default: AnalysisLevel.DETAILED,
  })
  @IsEnum(AnalysisLevel)
  @IsOptional()
  analysisLevel?: AnalysisLevel;

  @ApiPropertyOptional({ description: '上下文代码' })
  @IsString()
  @IsOptional()
  context?: string;
}

enum IssueSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export class AnalyzeCodeResponseDto {
  @ApiProperty({ description: '错误码，0表示成功' })
  code: number;

  @ApiProperty({ description: '错误或成功提示' })
  message: string;

  @ApiProperty({
    description: '返回数据',
    type: 'object',
    properties: {
      score: { type: 'number', description: '质量评分(0-100)' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['error', 'warning', 'info'],
              description: '严重程度',
            },
            message: { type: 'string', description: '问题描述' },
            location: { type: 'object', description: '问题位置' },
            fix: { type: 'string', description: '修复建议' },
          },
        },
        description: '问题列表',
      },
      strengths: {
        type: 'array',
        items: { type: 'string' },
        description: '代码优点',
      },
      summary: { type: 'string', description: '总体评价' },
      tokensUsed: { type: 'number', description: '使用的token数量' },
    },
  })
  data: {
    score: number;
    issues: {
      severity: IssueSeverity;
      message: string;
      location: Record<string, any>;
      fix: string;
    }[];
    strengths: string[];
    summary: string;
    tokensUsed: number;
  };
}
