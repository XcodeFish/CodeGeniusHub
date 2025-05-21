import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiConfigService } from './ai-config.service';

import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { LocalLlmProvider } from './providers/local-llm.provider';

import { AiConfig, AiConfigSchema } from './schemas/ai-config.schema';
import {
  PromptTemplate,
  PromptTemplateSchema,
} from './schemas/prompt-template.schema';
import { AiUsageLog, AiUsageLogSchema } from './schemas/ai-usage-log.schema';

import { PromptBuilder } from './utils/prompt-builder';
import { TokenCounter } from './utils/token-counter';
import { CodeParser } from './utils/code-parser';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: AiConfig.name, schema: AiConfigSchema },
      { name: PromptTemplate.name, schema: PromptTemplateSchema },
      { name: AiUsageLog.name, schema: AiUsageLogSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiConfigService,
    OpenAIProvider,
    ClaudeProvider,
    LocalLlmProvider,
    PromptBuilder,
    TokenCounter,
    CodeParser,
  ],
  exports: [AiService, AiConfigService],
})
export class AiModule {}
