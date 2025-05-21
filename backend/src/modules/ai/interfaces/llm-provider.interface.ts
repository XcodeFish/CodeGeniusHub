/**
 * LLM提供商接口，定义与AI服务交互的通用方法
 */
import { AiServiceResponse } from './openai-response.interface';

export interface GenerateCodeOptions {
  framework?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  customPrompt?: string;
}

export interface AnalyzeCodeOptions {
  analysisLevel?: 'basic' | 'detailed' | 'comprehensive';
  context?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  customPrompt?: string;
}

export interface OptimizeCodeOptions {
  optimizationGoals?: string[];
  context?: string;
  explanation?: boolean;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  customPrompt?: string;
}

export interface ChatOptions {
  conversationId?: string;
  history?: Array<{ role: string; content: string }>;
  codeContext?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  customPrompt?: string;
}

export interface TestConnectionOptions {
  model?: string;
  baseUrl?: string;
}

export interface LlmProvider {
  /**
   * 生成代码
   * @param prompt 代码描述/需求
   * @param language 目标编程语言
   * @param options 额外选项
   */
  generateCode(
    prompt: string,
    language: string,
    options?: GenerateCodeOptions,
  ): Promise<
    AiServiceResponse<{
      generatedCode: string;
      explanation: string;
      alternatives: string[];
    }>
  >;

  /**
   * 分析代码
   * @param code 需要分析的代码
   * @param language 编程语言
   * @param options 额外选项
   */
  analyzeCode(
    code: string,
    language: string,
    options?: AnalyzeCodeOptions,
  ): Promise<
    AiServiceResponse<{
      score: number;
      issues: string[];
      strengths: string[];
      summary: string;
    }>
  >;

  /**
   * 优化代码
   * @param code 需要优化的代码
   * @param language 编程语言
   * @param options 额外选项
   */
  optimizeCode(
    code: string,
    language: string,
    options?: OptimizeCodeOptions,
  ): Promise<
    AiServiceResponse<{
      optimizedCode: string;
      changes: string[];
      improvementSummary: string;
    }>
  >;

  /**
   * 聊天对话
   * @param messages 聊天消息数组或单个用户消息
   * @param options 额外选项
   */
  chat(
    messages: string | Array<{ role: string; content: string }>,
    options?: ChatOptions,
  ): Promise<
    AiServiceResponse<{
      response: string;
      conversationId: string;
    }>
  >;

  /**
   * 测试连接
   * @param apiKey API密钥
   * @param options 额外选项
   */
  testConnection(
    apiKey: string,
    options?: TestConnectionOptions,
  ): Promise<
    AiServiceResponse<{
      models: string[];
      latency: number;
      quota: {
        total: number;
        used: number;
        remaining: number;
      };
    }>
  >;

  /**
   * 计算Token使用量
   * @param input 输入文本
   */
  countTokens(input: string): number;
}
