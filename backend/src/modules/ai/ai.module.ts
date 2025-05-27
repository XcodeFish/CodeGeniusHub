import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiConfigService } from './ai-config.service';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
// import { AzureProvider } from './providers/azure.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { LocalLlmProvider } from './providers/local-llm.provider';
import { AIUsageLogSchema } from './schemas/ai-usage-log.schema';
import { CommonModule } from '../../common/common.module';
import { HttpModule } from '@nestjs/axios';
import { TokenCounter } from './utils/token-counter';
import { CodeParser } from './utils/code-parser';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AiConfig, AiConfigSchema } from './schemas/ai-config.schema';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'AIUsageLog', schema: AIUsageLogSchema },
      { name: AiConfig.name, schema: AiConfigSchema },
    ]),
    CacheModule.register({
      ttl: 3600, // 1小时缓存
      max: 100, // 最多缓存100条
    }),
    CommonModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiConfigService,
    OpenAIProvider,
    ClaudeProvider,
    LocalLlmProvider,
    // AzureProvider,
    DeepSeekProvider,
    OllamaProvider,
    TokenCounter,
    CodeParser,
  ],
  exports: [AiService, AiConfigService],
})
export class AiModule {}
