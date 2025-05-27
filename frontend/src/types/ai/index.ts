// 代码生成参数
export interface GenerateCodeParams {
  prompt: string;
  language: string;
  framework?: string;
  context?: string;
  projectContext?: object;
  maxTokens?: number;
  temperature?: number;
}

// 代码生成响应 - 与后端API保持一致
export interface GenerateCodeResponse {
  code: string; // 代码片段
  explanation: string; // 代码解释
  // 以下为前端扩展字段，非后端返回必有字段
  alternatives?: string[];
  tokensUsed?: number;
}

// 代码优化参数
export interface OptimizeCodeParams {
  code: string;
  language: string;
  optimizationGoals?: string[];
  context?: string;
  explanation?: boolean;
}

// 代码优化响应
export interface OptimizeCodeResponse {
  optimizedCode: string;
  changes: Array<{
    description: string;
    before?: string;
    after?: string;
  }>;
  improvementSummary: string;
  tokensUsed: number;
}

// 代码分析参数
export interface AnalyzeCodeParams {
  code: string;
  language: string;
  analysisLevel?: 'basic' | 'detailed' | 'comprehensive';
  context?: string;
}

// 代码问题
export interface CodeIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    line: number;
    column?: number;
  };
  fix?: string;
}

// 代码分析响应
export interface AnalyzeCodeResponse {
  score: number;
  issues: CodeIssue[];
  strengths: string[];
  summary: string;
  tokensUsed: number;
}

// 代码解释参数
export interface ExplainCodeParams {
  code: string;
  language: string;
  detailLevel?: 'basic' | 'detailed';
  audience?: 'beginner' | 'intermediate' | 'advanced';
}

// 代码解释响应
export interface ExplainCodeResponse {
  explanation: string;
  lineByLine?: Array<{
    line: number;
    code: string;
    explanation: string;
  }>;
  concepts?: string[];
  tokensUsed: number;
}

// AI聊天参数
export interface ChatParams {
  message: string;
  conversationId?: string;
  projectId?: string;
  fileId?: string;
  codeContext?: string;
}

// AI聊天响应
export interface ChatResponse {
  reply?: string;
  response?: string; // 添加DeepSeek API返回的response字段
  conversationId: string;
  tokensUsed?: number;
}

// AI配置参数
export interface AIConfigParams {
  provider: string;
  model: string;
  apiKey?: string;
  organization?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  ollamaApiUrl?: string; // 添加Ollama API地址
  defaultSettings?: Record<string, any>;
}

// AI配置响应
export interface AIConfigResponse {
  provider: string;
  model: string;
  organization?: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string;
  ollamaApiUrl?: string; // 添加Ollama API地址
  usageLimit?: {
    dailyTokenLimit: number;
    userTokenLimit: number;
  };
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerHour: number;
  };
  monitoringEnabled: boolean;
  defaultSettings?: Record<string, any>;
  availableProviders?: string[];
  availableModels?: Array<{
    id: string;
    name: string;
    provider: string;
    capabilities?: string[];
  }>;
}

// AI配置测试参数
export interface AIConfigTestParams {
  provider: string;
  model: string;
  apiKey: string;
  organization?: string;
  baseUrl?: string;
  ollamaApiUrl?: string;
}

// AI提供商枚举
export const AIProviderEnum = {
  OPENAI: 'OpenAI',
  AZURE: 'Azure',
  ANTHROPIC: 'Anthropic',
  DEEPSEEK: 'DeepSeek',
  OLLAMA: 'Ollama', // 添加Ollama
};

// 添加AIProvider类型
export type AIProvider = 'OpenAI' | 'DeepSeek' | 'Ollama';

// 修改PRESET_MODELS定义
export const PRESET_MODELS: Record<AIProvider, string[]> = {
  OpenAI: ['gpt-3.5-turbo', 'gpt-4'],
  DeepSeek: ['deepseek-chat', 'deepseek-reasoner'],
  Ollama: ['deepseek-r1:1.5b', 'deepseek-coder:1.3b', 'codellama:13b', 'llama3:8b', 'mistral:7b', 'mixtral:8x7b', 'qwen:14b'],
};

// AI配置测试响应
export interface AIConfigTestResponse {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

// AI使用统计响应
export interface AIUsageStatsResponse {
  totalTokens: number;
  totalCost: number;
  usageByDay: Array<{
    date: string;
    tokens: number;
    cost: number;
  }>;
  usageByModel: Array<{
    model: string;
    tokens: number;
    cost: number;
  }>;
}

// AI健康状态响应
export interface AIHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    latency?: number;
    message?: string;
  }>;
}

// AI模型推荐参数
export interface AIModelRecommendationParams {
  task: string;
}

// AI模型推荐响应
export interface AIModelRecommendationResponse {
  recommended: string;
  alternatives: string[];
  reasoning: string;
}

// AI提供商响应
export interface AIProvidersResponse {
  providers: Array<{
    id: string;
    name: string;
    models: Array<{
      id: string;
      name: string;
      capabilities: string[];
      contextWindow: number;
      recommended?: boolean;
    }>;
    requiresApiKey: boolean;
  }>;
}

// 提示词模板
export interface PromptTemplate {
  // 唯一标识符，后端使用_id，前端兼容id
  _id?: string;
  id?: string;
  
  // 基本信息
  name: string;
  description: string;
  template: string;
  
  // 分类与标签
  type: string;          // 类型: chat, explain, code-generation等
  tags?: string[];       // 标签数组
  category?: string;     // 兼容前端传递
  
  // 状态标记
  isActive: boolean;     // 是否激活
  isSystem: boolean;     // 是否系统模板
  
  // 语言和框架信息
  language?: string;
  framework?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // MongoDB版本号
  __v?: number;
}

// 创建提示词模板参数
export interface CreatePromptTemplateParams {
  name: string;
  description: string;
  template: string;
  category: string;
  language?: string;
  framework?: string;
}

// 更新提示词模板参数
export interface UpdatePromptTemplateParams {
  name?: string;
  description?: string;
  template?: string;
  category?: string;
  language?: string;
  framework?: string;
}

// 测试提示词模板参数
export interface TestPromptTemplateParams {
  template: string;
  variables?: Record<string, any>;
}

// 测试提示词模板响应
export interface TestPromptTemplateResponse {
  renderedPrompt: string;
  tokensUsed: number;
  estimatedCost: number;
}

// 初始化系统提示词模板响应
export interface InitPromptTemplatesResponse {
  count: number;
  templates: PromptTemplate[];
} 