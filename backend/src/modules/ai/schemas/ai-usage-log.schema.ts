import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, HydratedDocument, Model } from 'mongoose';

export type AiFeature =
  | 'generate'
  | 'analyze'
  | 'optimize'
  | 'chat'
  | 'explain';

export interface IAiUsageLog {
  userId: Types.ObjectId;
  feature: AiFeature;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  projectId?: Types.ObjectId;
  fileId?: Types.ObjectId;
  prompt?: string;
  language?: string;
  framework?: string;
  latency?: number;
  success: boolean;
}

@Schema({ timestamps: true })
export class AiUsageLog implements IAiUsageLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['generate', 'analyze', 'optimize', 'chat', 'explain'],
  })
  feature: AiFeature;

  @Prop({
    required: true,
    enum: ['OpenAI', 'Claude', 'LocalLLM'],
  })
  provider: string;

  @Prop({
    required: true,
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
    required: true,
    default: 0,
    min: 0,
  })
  promptTokens: number;

  @Prop({
    required: true,
    default: 0,
    min: 0,
  })
  completionTokens: number;

  @Prop({
    required: true,
    default: 0,
    min: 0,
  })
  totalTokens: number;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  projectId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'File', default: null })
  fileId?: Types.ObjectId;

  @Prop({
    default: null,
    validate: {
      validator: function (v: string) {
        return v === null || v.length <= 10000;
      },
      message: '提示词长度不能超过10000个字符',
    },
  })
  prompt?: string;

  @Prop({
    default: null,
    validate: {
      validator: function (v: string) {
        return (
          v === null ||
          /^(javascript|typescript|python|java|cpp|csharp|go|rust|php|swift|kotlin|scala|ruby)$/.test(
            v,
          )
        );
      },
      message: '不支持的编程语言',
    },
  })
  language?: string;

  @Prop({
    default: null,
    validate: {
      validator: function (v: string) {
        return v === null || v.length <= 50;
      },
      message: '框架名称长度不能超过50个字符',
    },
  })
  framework?: string;

  @Prop({
    type: Number,
    default: null,
    min: 0,
  })
  latency?: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  success: boolean;
}

export type AiUsageLogDocument = HydratedDocument<AiUsageLog>;
export type AiUsageLogModel = Model<AiUsageLog>;
export const AiUsageLogSchema = SchemaFactory.createForClass(AiUsageLog);
