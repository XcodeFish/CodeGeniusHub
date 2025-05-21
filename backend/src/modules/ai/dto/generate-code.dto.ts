import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsNotEmpty,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectContextDto {
  @ApiPropertyOptional({ description: '项目名称' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '项目依赖' })
  @IsObject()
  @IsOptional()
  dependencies?: Record<string, string>;

  @ApiPropertyOptional({ description: '项目配置' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class GenerateCodeDto {
  @ApiProperty({ description: '代码描述/需求说明' })
  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  prompt: string;

  @ApiProperty({ description: '目标编程语言' })
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(javascript|typescript|python|java|cpp|csharp|go|rust|php|swift|kotlin|scala|ruby)$/,
    {
      message: '不支持的编程语言',
    },
  )
  language: string;

  @ApiPropertyOptional({ description: '目标框架/库' })
  @IsString()
  @IsOptional()
  @Length(1, 50)
  framework?: string;

  @ApiPropertyOptional({ description: '上下文代码(当前文件内容)' })
  @IsString()
  @IsOptional()
  @Length(0, 10000)
  context?: string;

  @ApiPropertyOptional({ description: '项目上下文信息' })
  @ValidateNested()
  @Type(() => ProjectContextDto)
  @IsOptional()
  projectContext?: ProjectContextDto;

  @ApiPropertyOptional({ description: '最大生成token数', default: 1000 })
  @IsNumber()
  @Min(100)
  @Max(4000)
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional({ description: '创意度(0.0-1.0)', default: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  temperature?: number;
}

export class GenerateCodeResponseDto {
  @ApiProperty({ description: '错误码，0表示成功' })
  code: number;

  @ApiProperty({ description: '错误或成功提示' })
  message: string;

  @ApiProperty({
    description: '返回数据',
    type: 'object',
    properties: {
      generatedCode: { type: 'string', description: '生成的代码' },
      explanation: { type: 'string', description: '代码解释' },
      alternatives: {
        type: 'array',
        items: { type: 'string' },
        description: '可选的其他实现方案',
      },
      tokensUsed: { type: 'number', description: '使用的token数量' },
    },
  })
  data: {
    generatedCode: string;
    explanation: string;
    alternatives: string[];
    tokensUsed: number;
  };
}
