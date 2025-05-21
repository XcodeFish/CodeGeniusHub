import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, HydratedDocument } from 'mongoose';

export type AiProvider = 'OpenAI' | 'Claude' | 'LocalLLM';

export interface IAiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
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
}

@Schema({ timestamps: true })
export class AiConfig implements IAiConfig {
  @Prop({
    required: true,
    default: 'OpenAI',
    enum: ['OpenAI', 'Claude', 'LocalLLM'],
  })
  provider: AiProvider;

  @Prop({
    required: true,
    default: 'gpt-3.5-turbo',
    validate: {
      validator: function (v: string) {
        const models = {
          OpenAI: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
          Claude: ['claude-2', 'claude-instant'],
          LocalLLM: ['llama-2', 'mistral', 'codellama'],
        };
        return models[this.provider]?.includes(v) || false;
      },
      message: '不支持的模型',
    },
  })
  model: string;

  @Prop({
    required: false,
    validate: {
      validator: function (v: string) {
        return !v || v.length >= 32;
      },
      message: 'API密钥格式不正确',
    },
  })
  apiKey: string;

  @Prop({
    default: 'https://api.openai.com/v1',
    validate: {
      validator: function (v: string) {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: '无效的URL格式',
    },
  })
  baseUrl: string;

  @Prop({
    default: 0.3,
    min: 0,
    max: 1,
  })
  temperature: number;

  @Prop({
    default: 2000,
    min: 100,
    max: 4000,
  })
  maxTokensGenerate: number;

  @Prop({
    default: 1000,
    min: 100,
    max: 2000,
  })
  maxTokensAnalyze: number;

  @Prop({
    default: 1000,
    min: 100,
    max: 2000,
  })
  maxTokensChat: number;

  @Prop({
    type: Object,
    default: {
      dailyTokenLimit: 100000,
      userTokenLimit: 10000,
    },
    validate: {
      validator: function (v: any) {
        return (
          typeof v === 'object' &&
          typeof v.dailyTokenLimit === 'number' &&
          typeof v.userTokenLimit === 'number' &&
          v.dailyTokenLimit > 0 &&
          v.userTokenLimit > 0
        );
      },
      message: '使用限制配置无效',
    },
  })
  usageLimit: {
    dailyTokenLimit: number;
    userTokenLimit: number;
  };

  @Prop({
    type: Object,
    default: {
      requestsPerMinute: 20,
      tokensPerHour: 50000,
    },
    validate: {
      validator: function (v: any) {
        return (
          typeof v === 'object' &&
          typeof v.requestsPerMinute === 'number' &&
          typeof v.tokensPerHour === 'number' &&
          v.requestsPerMinute > 0 &&
          v.tokensPerHour > 0
        );
      },
      message: '速率限制配置无效',
    },
  })
  rateLimit: {
    requestsPerMinute: number;
    tokensPerHour: number;
  };
}

export type AiConfigDocument = HydratedDocument<AiConfig>;
export type AiConfigModel = Model<AiConfig>;
export const AiConfigSchema = SchemaFactory.createForClass(AiConfig);
