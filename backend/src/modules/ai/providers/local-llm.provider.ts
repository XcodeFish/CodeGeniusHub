import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, TimeoutError, throwError, timer } from 'rxjs';
import { timeout, catchError, retryWhen, mergeMap } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { LlmProvider, ChatOptions } from '../interfaces/llm-provider.interface';
import { AiServiceResponse } from '../interfaces/openai-response.interface';
import { TokenCounter } from '../utils/token-counter';
import { CodeParser } from '../utils/code-parser';

/**
 * 本地LLM提供商适配器
 * 支持兼容OpenAI API的本地模型服务，如Ollama、LocalAI等
 */
@Injectable()
export class LocalLlmProvider implements LlmProvider {
  private readonly logger = new Logger(LocalLlmProvider.name);
  private defaultModel = 'codellama';
  private readonly requestTimeout = 60000; // 60秒超时 (本地模型可能需要更长的处理时间)
  private readonly maxRetries = 2; // 最大重试次数
  private readonly initialRetryDelay = 2000; // 初始重试延迟(毫秒)

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokenCounter: TokenCounter,
    private readonly codeParser: CodeParser,
  ) {}

  /**
   * 发送请求到本地LLM API
   * 假设本地API兼容OpenAI格式
   */
  private async sendRequest<T>(
    endpoint: string,
    data: any,
    apiKey?: string,
    baseUrl?: string,
  ): Promise<AiServiceResponse<T>> {
    const url = `${baseUrl || this.configService.get<string>('LOCAL_LLM_URL') || 'http://localhost:8080/v1'}${endpoint}`;

    // 本地LLM可能不需要API密钥
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.httpService.post<any>(url, data, { headers }).pipe(
          // 添加超时处理
          timeout(this.requestTimeout),
          // 添加错误处理和重试逻辑
          catchError((error) => {
            if (error instanceof TimeoutError) {
              this.logger.warn(`本地LLM API请求超时: ${url}`);
              return throwError(
                () => new Error('本地模型响应超时，可能是计算资源不足'),
              );
            }

            // 本地模型可能会因资源问题临时不可用，大多数错误都可以重试
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

                // 线性退避策略，本地模型不需要指数退避
                const delay = this.initialRetryDelay * retryAttempt;
                this.logger.warn(
                  `本地LLM API请求失败，${retryAttempt}/${this.maxRetries}次重试，延迟${delay}ms`,
                );

                return timer(delay);
              }),
            ),
          ),
        ),
      );

      const latency = Date.now() - startTime;

      this.logger.debug(
        `本地LLM请求完成, 耗时: ${latency}ms, 端点: ${endpoint}`,
      );

      // 本地LLM可能不提供token计数
      const usage = response.data.usage
        ? {
            promptTokens: response.data.usage.prompt_tokens || 0,
            completionTokens: response.data.usage.completion_tokens || 0,
            totalTokens: response.data.usage.total_tokens || 0,
          }
        : {
            // 如果API没有提供token计数，使用估算
            promptTokens: this.estimatePromptTokens(data),
            completionTokens: this.estimateCompletionTokens(response.data),
            totalTokens: 0, // 将在下面计算
          };

      // 计算总tokens
      if (!response.data.usage) {
        usage.totalTokens = usage.promptTokens + usage.completionTokens;
      }

      return {
        success: true,
        data: response.data as unknown as T,
        usage,
      };
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;
      const errorType =
        axiosError.response?.data?.error?.type || 'unknown_error';

      this.logger.error(`本地LLM API错误: ${errorMessage}`, error.stack);

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
   * 估算提示的token数量
   */
  private estimatePromptTokens(data: any): number {
    if (data.messages) {
      return this.tokenCounter.countMessageTokens(data.messages);
    } else if (data.prompt) {
      return this.tokenCounter.countTokens(data.prompt);
    }
    return 0;
  }

  /**
   * 估算完成的token数量
   */
  private estimateCompletionTokens(response: any): number {
    if (response.choices?.[0]?.message?.content) {
      return this.tokenCounter.countTokens(response.choices[0].message.content);
    } else if (response.choices?.[0]?.text) {
      return this.tokenCounter.countTokens(response.choices[0].text);
    }
    return 0;
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

    const result = await this.sendRequest<any>(
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

    const responseContent = result.data.choices?.[0]?.message?.content || '';

    // 解析生成的代码和解释
    const generatedCode = this.codeParser.extractGeneratedCode(responseContent);
    const explanation = this.codeParser.extractExplanation(responseContent);

    return {
      success: true,
      data: {
        generatedCode,
        explanation,
        alternatives: [], // 本地模型可能不会提供替代方案
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
    userContent += `请对上述代码进行${analysisLevel}级别的分析，包括：
1. 总体质量评分(0-100)
2. 代码存在的问题及严重程度(error/warning/info)
3. 代码优点
4. 改进建议
5. 总体评价`;

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ];

    const result = await this.sendRequest<any>(
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

    const responseContent = result.data.choices?.[0]?.message?.content || '';

    try {
      // 尝试从响应中提取结构化信息
      // 本地模型可能不擅长生成JSON，所以使用更宽松的解析方式

      // 提取分数
      const scoreMatch = responseContent.match(
        /(?:评分|得分|分数)[^\d]*?(\d+)/i,
      );
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

      // 提取问题
      const issues: string[] = [];
      const issueMatches = responseContent.matchAll(
        /(?:问题|缺陷|错误|警告)[^\n]*?[：:]\s*([^\n]+)/gi,
      );
      for (const match of issueMatches) {
        const issueLine = match[1].trim();
        // 尝试确定严重程度
        let severity = 'info';
        if (issueLine.match(/错误|严重|critical|error/i)) {
          severity = 'error';
        } else if (issueLine.match(/警告|warning/i)) {
          severity = 'warning';
        }

        issues.push(`[${severity}] ${issueLine}`);
      }

      // 提取优点
      const strengths: string[] = [];
      const strengthMatches = responseContent.matchAll(
        /(?:优点|优势|亮点)[^\n]*?[：:]\s*([^\n]+)/gi,
      );
      for (const match of strengthMatches) {
        strengths.push(match[1].trim());
      }

      // 提取总结
      const summaryMatch = responseContent.match(
        /(?:总体评价|总结|总体建议)[^\n]*?[：:]\s*([^\n]+)/i,
      );
      const summary = summaryMatch
        ? summaryMatch[1].trim()
        : '代码质量一般，有改进空间。';

      return {
        success: true,
        data: {
          score,
          issues,
          strengths,
          summary,
        },
        usage: result.usage,
      };
    } catch (error) {
      this.logger.error('解析代码分析响应失败', error);

      // 如果解析失败，返回原始响应
      return {
        success: true,
        data: {
          score: 50, // 默认中等分数
          issues: [],
          strengths: [],
          summary: responseContent,
        },
        usage: result.usage,
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
      userContent += `\n\n请提供优化后的完整代码，并简要说明所做的改进。`;
    }

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ];

    const result = await this.sendRequest<any>(
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

    const responseContent = result.data.choices?.[0]?.message?.content || '';

    // 本地模型可能不擅长生成JSON，直接提取代码和说明
    const optimizedCode = this.codeParser.extractGeneratedCode(responseContent);
    const improvementSummary =
      this.codeParser.extractExplanation(responseContent);

    // 尝试提取变更说明
    const changes: string[] = [];
    const changeMatches = responseContent.matchAll(
      /(?:变更|修改|优化)[^\n]*?[：:]\s*([^\n]+)/gi,
    );
    for (const match of changeMatches) {
      changes.push(`优化: ${match[1].trim()}`);
    }

    return {
      success: true,
      data: {
        optimizedCode,
        changes,
        improvementSummary,
      },
      usage: result.usage,
    };
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

    // 如果有自定义提示词，使用自定义提示词替换系统提示
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
      // 如果消息是数组，在前面添加系统消息
      formattedMessages = [
        { role: 'system', content: systemContent },
        ...messages,
      ];
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

    const result = await this.sendRequest<any>(
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

    const reply = result.data.choices?.[0]?.message?.content || '';

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

    // 尝试获取模型列表
    const result = await this.sendRequest<any>(
      '/models',
      {},
      apiKey,
      options?.baseUrl,
    );

    const latency = Date.now() - startTime;

    if (!result.success) {
      // 如果获取模型列表失败，尝试简单的聊天请求测试连接
      const chatResult = await this.sendRequest<any>(
        '/chat/completions',
        {
          model: options?.model || this.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        },
        apiKey,
        options?.baseUrl,
      );

      if (!chatResult.success) {
        return {
          ...chatResult,
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

      // 如果聊天请求成功，返回默认模型
      return {
        success: true,
        data: {
          models: [options?.model || this.defaultModel],
          latency,
          quota: {
            total: 1000000,
            used: 0,
            remaining: 1000000,
          },
        },
      };
    }

    // 如果获取模型列表成功，提取模型ID
    const models = result.data.data
      ? result.data.data.map((model: any) => model.id)
      : [options?.model || this.defaultModel];

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
