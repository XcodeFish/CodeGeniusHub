import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class OptimizeCodeDto {
  @ApiProperty({ description: '需要优化的代码' })
  @IsString()
  code: string;

  @ApiProperty({ description: '编程语言' })
  @IsString()
  language: string;

  @ApiPropertyOptional({
    description: '优化目标',
    type: [String],
    example: ['性能', '可读性', '安全性'],
  })
  @IsArray()
  @IsOptional()
  optimizationGoals?: string[];

  @ApiPropertyOptional({ description: '上下文代码' })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({ description: '是否需要解释', default: true })
  @IsBoolean()
  @IsOptional()
  explanation?: boolean;
}

export class OptimizeCodeResponseDto {
  @ApiProperty({ description: '错误码，0表示成功' })
  code: number;

  @ApiProperty({ description: '错误或成功提示' })
  message: string;

  @ApiProperty({
    description: '返回数据',
    type: 'object',
    properties: {
      optimizedCode: { type: 'string', description: '优化后的代码' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', description: '变更类型' },
            description: { type: 'string', description: '变更描述' },
          },
        },
        description: '变更列表及解释',
      },
      improvementSummary: { type: 'string', description: '改进总结' },
      tokensUsed: { type: 'number', description: '使用的token数量' },
    },
  })
  data: {
    optimizedCode: string;
    changes: {
      type: string;
      description: string;
    }[];
    improvementSummary: string;
    tokensUsed: number;
  };
}
