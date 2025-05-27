import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  AIProvider,
  ChatCompletionParams,
  ChatCompletionResponse,
} from '../interfaces/ai-provider.interface';
import {
  LlmProvider,
  GenerateCodeOptions,
  AnalyzeCodeOptions,
  OptimizeCodeOptions,
  ChatOptions,
} from '../interfaces/llm-provider.interface';
import { AiServiceResponse } from '../interfaces/openai-response.interface';
import { TokenCounter } from '../utils/token-counter';
import { CodeParser } from '../utils/code-parser';

@Injectable()
export class DeepSeekProvider implements LlmProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly defaultModel: string;
  private readonly availableModels: string[];

  constructor(
    private configService: ConfigService,
    private readonly tokenCounter?: TokenCounter,
    private readonly codeParser?: CodeParser,
  ) {
    this.apiKey = this.configService.get<string>('ai.deepseek.apiKey') || '';
    this.apiUrl =
      this.configService.get<string>('ai.deepseek.baseUrl') ||
      'https://api.deepseek.com';

    this.availableModels = this.configService.get<string[]>(
      'ai.deepseek.models',
    ) || ['deepseek-chat', 'deepseek-reasoner'];

    this.defaultModel = this.availableModels[0] || 'deepseek-chat';

    this.logger.log(
      `DeepSeek 提供者初始化，API URL: ${this.apiUrl}, 默认模型: ${this.defaultModel}`,
    );
    this.logger.log(`可用模型: ${this.availableModels.join(', ')}`);
    this.logger.log(`API 密钥${this.apiKey ? '已配置' : '未配置'}`);
  }

  /**
   * 检查并获取有效的模型名称
   * 如果提供的模型名称不在已知模型列表中，则返回默认模型
   */
  private getValidModel(requestedModel?: string): string {
    const model = requestedModel || this.defaultModel;

    if (!this.availableModels.includes(model)) {
      this.logger.warn(
        `请求的模型"${model}"不在已知模型列表中，使用默认模型"${this.defaultModel}"`,
      );
      return this.defaultModel;
    }

    return model;
  }

  async chatCompletion(
    params: ChatCompletionParams,
  ): Promise<ChatCompletionResponse> {
    const { messages, temperature, maxTokens } = params;
    // 使用辅助方法获取有效的模型名称
    const model = this.getValidModel(params.model);
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/chat/completions`,
        {
          model,
          messages,
          temperature: temperature || 0.7,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        },
      );

      const endTime = Date.now();
      this.logger.debug(
        `DeepSeek API请求完成，耗时: ${endTime - startTime}ms，使用模型: ${model}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(`DeepSeek API请求失败: ${error.message}`);
      throw error;
    }
  }

  async streamChatCompletion(
    params: ChatCompletionParams,
    onProgress: (chunk: any) => void,
  ): Promise<void> {
    const { messages, temperature, maxTokens } = params;
    // 使用辅助方法获取有效的模型名称
    const model = this.getValidModel(params.model);

    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/chat/completions`,
        {
          model,
          messages,
          temperature: temperature || 0.7,
          max_tokens: maxTokens,
          stream: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          responseType: 'stream',
          timeout: 60000,
        },
      );

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          try {
            const text = chunk.toString();
            buffer += text;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || line.trim() === 'data: [DONE]') continue;

              const dataMatch = line.match(/^data: (.+)$/);
              if (!dataMatch) continue;

              try {
                const data = JSON.parse(dataMatch[1]);
                onProgress(data);
              } catch (e) {
                this.logger.error(`解析流式响应失败: ${e.message}`);
              }
            }
          } catch (e) {
            this.logger.error(`处理流式响应失败: ${e.message}`);
          }
        });

        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error) {
      this.logger.error(
        `DeepSeek流式API请求失败: ${error.message}, 模型: ${model}`,
      );
      throw error;
    }
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

    // 使用辅助方法获取有效的模型名称
    const model = this.getValidModel(options?.model);
    const baseUrl = options?.baseUrl || this.apiUrl;
    const useApiKey = apiKey || this.apiKey;

    // 检查API密钥是否存在
    if (!useApiKey) {
      this.logger.error('DeepSeek API连接测试失败: 未提供API密钥');
      return {
        success: false,
        error: {
          code: 'missing_api_key',
          message: 'DeepSeek API密钥未配置，请在系统设置中配置有效的API密钥',
        },
      };
    }

    this.logger.log(
      `开始测试DeepSeek API连接，baseUrl: ${baseUrl}, model: ${model}`,
    );

    try {
      // 简单消息请求测试连接
      const response = await axios.post(
        `${baseUrl}/v1/chat/completions`,
        {
          model,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${useApiKey}`,
          },
          timeout: 10000,
        },
      );

      const latency = Date.now() - startTime;
      this.logger.log(
        `DeepSeek API连接测试成功，耗时: ${latency}ms, 使用模型: ${model}`,
      );

      return {
        success: true,
        data: {
          models: this.availableModels,
          latency,
          quota: {
            total: response.data?.quota?.total || 1000000,
            used: response.data?.quota?.used || 0,
            remaining: response.data?.quota?.remaining || 1000000,
          },
        },
      };
    } catch (error) {
      const axiosError = error.isAxiosError ? error : null;
      const statusCode = axiosError?.response?.status;
      const responseData = axiosError?.response?.data;

      let errorMessage = `DeepSeek API连接测试失败: ${error.message}`;
      let errorCode = 'connection_failed';

      if (statusCode === 401 || statusCode === 403) {
        errorMessage = 'API密钥无效或未授权';
        errorCode = 'invalid_api_key';
      } else if (statusCode === 400) {
        if (responseData?.error?.message?.includes('Model Not Exist')) {
          errorMessage = `模型"${model}"不存在或不可用，请检查模型名称是否正确`;
          errorCode = 'model_not_found';

          // 尝试提供可能的模型列表供参考
          this.logger.warn(
            `尝试的模型"${model}"不存在，可用模型列表: ${this.availableModels.join(', ')}`,
          );
        } else {
          errorMessage = `请求格式错误: ${responseData?.error?.message || '未知错误'}`;
          errorCode = 'invalid_request';
        }
      } else if (statusCode === 404) {
        errorMessage = `API端点不存在，请检查基础URL和模型名称`;
        errorCode = 'endpoint_not_found';
      }

      this.logger.error(
        `${errorMessage}, 状态码: ${statusCode}, 详情: ${JSON.stringify(responseData || {})}`,
      );

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: responseData?.error || null,
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
    try {
      // 使用辅助方法获取有效的模型名称
      const model = this.getValidModel(options?.model);
      const temperature = options?.temperature || 0.3;

      const systemMessage = `你是一位${language}编程专家，擅长编写清晰、高效、符合最佳实践的代码。`;
      const userMessage = `请根据以下需求编写${language}代码:\n${prompt}\n${
        options?.framework ? `使用框架: ${options.framework}\n` : ''
      }${options?.context ? `上下文代码:\n${options.context}\n` : ''}`;

      const response = await this.chatCompletion({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature,
        maxTokens: options?.maxTokens || 2000,
      });

      const generatedContent = response.choices[0]?.message?.content || '';

      // 提取代码和解释
      const generatedCode =
        this.codeParser?.extractGeneratedCode(generatedContent) ||
        generatedContent;
      const explanation =
        this.codeParser?.extractExplanation(generatedContent) || '';

      return {
        success: true,
        data: {
          generatedCode,
          explanation,
          alternatives: [],
        },
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`DeepSeek生成代码失败: ${error.message}`);
      return {
        success: false,
        error: {
          code: 'generation_failed',
          message: `生成代码失败: ${error.message}`,
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
    options?: AnalyzeCodeOptions,
  ): Promise<
    AiServiceResponse<{
      score: number;
      issues: string[];
      strengths: string[];
      summary: string;
    }>
  > {
    try {
      // 使用辅助方法获取有效的模型名称
      const model = this.getValidModel(options?.model);
      const analysisLevel = options?.analysisLevel || 'detailed';

      const systemMessage = `你是一位经验丰富的代码审核专家，专门分析${language}代码。`;
      const userMessage = `请对以下${language}代码进行${analysisLevel}级别分析:\n\`\`\`${language}\n${code}\n\`\`\``;

      const response = await this.chatCompletion({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
      });

      const analysisContent = response.choices[0]?.message?.content || '';

      // 简单解析分析结果
      const scoreMatcher = analysisContent.match(
        /(\d+)\/100|评分[：:]\s*(\d+)/,
      );
      const score = scoreMatcher
        ? parseInt(scoreMatcher[1] || scoreMatcher[2], 10)
        : 70;

      const issues = this.extractListItems(analysisContent, [
        '问题',
        '缺陷',
        '弱点',
        'issues',
        'weaknesses',
      ]);
      const strengths = this.extractListItems(analysisContent, [
        '优点',
        '强项',
        'strengths',
      ]);

      return {
        success: true,
        data: {
          score,
          issues,
          strengths,
          summary: analysisContent,
        },
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`DeepSeek分析代码失败: ${error.message}`);
      return {
        success: false,
        error: {
          code: 'analysis_failed',
          message: `分析代码失败: ${error.message}`,
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
    options?: OptimizeCodeOptions,
  ): Promise<
    AiServiceResponse<{
      optimizedCode: string;
      changes: string[];
      improvementSummary: string;
    }>
  > {
    try {
      // 使用辅助方法获取有效的模型名称
      const model = this.getValidModel(options?.model);
      const goals =
        options?.optimizationGoals?.join(', ') || '提高性能、可读性和可维护性';

      const systemMessage = `你是一位${language}代码优化专家，擅长改进代码质量和性能。`;
      const userMessage = `请优化以下${language}代码，重点关注：${goals}:\n\`\`\`${language}\n${code}\n\`\`\`${
        options?.context ? `\n上下文：${options.context}` : ''
      }${options?.explanation ? '\n请详细解释做出的改进。' : ''}`;

      const response = await this.chatCompletion({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
      });

      const optimizationContent = response.choices[0]?.message?.content || '';

      // 提取优化后的代码和解释
      const optimizedCode =
        this.codeParser?.extractGeneratedCode(optimizationContent) ||
        optimizationContent;
      const improvementSummary =
        this.codeParser?.extractExplanation(optimizationContent) || '';

      // 提取具体改进
      const changes = this.extractListItems(optimizationContent, [
        '改进',
        '更改',
        '优化',
        'changes',
        'improvements',
      ]);

      return {
        success: true,
        data: {
          optimizedCode,
          changes,
          improvementSummary,
        },
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`DeepSeek优化代码失败: ${error.message}`);
      return {
        success: false,
        error: {
          code: 'optimization_failed',
          message: `优化代码失败: ${error.message}`,
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
    try {
      // 使用辅助方法获取有效的模型名称
      const model = this.getValidModel(options?.model);

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
        formattedMessages = [{ role: 'user', content: messages }];
      } else {
        formattedMessages = messages;
      }

      // 使用 options.history 如果存在
      if (options?.history && options.history.length > 0) {
        formattedMessages = [...options.history, ...formattedMessages];
      }

      // 添加系统消息
      const allMessages = [
        { role: 'system', content: systemContent },
        ...formattedMessages,
      ];

      const response = await this.chatCompletion({
        model,
        messages: allMessages,
        temperature: 0.7,
      });

      const responseContent = response.choices[0]?.message?.content || '';

      // 生成唯一会话ID
      const conversationId = `deepseek-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      return {
        success: true,
        data: {
          response: responseContent,
          conversationId,
        },
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`DeepSeek聊天失败: ${error.message}`);
      return {
        success: false,
        error: {
          code: 'chat_failed',
          message: `聊天失败: ${error.message}`,
        },
      };
    }
  }

  /**
   * 计算Token使用量（简化版）
   */
  countTokens(input: string): number {
    if (this.tokenCounter) {
      return this.tokenCounter.countTokens(input, 'deepseek');
    }

    // 简单估算
    return Math.ceil(input.length / 4);
  }

  /**
   * 从文本中提取列表项
   * @private
   */
  private extractListItems(text: string, markers: string[]): string[] {
    const items: string[] = [];

    // 查找可能的列表部分
    for (const marker of markers) {
      const regex = new RegExp(
        `${marker}[：:](.*?)(?=\\n\\n|\\n[^\\n]|$)`,
        'is',
      );
      const match = text.match(regex);

      if (match) {
        // 分割列表项
        const listSection = match[1].trim();
        const listItems = listSection
          .split(/\n-|\n\d+\./)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);

        items.push(...listItems);
        break; // 找到一个匹配就退出
      }
    }

    // 如果没找到特定结构，尝试匹配任何项目符号
    if (items.length === 0) {
      const bulletItems = text
        .split(/\n-|\n\d+\./)
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && item.length < 200); // 避免整段文本

      items.push(...bulletItems);
    }

    return items;
  }
}
