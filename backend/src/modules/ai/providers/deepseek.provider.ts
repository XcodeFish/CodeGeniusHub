import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';
import {
  LlmProvider,
  ChatOptions,
  OptimizeCodeOptions,
  GenerateCodeOptions,
  AnalyzeCodeOptions,
} from '../interfaces/llm-provider.interface';
import { AiServiceResponse } from '../interfaces/openai-response.interface';
import { TokenCounter } from '../utils/token-counter';
import { CodeParser } from '../utils/code-parser';
import { TestConnectionOptions } from '../interfaces/llm-provider.interface';
// DeepSeek API响应接口
interface DeepSeekCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class DeepSeekProvider implements LlmProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private defaultModel = 'deepseek-chat';
  private readonly requestTimeout = 30000; // 30秒超时

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokenCounter: TokenCounter,
    private readonly codeParser: CodeParser,
  ) {}

  // 添加模型名称映射方法
  private mapModelName(modelName: string): string {
    // 如果传入的是提供商名称而不是模型ID，使用默认模型
    if (modelName === 'DeepSeek') {
      return 'deepseek-chat';
    }

    // DeepSeek模型映射表 - 使用官方正确的模型名称
    const modelMapping: Record<string, string> = {
      'deepseek-chat': 'deepseek-chat', // DeepSeek-V3
      'deepseek-coder': 'deepseek-chat', // 统一使用deepseek-chat
      'deepseek-llm-7b-chat': 'deepseek-chat', // 修正旧名称
      'deepseek-coder-6.7b-instruct': 'deepseek-chat',
      'deepseek-reasoner': 'deepseek-reasoner', // DeepSeek-R1
    };

    return modelMapping[modelName] || 'deepseek-chat'; // 默认使用deepseek-chat
  }

  // 获取默认模型
  private getDefaultModel(): string {
    return this.mapModelName(this.defaultModel);
  }

  /**
   * 发送请求到DeepSeek API
   */
  private async sendRequest<T>(
    data: any,
    apiKey?: string,
    baseUrl?: string,
  ): Promise<AiServiceResponse<T>> {
    // 记录映射前的模型名称
    const originalModel = data.model;

    // 映射模型名称
    if (data.model) {
      data.model = this.mapModelName(data.model);
    }

    // 设置DeepSeek API URL - 根据官方文档
    let apiUrl = baseUrl || 'https://api.deepseek.com';

    // 移除末尾斜杠
    apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

    const url = `${apiUrl}/chat/completions`;
    const key = apiKey || this.configService.get<string>('DEEPSEEK_API_KEY');
    console.log('API URL:', url);
    console.log('原始模型名称:', originalModel);
    console.log('映射后模型名称:', data.model);

    if (!key) {
      return {
        success: false,
        error: {
          code: 'no_api_key',
          message: 'DeepSeek API密钥未配置',
        },
      };
    }

    try {
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.httpService
          .post<T>(url, data, {
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
          })
          .pipe(
            timeout(this.requestTimeout),
            catchError((error) => {
              if (error instanceof TimeoutError) {
                this.logger.error(`DeepSeek API请求超时`);
                throw new Error('API请求超时，请稍后重试');
              }
              throw error;
            }),
          ),
      );

      const endTime = Date.now();
      this.logger.debug(`DeepSeek API请求完成，耗时: ${endTime - startTime}ms`);

      // 处理DeepSeek API的响应
      const resp = response.data as any;

      return {
        success: true,
        data: resp as T,
        usage: resp.usage
          ? {
              promptTokens: resp.usage.prompt_tokens,
              completionTokens: resp.usage.completion_tokens,
              totalTokens: resp.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;
      const errorType =
        axiosError.response?.data?.error?.type || 'unknown_error';

      this.logger.error(`DeepSeek API错误: ${errorMessage}`, axiosError.stack);

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
    options?: GenerateCodeOptions,
  ): Promise<
    AiServiceResponse<{
      generatedCode: string;
      explanation: string;
      alternatives: string[];
    }>
  > {
    // 直接获取映射后的模型名称
    const modelName = options?.model || this.defaultModel;
    const model = this.mapModelName(modelName);
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

    const result = await this.sendRequest<DeepSeekCompletionResponse>(
      {
        model,
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    // 解析返回的内容
    const responseContent = result.data.choices?.[0]?.message?.content || '';
    let parsedResponse = {
      generatedCode: '',
      explanation: '',
      alternatives: [],
    };

    try {
      // 尝试解析JSON格式的响应
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) ||
        responseContent.match(/```([\s\S]*?)```/) || [null, responseContent];

      const jsonContent = jsonMatch[1];
      parsedResponse = JSON.parse(jsonContent);
    } catch (error) {
      // 如果解析失败，尝试从文本中提取代码
      const codeBlocks = this.codeParser.extractCodeBlocks(responseContent);
      parsedResponse = {
        generatedCode: codeBlocks.length > 0 ? codeBlocks[0] : '',
        explanation: responseContent.replace(/```[\s\S]*?```/g, '').trim(),
        alternatives: [],
      };
    }

    return {
      success: true,
      data: {
        generatedCode: parsedResponse.generatedCode,
        explanation: parsedResponse.explanation,
        alternatives: parsedResponse.alternatives || [],
      },
      usage: result.usage,
    };
  }

  /**
   * 测试连接
   */
  async testConnection(
    apiKey: string,
    options?: TestConnectionOptions,
  ): Promise<
    AiServiceResponse<{
      models: string[];
      latency: number;
      quota: { total: number; used: number; remaining: number };
    }>
  > {
    try {
      // 获取参数
      const model = options?.model
        ? this.mapModelName(options.model)
        : this.getDefaultModel();

      // 设置DeepSeek API URL - 根据官方文档
      let apiUrl = options?.baseUrl || 'https://api.deepseek.com';

      // 移除末尾斜杠
      apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

      // 使用models API端点测试连接
      const url = `${apiUrl}/models`;
      console.log('测试连接URL:', url);

      const response = await firstValueFrom(
        this.httpService
          .get(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          })
          .pipe(timeout(this.requestTimeout)),
      );

      // 记录支持的模型列表，用于调试
      console.log(
        'DeepSeek支持的模型:',
        response.data?.data?.map((m) => m.id)?.join(', '),
      );

      return {
        success: true,
        data: {
          models: response.data.data?.map((m) => m.id) || [],
          latency: 0,
          quota: { total: 1000000, used: 0, remaining: 1000000 }, // 默认值
        },
      };
    } catch (error) {
      this.logger.error(`DeepSeek API错误: ${error.message}`, error.stack);
      return {
        success: false,
        error: {
          code: error.response?.status || 'unknown',
          message: error.message,
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
    // 直接获取映射后的模型名称
    const modelName = options?.model || this.defaultModel;
    const model = this.mapModelName(modelName);

    // 构建系统消息
    let systemContent = `你是一位编程助手，擅长回答编程相关的问题，提供代码示例和问题解决方案。`;

    if (options?.codeContext) {
      systemContent += `\n\n以下是当前的代码上下文，你可以参考它来回答问题：\n\`\`\`\n${options.codeContext}\n\`\`\``;
    }

    if (options?.customPrompt) {
      systemContent = options.customPrompt;
    }

    // 处理消息参数
    let formattedMessages;
    if (typeof messages === 'string') {
      // 如果消息是字符串，将其作为用户消息
      formattedMessages = [
        {
          role: 'system',
          content: systemContent,
        },
        {
          role: 'user',
          content: messages,
        },
      ];
    } else {
      // 如果消息是数组，添加系统消息
      formattedMessages = [
        {
          role: 'system',
          content: systemContent,
        },
        ...messages,
      ];
    }

    // 使用 options.history 如果存在
    if (options?.history && options.history.length > 0) {
      // 只保留系统消息
      formattedMessages = [
        formattedMessages[0],
        ...options.history,
        ...formattedMessages.slice(1),
      ];
    }

    const result = await this.sendRequest<DeepSeekCompletionResponse>(
      {
        model,
        messages: formattedMessages,
        temperature: 0.7, // 使用固定值而非从options中获取
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    const responseContent = result.data.choices?.[0]?.message?.content || '';

    // 生成唯一会话ID
    const conversationId =
      result.data.id ||
      `deepseek-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

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
   * 优化代码
   */
  async optimizeCode(
    code: string,
    language: string,
    options?: OptimizeCodeOptions,
  ): Promise<
    AiServiceResponse<{
      optimizedCode: string;
      changes: string[];
      improvementSummary: string;
    }>
  > {
    // 实现代码优化逻辑
    const prompt = `请优化以下${language}代码:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;

    // 添加优化目标
    let optimizationGoals =
      options?.optimizationGoals?.join(', ') ||
      '提高性能、提高可读性、减少代码复杂度';

    // 构建提示词
    let userContent = `${prompt}\n优化目标: ${optimizationGoals}\n`;

    if (options?.context) {
      userContent += `\n上下文信息:\n${options.context}\n`;
    }

    userContent += `\n请返回优化后的代码和改进总结。`;

    // 直接获取映射后的模型名称
    const modelName = options?.model || this.defaultModel;
    const model = this.mapModelName(modelName);

    // 发送请求
    const result = await this.sendRequest<DeepSeekCompletionResponse>(
      {
        model,
        messages: [
          {
            role: 'system',
            content: `你是一位专业的${language}代码优化专家，擅长根据指定目标优化代码。请提供详细的优化建议和实现。`,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      },
      options?.apiKey,
      options?.baseUrl,
    );

    // 处理响应
    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    // 解析响应内容
    const responseContent = result.data.choices[0]?.message?.content || '';

    // 从响应中提取优化后的代码
    const codeBlocks = this.codeParser.extractCodeBlocks(responseContent);
    const optimizedCode = codeBlocks.length > 0 ? codeBlocks[0] : code;

    // 提取改进总结
    const summary = responseContent.replace(/```[\s\S]*?```/g, '').trim();

    // 返回结果，注意changes字段是string[]类型
    return {
      success: true,
      data: {
        optimizedCode,
        changes: [summary], // 将改进总结作为变更列表中的唯一条目
        improvementSummary: summary,
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
    options?: AnalyzeCodeOptions,
  ): Promise<
    AiServiceResponse<{
      score: number;
      issues: string[];
      strengths: string[];
      summary: string;
    }>
  > {
    const analysisLevel = options?.analysisLevel || 'detailed';

    // 直接获取映射后的模型名称
    const modelName = options?.model || this.defaultModel;
    const model = this.mapModelName(modelName);

    // 构建系统消息
    const systemContent = `你是一位${language}代码分析专家，擅长分析代码结构、质量、性能和安全性。
请根据以下代码进行${analysisLevel === 'basic' ? '基础' : analysisLevel === 'detailed' ? '详细' : '全面'}分析。`;

    // 构建用户消息
    let userContent = `请分析以下${language}代码:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;

    if (options?.context) {
      userContent += `上下文信息:\n${options.context}\n\n`;
    }

    userContent += `请分析代码的质量，返回以下信息：
1. 总体评分 (0-100)
2. 发现的问题和优化建议
3. 代码的优点和长处
4. 总结性评价`;

    const result = await this.sendRequest<DeepSeekCompletionResponse>(
      {
        model,
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      },
      options?.apiKey,
      options?.baseUrl,
    );

    if (!result.success || !result.data) {
      return result as AiServiceResponse<any>;
    }

    // 解析返回的内容
    const responseContent = result.data.choices[0]?.message?.content || '';

    try {
      // 尝试解析JSON格式的响应
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) ||
        responseContent.match(/```([\s\S]*?)```/) || [null, responseContent];

      const jsonContent = jsonMatch[1];
      const parsedResponse = JSON.parse(jsonContent);

      // 确保issues是字符串数组
      const issues = Array.isArray(parsedResponse.issues)
        ? parsedResponse.issues.map((issue) =>
            typeof issue === 'string'
              ? issue
              : `${issue.severity || '警告'}: ${issue.message || '问题'} (行 ${issue.line || 'unknown'})${issue.fix ? ' - 建议: ' + issue.fix : ''}`,
          )
        : [];

      return {
        success: true,
        data: {
          score: parsedResponse.score || 50,
          issues,
          strengths: Array.isArray(parsedResponse.strengths)
            ? parsedResponse.strengths
            : [],
          summary: parsedResponse.summary || '代码分析完成',
        },
        usage: result.usage,
      };
    } catch (error) {
      // 解析JSON失败，返回基本分析
      return {
        success: true,
        data: {
          score: 50,
          issues: [],
          strengths: [],
          summary: responseContent.trim(),
        },
        usage: result.usage,
      };
    }
  }

  /**
   * 计算Token使用量
   */
  countTokens(input: string): number {
    return this.tokenCounter.countTokens(input);
  }
}
