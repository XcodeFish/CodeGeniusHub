import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type AiProvider =
  | 'OpenAI'
  | 'Claude'
  | 'LocalLLM'
  | 'DeepSeek'
  | 'Baidu'
  | 'Zhipu'
  | 'Ollama'
  | 'MiniMax';

export interface IAiConfig {
  provider: AiProvider;
  model: string;
  apiKey?: string;
  baseUrl: string;
  temperature: number;
  maxTokensGenerate: number;
  maxTokensAnalyze: number;
  maxTokensChat: number;
  usageLimit: {
    dailyTokenLimit: number;
    userTokenLimit: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerHour: number;
  };
  monitoringEnabled: boolean;
  fallbackProviders: string[];
  contentFiltering: {
    enabled: boolean;
    blockedTopics: string[];
    maxSensitivityLevel: string;
  };
}

@Schema({ timestamps: true })
export class AiConfig {
  @Prop({ required: true, default: 'OpenAI' })
  provider: string;

  @Prop({ required: true, default: 'gpt-3.5-turbo' })
  model: string;

  @Prop({ required: false })
  apiKey: string;

  @Prop({ required: false, default: 'https://api.openai.com/v1' })
  baseUrl: string;

  @Prop({ default: 0.3 })
  temperature: number;

  @Prop({ default: 2000 })
  maxTokensGenerate: number;

  @Prop({ default: 1000 })
  maxTokensAnalyze: number;

  @Prop({ default: 1000 })
  maxTokensChat: number;

  @Prop({
    type: {
      dailyTokenLimit: { type: Number, default: 100000 },
      userTokenLimit: { type: Number, default: 10000 },
    },
    default: { dailyTokenLimit: 100000, userTokenLimit: 10000 },
  })
  usageLimit: {
    dailyTokenLimit: number;
    userTokenLimit: number;
  };

  @Prop({
    type: {
      requestsPerMinute: { type: Number, default: 20 },
      tokensPerHour: { type: Number, default: 50000 },
    },
    default: { requestsPerMinute: 20, tokensPerHour: 50000 },
  })
  rateLimit: {
    requestsPerMinute: number;
    tokensPerHour: number;
  };

  @Prop({ default: true })
  monitoringEnabled: boolean;

  @Prop({ type: [String], default: ['LocalLLM'] })
  fallbackProviders: string[];

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      blockedTopics: { type: [String], default: ['敏感内容', '不良信息'] },
      maxSensitivityLevel: { type: String, default: 'medium' },
    },
    default: {
      enabled: true,
      blockedTopics: ['敏感内容', '不良信息'],
      maxSensitivityLevel: 'medium',
    },
  })
  contentFiltering: {
    enabled: boolean;
    blockedTopics: string[];
    maxSensitivityLevel: string;
  };
}

// 使用Mongoose的HydratedDocument
export type AiConfigDocument = HydratedDocument<AiConfig>;
export const AiConfigSchema = SchemaFactory.createForClass(AiConfig);
