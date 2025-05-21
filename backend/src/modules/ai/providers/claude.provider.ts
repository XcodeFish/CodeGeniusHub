import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { LlmProvider } from '../interfaces/llm-provider.interface';
import { AiServiceResponse } from '../interfaces/openai-response.interface';
import { TokenCounter } from '../utils/token-counter';
import { CodeParser } from '../utils/code-parser';
import { setTimeout, clearTimeout } from 'timers';

interface ClaudeCompletionResponse {
  id: string;
  type: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeErrorResponse {
  type: string;
  message: string;
  error?: {
    type: string;
    message: string;
  };
}

@Injectable()
export class ClaudeProvider implements LlmProvider {
  private readonly logger = new Logger(ClaudeProvider.name);
  private defaultModel = 'claude-3-haiku-20240307';
  private readonly requestTimeout = 30000; // 30秒超时

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokenCounter: TokenCounter,
    private readonly codeParser: CodeParser,
  ) {}

  /**
   * 发送请求到Anthropic API
   */
  private async sendRequest<T>(
    data: any,
    apiKey?: string,
    baseUrl?: string,
  ): Promise<AiServiceResponse<T>> {
    const url = `${baseUrl || 'https://api.anthropic.com'}/v1/messages`;
    const key = apiKey || this.configService.get<string>('CLAUDE_API_KEY');

    if (!key) {
      return {
        success: false,
        error: {
          code: 'no_api_key',
          message: 'Claude API密钥未配置',
        },
      };
    }

    try {
      const startTime = Date.now();

      // 添加超时处理
      const response = await firstValueFrom(
        this.httpService
          .post<T>(url, data, {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
            },
          })
          .pipe(
            timeout(this.requestTimeout),
            catchError((error) => {
              if (error instanceof TimeoutError) {
                throw new Error('请求超时，请稍后重试');
              }
              throw error;
            }),
          ),
      );

      const latency = Date.now() - startTime;

      this.logger.debug(`Claude请求完成, 耗时: ${latency}ms`);

      return {
        success: true,
        data: response.data as unknown as T,
        usage: (response.data as any)?.usage
          ? {
              promptTokens: (response.data as any).usage.input_tokens,
              completionTokens: (response.data as any).usage.output_tokens,
              totalTokens:
                (response.data as any).usage.input_tokens +
                (response.data as any).usage.output_tokens,
            }
          : undefined,
      };
    } catch (error) {
      const axiosError = error as AxiosError<ClaudeErrorResponse>;
      const errorMessage =
        axiosError.response?.data?.error?.message ||
        axiosError.response?.data?.message ||
        axiosError.message;
      const errorType =
        axiosError.response?.data?.error?.type ||
        axiosError.response?.data?.type ||
        'unknown_error';

      this.logger.error(`Claude API错误: ${errorMessage}`, error.stack);

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

    // 构建系统消息
    const systemContent = `你是一位${language}编程专家，擅长编写清晰、高效、符合最佳实践的代码。
请根据用户的需求，编写完整、可运行的代码，并附上必要的解释。`;

    // 构建用户消息
    let userContent = `需求: ${prompt}\n\n`;
    userContent += `编程语言: ${language}\n\n`;

    if (options?.framework) {
      userContent += `框架: ${options.framework}\n\n`;
    }

    if (options?.context) {
      userContent += `上下文代码:\n\`\`\`\n${options.context}\n\`\`\`\n\n`;
    }

    userContent += `请编写一个满足上述需求的代码实现，并以JSON格式返回结果：
{
  "generatedCode": "完整的代码实现",
  "explanation": "代码的详细解释",
  "alternatives": ["可选的其他实现方式1", "可选的其他实现方式2"]
}`;

    const result = await this.sendRequest<ClaudeCompletionResponse>(
      {
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemContent,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const responseContent = result.data.content?.[0]?.text || '';

    try {
      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseContent.match(/```\s*([\s\S]*?)\s*```/) || [
          null,
          responseContent,
        ];

      if (jsonMatch && jsonMatch[1]) {
        const jsonStr = jsonMatch[1].trim();
        const codeResult = JSON.parse(jsonStr);

        // 确保alternatives是字符串数组
        const alternatives: string[] = Array.isArray(codeResult.alternatives)
          ? codeResult.alternatives
          : [];

        return {
          success: true,
          data: {
            generatedCode: codeResult.generatedCode || '',
            explanation: codeResult.explanation || '',
            alternatives,
          },
          usage: result.usage,
        };
      } else {
        // 如果无法解析JSON，尝试从响应中提取代码和解释
        const generatedCode =
          this.codeParser.extractGeneratedCode(responseContent);
        const explanation = this.codeParser.extractExplanation(responseContent);

        return {
          success: true,
          data: {
            generatedCode,
            explanation,
            alternatives: [],
          },
          usage: result.usage,
        };
      }
    } catch (error) {
      this.logger.error('解析代码生成响应失败', error);
      return {
        success: false,
        error: {
          code: 'parse_error',
          message: '解析代码生成响应失败',
        },
      };
    }
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

    // 构建系统消息
    const systemContent = `你是一位代码审查专家，擅长${language}编程，请对提供的代码进行全面分析和评价。
根据代码的质量、可读性、效率、安全性和最佳实践，给出评分和详细的反馈。`;

    // 构建用户消息
    let userContent = `请对以下${language}代码进行${
      analysisLevel === 'basic'
        ? '基础'
        : analysisLevel === 'comprehensive'
          ? '全面深入'
          : '详细'
    }分析：\n\n`;

    if (options?.context) {
      userContent += `上下文信息：\n${options.context}\n\n`;
    }

    userContent += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;

    userContent += `请以JSON格式返回分析结果：
{
  "score": 分数(0-100),
  "issues": [
    {"severity": "error|warning|info", "message": "问题描述", "fix": "修复建议"}
  ],
  "strengths": ["优点1", "优点2", ...],
  "summary": "总体评价"
}`;

    const result = await this.sendRequest<ClaudeCompletionResponse>(
      {
        model,
        temperature: 0.2,
        system: systemContent,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const responseContent = result.data.content?.[0]?.text || '';

    try {
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

    const result = await this.sendRequest<ClaudeCompletionResponse>(
      {
        model,
        temperature: 0.2,
        system: systemContent,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const responseContent = result.data.content?.[0]?.text || '';

    try {
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
    message: string,
    history: Array<{ role: string; content: string }> = [],
    options?: {
      codeContext?: string;
      model?: string;
      apiKey?: string;
      baseUrl?: string;
    },
  ): Promise<
    AiServiceResponse<{
      response: string;
      conversationId: string;
    }>
  > {
    const model = options?.model || this.defaultModel;

    // 构建系统消息
    let systemContent = `你是一位编程助手，擅长回答编程相关的问题，提供代码示例和问题解决方案。`;

    if (options?.codeContext) {
      systemContent += `\n\n以下是当前的代码上下文，你可以参考它来回答问题：\n\`\`\`\n${options.codeContext}\n\`\`\``;
    }

    // 构建消息历史
    const messages = [
      ...history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const result = await this.sendRequest<ClaudeCompletionResponse>(
      {
        model,
        temperature: 0.7,
        system: systemContent,
        messages,
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const responseContent = result.data.content?.[0]?.text || '';

    // 生成唯一会话ID
    const conversationId =
      result.data.id ||
      `claude-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    return {
      success: true,
      data: {
        response: responseContent,
        conversationId,
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
    const model = options?.model || this.defaultModel;

    // Claude API没有专门的models端点，使用简单的消息请求测试连接
    const result = await this.sendRequest<ClaudeCompletionResponse>(
      {
        model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      },
      apiKey,
      options?.baseUrl,
    );

    const latency = Date.now() - startTime;

    if (!result.success) {
      return {
        ...result,
        data: {
          models: [],
          latency,
        },
      } as AiServiceResponse<any>;
    }

    // Claude可用模型列表(硬编码，实际应根据文档更新)
    const availableModels = [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];

    return {
      success: true,
      data: {
        models: availableModels,
        latency,
        quota: {
          total: 1000000, // 假设值
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
    return this.tokenCounter.countTokens(input, 'claude');
  }
}
