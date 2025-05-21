import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class ChatRequestDto {
  @ApiProperty({ description: '用户消息' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '对话ID(连续对话)' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ description: '项目ID' })
  @IsMongoId()
  @IsOptional()
  projectId?: Types.ObjectId;

  @ApiPropertyOptional({ description: '文件ID' })
  @IsMongoId()
  @IsOptional()
  fileId?: Types.ObjectId;

  @ApiPropertyOptional({ description: '代码上下文' })
  @IsString()
  @IsOptional()
  codeContext?: string;
}

export class ChatResponseDto {
  @ApiProperty({ description: '错误码，0表示成功' })
  code: number;

  @ApiProperty({ description: '错误或成功提示' })
  message: string;

  @ApiProperty({
    description: '返回数据',
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'AI回复' },
      conversationId: { type: 'string', description: '对话ID' },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
        description: '建议的后续问题',
      },
      references: {
        type: 'array',
        items: { type: 'string' },
        description: '参考资料链接',
      },
      tokensUsed: { type: 'number', description: '使用的token数量' },
    },
  })
  data: {
    reply: string;
    conversationId: string;
    suggestions: string[];
    references: string[];
    tokensUsed: number;
  };
}
