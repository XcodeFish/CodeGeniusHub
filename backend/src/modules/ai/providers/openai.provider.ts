import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, TimeoutError, throwError, timer } from 'rxjs';
import { timeout, catchError, retryWhen, mergeMap } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { LlmProvider, ChatOptions } from '../interfaces/llm-provider.interface';
import {
  AiServiceResponse,
  OpenAICompletionResponse,
  OpenAIErrorResponse,
  OpenAIModelsResponse,
} from '../interfaces/openai-response.interface';
import { TokenCounter } from '../utils/token-counter';
import { CodeParser } from '../utils/code-parser';

@Injectable()
export class OpenAIProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private defaultModel = 'gpt-3.5-turbo';
  private readonly requestTimeout = 30000; // 30秒超时
  private readonly maxRetries = 3; // 最大重试次数
  private readonly initialRetryDelay = 1000; // 初始重试延迟(毫秒)

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokenCounter: TokenCounter,
    private readonly codeParser: CodeParser,
  ) {}

  /**
   * 发送请求到OpenAI API
   */
  private async sendRequest<T>(
    endpoint: string,
    data: any,
    apiKey?: string,
    baseUrl?: string,
  ): Promise<AiServiceResponse<T>> {
    const url = `${baseUrl || 'https://api.openai.com/v1'}${endpoint}`;
    const key = apiKey || this.configService.get<string>('OPENAI_API_KEY');

    if (!key) {
      return {
        success: false,
        error: {
          code: 'no_api_key',
          message: 'OpenAI API密钥未配置',
        },
      };
    }

    try {
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.httpService
          .post<OpenAICompletionResponse>(url, data, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${key}`,
            },
          })
          .pipe(
            // 添加超时处理
            timeout(this.requestTimeout),
            // 添加错误处理和重试逻辑
            catchError((error) => {
              if (error instanceof TimeoutError) {
                this.logger.warn(`OpenAI API请求超时: ${url}`);
                return throwError(() => new Error('请求超时，请稍后重试'));
              }

              // 处理可重试的错误
              if (error.response?.status) {
                const status = error.response.status;
                // 429(超过速率限制)和5xx(服务器错误)可以重试
                if (status === 429 || status >= 500) {
                  return throwError(() => error);
                }
              }

              // 其他错误直接抛出
              return throwError(() => error);
            }),
            // 重试逻辑
            retryWhen((errors) =>
              errors.pipe(
                mergeMap((error, i) => {
                  const retryAttempt = i + 1;
                  // 达到最大重试次数，不再重试
                  if (retryAttempt > this.maxRetries) {
                    return throwError(() => error);
                  }

                  // 指数退避策略
                  const delay =
                    this.initialRetryDelay * Math.pow(2, retryAttempt - 1);
                  this.logger.warn(
                    `OpenAI API请求失败，${retryAttempt}/${this.maxRetries}次重试，延迟${delay}ms`,
                  );

                  return timer(delay);
                }),
              ),
            ),
          ),
      );

      const latency = Date.now() - startTime;

      this.logger.debug(
        `OpenAI请求完成, 耗时: ${latency}ms, 端点: ${endpoint}`,
      );

      return {
        success: true,
        data: response.data as unknown as T,
        usage: response.data.usage
          ? {
              promptTokens: response.data.usage.prompt_tokens,
              completionTokens: response.data.usage.completion_tokens,
              totalTokens: response.data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      const axiosError = error as AxiosError<OpenAIErrorResponse>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;
      const errorType =
        axiosError.response?.data?.error?.type || 'unknown_error';

      this.logger.error(`OpenAI API错误: ${errorMessage}`, axiosError.stack);

      return {
        success: false,
        error: {
          code: errorType,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * 生成代码
   */
  async generateCode(
    prompt: string,
    language: string,
    options?: {
      framework?: string;
      context?: string;
      maxTokens?: number;
      temperature?: number;
      model?: string;
      apiKey?: string;
      baseUrl?: string;
    },
  ): Promise<
    AiServiceResponse<{
      generatedCode: string;
      explanation: string;
      alternatives: string[];
    }>
  > {
    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || 2000;
    const temperature = options?.temperature || 0.3;

    // 构建系统消息和用户消息
    const systemContent = `你是一位专业的代码生成助手，擅长根据需求描述生成高质量、符合最佳实践的代码。
请根据提供的需求和上下文，生成清晰、简洁、易于维护的代码。`;

    let userContent = `需求描述: ${prompt}\n\n目标语言: ${language}`;

    if (options?.framework) {
      userContent += `\n目标框架/库: ${options.framework}`;
    }

    if (options?.context) {
      userContent += `\n\n当前文件内容:\n\`\`\`\n${options.context}\n\`\`\``;
    }

    userContent += '\n\n请生成满足上述需求的代码，并简要解释实现思路。';

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ];

    const result = await this.sendRequest<OpenAICompletionResponse>(
      '/chat/completions',
      {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const responseContent = result.data.choices[0]?.message?.content || '';

    // 解析生成的代码和解释
    const generatedCode = this.codeParser.extractGeneratedCode(responseContent);
    const explanation = this.codeParser.extractExplanation(responseContent);

    // 从响应中提取可能的替代方案建议
    const alternatives: string[] = [];
    const alternativesMatch = responseContent.match(
      /(?:替代方案|其他实现|可选方案)[:：]([^]*?)(?=\n\n|$)/i,
    );

    if (alternativesMatch && alternativesMatch[1]) {
      const altText = alternativesMatch[1].trim();
      // 提取numbered列表或破折号列表
      const altItems = altText.split(/\n[*\-\d\.]+\s+/).filter(Boolean);
      alternatives.push(...altItems);
    }

    return {
      success: true,
      data: {
        generatedCode,
        explanation,
        alternatives: alternatives.length > 0 ? alternatives : [],
      },
      usage: result.usage,
    };
  }

  /**
   * 分析代码
   */
  async analyzeCode(
    code: string,
    language: string,
    options?: {
      analysisLevel?: 'basic' | 'detailed' | 'comprehensive';
      context?: string;
      model?: string;
      apiKey?: string;
      baseUrl?: string;
    },
  ): Promise<
    AiServiceResponse<{
      score: number;
      issues: string[];
      strengths: string[];
      summary: string;
    }>
  > {
    const model = options?.model || this.defaultModel;
    const analysisLevel = options?.analysisLevel || 'detailed';

    // 构建系统消息和用户消息
    const systemContent = `你是一位代码质量分析专家，擅长发现代码中的问题、优化机会和安全隐患。
请对提供的代码进行全面分析，并给出具体的改进建议。`;

    let userContent = `分析深度: ${analysisLevel}\n\n编程语言: ${language}\n\n`;

    if (options?.context) {
      userContent += `上下文代码:\n\`\`\`\n${options.context}\n\`\`\`\n\n`;
    }

    userContent += `需要分析的代码:\n\`\`\`\n${code}\n\`\`\`\n\n`;
    userContent += `请对上述代码进行${analysisLevel}级别的分析，以JSON格式返回结果，包括：
{
  "score": 数值(0-100),
  "issues": [
    {
      "severity": "error"|"warning"|"info",
      "message": "问题描述",
      "location": {"line": 行号, "column": 列号},
      "fix": "修复建议"
    }
  ],
  "strengths": ["优点1", "优点2", ...],
  "summary": "总体评价"
}`;

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ];

    const result = await this.sendRequest<OpenAICompletionResponse>(
      '/chat/completions',
      {
        model,
        messages,
        temperature: 0.2,
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const responseContent = result.data.choices[0]?.message?.content || '';

    try {
      // 尝试从响应中提取JSON
      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseContent.match(/```\s*([\s\S]*?)\s*```/) || [
          null,
          responseContent,
        ];

      const jsonStr = jsonMatch[1].trim();
      const analysisResult = JSON.parse(jsonStr);

      // 将复杂的 issues 对象转换为字符串数组
      const issues: string[] = (analysisResult.issues || []).map(
        (issue: any) =>
          `[${issue.severity}] ${issue.message}${issue.fix ? ` - 建议: ${issue.fix}` : ''}`,
      );

      // 确保 strengths 是字符串数组
      const strengths: string[] = analysisResult.strengths || [];

      return {
        success: true,
        data: {
          score: Number(analysisResult.score),
          issues,
          strengths,
          summary: analysisResult.summary || '',
        },
        usage: result.usage,
      };
    } catch (error) {
      this.logger.error('解析代码分析响应失败', error);
      return {
        success: false,
        error: {
          code: 'parse_error',
          message: '解析代码分析响应失败',
        },
      };
    }
  }

  /**
   * 优化代码
   */
  async optimizeCode(
    code: string,
    language: string,
    options?: {
      optimizationGoals?: string[];
      context?: string;
      explanation?: boolean;
      model?: string;
      apiKey?: string;
      baseUrl?: string;
    },
  ): Promise<
    AiServiceResponse<{
      optimizedCode: string;
      changes: string[];
      improvementSummary: string;
    }>
  > {
    const model = options?.model || this.defaultModel;
    const optimizationGoals = options?.optimizationGoals || [];
    const explanation = options?.explanation !== false;

    // 构建系统消息和用户消息
    const systemContent = `你是一位代码优化专家，擅长重构和改进现有代码。
请根据优化目标对提供的代码进行改进，同时保持代码功能不变，并详细说明所做的更改。`;

    let userContent = `编程语言: ${language}\n\n`;

    if (optimizationGoals.length > 0) {
      userContent += `优化目标: ${optimizationGoals.join(', ')}\n\n`;
    }

    if (options?.context) {
      userContent += `上下文代码:\n\`\`\`\n${options.context}\n\`\`\`\n\n`;
    }

    userContent += `需要优化的代码:\n\`\`\`\n${code}\n\`\`\`\n\n`;
    userContent += `请对上述代码进行优化，${
      optimizationGoals.length > 0
        ? `重点关注${optimizationGoals.join(', ')}方面，`
        : ''
    }保持功能不变的前提下提高代码质量。`;

    if (explanation) {
      userContent += `\n\n请以JSON格式返回优化结果：
{
  "optimizedCode": "优化后的完整代码",
  "changes": [
    {"type": "变更类型", "description": "变更描述"}
  ],
  "improvementSummary": "改进总结"
}`;
    }

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ];

    const result = await this.sendRequest<OpenAICompletionResponse>(
      '/chat/completions',
      {
        model,
        messages,
        temperature: 0.2,
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const responseContent = result.data.choices[0]?.message?.content || '';

    try {
      // 尝试从响应中提取JSON
      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseContent.match(/```\s*([\s\S]*?)\s*```/) || [
          null,
          responseContent,
        ];

      if (jsonMatch && jsonMatch[1]) {
        const jsonStr = jsonMatch[1].trim();
        const optimizationResult = JSON.parse(jsonStr);

        // 将复杂的 changes 对象转换为字符串数组
        const changes: string[] = (optimizationResult.changes || []).map(
          (change: any) => `${change.type}: ${change.description}`,
        );

        return {
          success: true,
          data: {
            optimizedCode: optimizationResult.optimizedCode || '',
            changes,
            improvementSummary: optimizationResult.improvementSummary || '',
          },
          usage: result.usage,
        };
      } else {
        // 如果没有JSON格式，直接提取代码和说明
        const optimizedCode =
          this.codeParser.extractGeneratedCode(responseContent);
        const improvementSummary =
          this.codeParser.extractExplanation(responseContent);

        return {
          success: true,
          data: {
            optimizedCode,
            changes: [],
            improvementSummary,
          },
          usage: result.usage,
        };
      }
    } catch (error) {
      this.logger.error('解析代码优化响应失败', error);

      // 出错后尝试直接提取代码
      const optimizedCode =
        this.codeParser.extractGeneratedCode(responseContent);
      if (optimizedCode) {
        return {
          success: true,
          data: {
            optimizedCode,
            changes: [],
            improvementSummary: '优化代码解析出错，但已提取出优化后的代码。',
          },
          usage: result.usage,
        };
      }

      return {
        success: false,
        error: {
          code: 'parse_error',
          message: '解析代码优化响应失败',
        },
      };
    }
  }

  /**
   * 聊天对话
   */
  async chat(
    messages: string | Array<{ role: string; content: string }>,
    options?: ChatOptions,
  ): Promise<
    AiServiceResponse<{
      response: string;
      conversationId: string;
    }>
  > {
    const model = options?.model || this.defaultModel;

    // 构建系统消息
    let systemContent = `你是一位编程助手，可以回答与编程、开发相关的问题。请尽可能提供准确、有帮助的回答，并在适当时提供代码示例。`;

    // 如果有代码上下文，添加到系统提示中
    if (options?.codeContext) {
      systemContent += `\n\n当前代码上下文:\n\`\`\`\n${options.codeContext}\n\`\`\``;
    }

    // 如果有自定义提示词，使用自定义提示词替换默认系统提示
    if (options?.customPrompt) {
      systemContent = options.customPrompt;
    }

    // 处理消息参数
    let formattedMessages;
    if (typeof messages === 'string') {
      // 如果消息是字符串，将其作为用户消息
      formattedMessages = [
        { role: 'system', content: systemContent },
        { role: 'user', content: messages },
      ];
    } else {
      // 如果消息是数组，判断是否已包含系统消息
      const hasSystemMessage = messages.some((m) => m.role === 'system');

      if (hasSystemMessage) {
        formattedMessages = messages;
      } else {
        formattedMessages = [
          { role: 'system', content: systemContent },
          ...messages,
        ];
      }
    }

    // 使用 options.history 如果存在
    if (options?.history && options.history.length > 0) {
      // 移除之前的系统消息，以避免重复
      const messagesWithoutSystem = formattedMessages.filter(
        (m) => m.role !== 'system',
      );

      formattedMessages = [
        { role: 'system', content: systemContent },
        ...options.history,
        ...messagesWithoutSystem,
      ];
    }

    const result = await this.sendRequest<OpenAICompletionResponse>(
      '/chat/completions',
      {
        model,
        messages: formattedMessages,
        temperature: 0.7,
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const reply = result.data.choices[0]?.message?.content || '';

    // 尝试提取建议的后续问题(如有)
    const suggestions: string[] = [];
    const suggestionsMatch = reply.match(
      /(?:你可以问我|您可以问|建议问题|后续问题)[:：]([^]*?)(?=\n\n|$)/i,
    );

    if (suggestionsMatch && suggestionsMatch[1]) {
      const sugText = suggestionsMatch[1].trim();
      // 提取numbered列表或破折号列表
      const sugItems = sugText.split(/\n[*\-\d\.]+\s+/).filter(Boolean);
      suggestions.push(...sugItems);
    }

    return {
      success: true,
      data: {
        response: reply,
        conversationId: Date.now().toString(),
      },
      usage: result.usage,
    };
  }

  /**
   * 测试连接
   */
  async testConnection(
    apiKey: string,
    options?: {
      model?: string;
      baseUrl?: string;
    },
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
  > {
    const startTime = Date.now();

    // 获取可用模型列表
    const result = await this.sendRequest<OpenAIModelsResponse>(
      '/models',
      {},
      apiKey,
      options?.baseUrl,
    );

    const latency = Date.now() - startTime;

    if (!result.success || !result.data) {
      return {
        ...result,
        data: {
          models: [],
          latency,
          quota: {
            total: 1000000,
            used: 0,
            remaining: 1000000,
          },
        },
      } as AiServiceResponse<any>;
    }

    // 提取模型ID列表
    const models = (result.data.data || [])
      .map((model) => model.id)
      .filter((id) => id.startsWith('gpt'));

    return {
      success: true,
      data: {
        models,
        latency,
        quota: {
          total: 1000000,
          used: 0,
          remaining: 1000000,
        },
      },
    };
  }

  /**
   * 计算Token使用量
   */
  countTokens(input: string): number {
    return this.tokenCounter.countTokens(input);
  }
}
