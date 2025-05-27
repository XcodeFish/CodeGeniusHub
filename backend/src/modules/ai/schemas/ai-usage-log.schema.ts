import * as mongoose from 'mongoose';

export const AIProviderEnum = {
  OPENAI: 'OpenAI',
  AZURE: 'Azure',
  ANTHROPIC: 'Anthropic',
  DEEPSEEK: 'DeepSeek',
  OLLAMA: 'Ollama',
};

export const AIModelEnum = [
  // OpenAI模型
  'gpt-3.5-turbo',
  'gpt-4',
  // DeepSeek模型
  'deepseek-chat',
  'deepseek-reasoner',
  // Ollama模型
  'deepseek-r1:1.5b',
];

export const AIUsageLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: {
    type: String,
    enum: Object.values(AIProviderEnum),
    required: true,
  },
  modelName: {
    // 重命名以避免与Document.model冲突
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return (
          AIModelEnum.includes(v) ||
          v.startsWith('deepseek-r1:') ||
          v.includes('local-')
        );
      },
      message: '不支持的模型',
    },
  },
  promptTokens: { type: Number, required: true, default: 0 },
  completionTokens: { type: Number, required: true, default: 0 },
  totalTokens: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// 导出接口，避免与Document.model冲突
export interface AIUsageLog extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  provider: string;
  modelName: string; // 使用重命名的字段
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: Date;
}
