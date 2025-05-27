import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  RequestTimeoutException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiConfig, AiConfigDocument } from './schemas/ai-config.schema';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { LocalLlmProvider } from './providers/local-llm.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { AiServiceResponse } from './interfaces/openai-response.interface';
import { ConfigService } from '@nestjs/config';
import { setTimeout, clearTimeout } from 'timers';
import { LlmProvider } from './interfaces/llm-provider.interface';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AiConfigService implements OnModuleInit {
  private readonly logger = new Logger(AiConfigService.name);
  private cachedConfig: AiConfigDocument | null = null;
  private lastCacheTime = 0;
  private readonly cacheTTL = 5 * 60 * 1000; // 5分钟缓存
  private readonly requestTimeout = 10000; // 10秒超时
  private readonly maxRetries = 3; // 最大重试次数
  private healthStatus: Record<
    string,
    { status: 'up' | 'down' | 'degraded'; lastCheck: Date; latency?: number }
  > = {};
  private readonly providers: Record<string, LlmProvider>;

  constructor(
    @InjectModel(AiConfig.name) private aiConfigModel: Model<AiConfig>,
    private readonly openaiProvider: OpenAIProvider,
    private readonly claudeProvider: ClaudeProvider,
    private readonly localLlmProvider: LocalLlmProvider,
    private readonly deepSeekProvider: DeepSeekProvider,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // 初始化提供商映射
    this.providers = {
      openai: this.openaiProvider as unknown as LlmProvider,
      claude: this.claudeProvider,
      anthropic: this.claudeProvider,
      localllm: this.localLlmProvider,
      local: this.localLlmProvider,
      ollama: this.localLlmProvider,
      deepseek: this.deepSeekProvider as unknown as LlmProvider,
      zhipu: this.openaiProvider as unknown as LlmProvider, // 暂时使用OpenAI提供商作为兼容层
      baidu: this.openaiProvider as unknown as LlmProvider, // 暂时使用OpenAI提供商作为兼容层
      minimax: this.openaiProvider as unknown as LlmProvider, // 暂时使用OpenAI提供商作为兼容层
    };

    // 初始化时加载配置
    this.loadConfig().catch((err) => {
      this.logger.error(`初始化加载AI配置失败: ${err.message}`, err.stack);
    });
  }

  /**
   * 模块初始化时执行健康检查
   */
  async onModuleInit() {
    try {
      const config = await this.getConfig();
      this.checkProviderHealth(config.provider.toLowerCase());

      // 设置定期健康检查（每10分钟）
      setInterval(
        () => {
          this.checkProviderHealth(config.provider.toLowerCase()).catch((err) =>
            this.logger.error(`健康检查失败: ${err.message}`),
          );
        },
        10 * 60 * 1000,
      );
    } catch (error) {
      this.logger.error(`模块初始化健康检查失败: ${error.message}`);
    }
  }

  /**
   * 检查提供商健康状态
   */
  private async checkProviderHealth(provider: string): Promise<void> {
    const config = await this.getConfig();
    const startTime = Date.now();

    try {
      const result = await this.testConnection(
        config.provider,
        config.apiKey || '',
        config.model,
        config.baseUrl,
      );

      const latency = Date.now() - startTime;

      if (result.success) {
        this.healthStatus[provider] = {
          status: latency > 2000 ? 'degraded' : 'up',
          lastCheck: new Date(),
          latency,
        };
      } else {
        this.healthStatus[provider] = {
          status: 'down',
          lastCheck: new Date(),
        };
      }

      // 发出健康状态变更事件
      this.eventEmitter.emit('ai.health.updated', {
        provider,
        status: this.healthStatus[provider],
      });
    } catch (error) {
      this.healthStatus[provider] = {
        status: 'down',
        lastCheck: new Date(),
      };

      this.logger.error(`AI提供商健康检查失败: ${provider}`, error.stack);
    }
  }

  /**
   * 获取当前AI配置
   */
  async getConfig(): Promise<AiConfigDocument> {
    // 如果缓存有效，返回缓存的配置
    if (this.cachedConfig && Date.now() - this.lastCacheTime < this.cacheTTL) {
      return this.cachedConfig;
    }

    return this.loadConfig();
  }

  /**
   * 获取所有提供商健康状态
   */
  getProvidersHealth() {
    return this.healthStatus;
  }

  /**
   * 加载配置，支持超时和重试
   */
  private async loadConfig(): Promise<AiConfigDocument> {
    try {
      // 添加超时机制
      const configPromise = this.loadConfigWithRetry();

      // 创建一个超时Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new RequestTimeoutException('加载AI配置超时'));
        }, this.requestTimeout);
      });

      // 使用Promise.race进行超时控制
      const config = await Promise.race([configPromise, timeoutPromise]);

      // 更新缓存
      this.cachedConfig = config;
      this.lastCacheTime = Date.now();

      return config;
    } catch (error) {
      this.logger.error('加载AI配置失败', error);

      // 如果是超时错误，重新抛出
      if (error instanceof RequestTimeoutException) {
        throw error;
      }

      // 其他错误转换为内部服务器错误
      throw new InternalServerErrorException('加载AI配置失败');
    }
  }

  /**
   * 带重试机制的配置加载
   */
  private async loadConfigWithRetry(): Promise<AiConfigDocument> {
    let retries = 0;
    let lastError: any;

    while (retries < this.maxRetries) {
      try {
        // 查找配置，如果没有则创建默认配置
        let config = await this.aiConfigModel.findOne().exec();

        if (!config) {
          config = await this.createDefaultConfig();
        }

        return config;
      } catch (error) {
        lastError = error;
        retries++;
        this.logger.warn(
          `加载AI配置失败，重试 ${retries}/${this.maxRetries}`,
          error.message,
        );

        // 指数退避策略
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retries - 1)),
        );
      }
    }

    throw (
      lastError ||
      new InternalServerErrorException('加载AI配置失败，已达到最大重试次数')
    );
  }

  /**
   * 创建默认配置
   */
  private async createDefaultConfig(): Promise<AiConfigDocument> {
    try {
      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
      const openaiBaseUrl =
        this.configService.get<string>('OPENAI_API_BASE_URL') ||
        'https://api.openai.com/v1';

      // 验证API密钥格式
      this.validateApiKey(openaiApiKey);

      // 验证基础URL格式
      this.validateBaseUrl(openaiBaseUrl);

      const defaultConfig = new this.aiConfigModel({
        provider: 'OpenAI',
        model: 'gpt-3.5-turbo',
        apiKey: openaiApiKey ? this.encryptApiKey(openaiApiKey) : null,
        baseUrl: openaiBaseUrl,
        temperature: 0.3,
        maxTokensGenerate: 2000,
        maxTokensAnalyze: 1000,
        maxTokensChat: 1000,
        usageLimit: {
          dailyTokenLimit: 100000,
          userTokenLimit: 10000,
        },
        rateLimit: {
          requestsPerMinute: 20,
          tokensPerHour: 50000,
        },
        monitoringEnabled: true,
        contentFiltering: {
          enabled: true,
          blockedTopics: ['敏感内容', '不良信息'],
          maxSensitivityLevel: 'medium',
        },
        fallbackProviders: ['LocalLLM'],
      });

      return defaultConfig.save();
    } catch (error) {
      this.logger.error('创建默认AI配置失败', error);
      throw new InternalServerErrorException('创建默认AI配置失败');
    }
  }

  /**
   * 验证API密钥格式
   */
  private validateApiKey(apiKey?: string): void {
    if (apiKey && apiKey.length < 32) {
      this.logger.warn('环境变量中的API密钥格式可能不正确');
    }
  }

  /**
   * 验证基础URL格式
   */
  private validateBaseUrl(baseUrl: string): void {
    try {
      new URL(baseUrl);
    } catch (error) {
      this.logger.warn(`环境变量中的API基础URL格式不正确: ${baseUrl}`);
    }
  }

  /**
   * 加密API密钥
   */
  private encryptApiKey(apiKey: string): string {
    try {
      const encryptionKey =
        this.configService.get<string>('ENCRYPTION_KEY') ||
        'default-secure-key-32-bytesxyzxyzxy';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey),
        iv,
      );

      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('API密钥加密失败', error);
      return apiKey; // 如果加密失败，返回原始密钥
    }
  }

  /**
   * 解密API密钥
   */
  private decryptApiKey(encryptedKey: string): string {
    try {
      const encryptionKey =
        this.configService.get<string>('ENCRYPTION_KEY') ||
        'default-secure-key-32-bytesxyzxyzxy';
      const [ivHex, encrypted] = encryptedKey.split(':');

      if (!ivHex || !encrypted) {
        return encryptedKey; // 未加密格式，直接返回
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey),
        iv,
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('API密钥解密失败', error);
      return encryptedKey; // 如果解密失败，返回加密的密钥
    }
  }

  /**
   * 更新AI配置
   */
  async updateConfig(updateData: Partial<AiConfig>): Promise<AiConfigDocument> {
    try {
      const config = await this.aiConfigModel.findOne().exec();

      if (!config) {
        throw new NotFoundException('AI配置不存在');
      }

      // 验证API密钥
      if (updateData.apiKey) {
        this.validateApiKey(updateData.apiKey);
        // 加密API密钥
        updateData.apiKey = this.encryptApiKey(updateData.apiKey);
      }

      // 验证基础URL
      if (updateData.baseUrl) {
        this.validateBaseUrl(updateData.baseUrl);
      }

      // 验证提供商
      if (updateData.provider) {
        const supportedProviders = Object.keys(this.providers).map((p) =>
          p.toLowerCase(),
        );
        if (!supportedProviders.includes(updateData.provider.toLowerCase())) {
          throw new BadRequestException(
            `不支持的AI提供商: ${updateData.provider}`,
          );
        }
      }

      // 验证温度值
      if (updateData.temperature !== undefined) {
        if (updateData.temperature < 0 || updateData.temperature > 1) {
          throw new BadRequestException('温度值必须在0-1之间');
        }
      }

      // 验证Token限制
      if (
        updateData.maxTokensGenerate !== undefined &&
        updateData.maxTokensGenerate < 10
      ) {
        throw new BadRequestException('生成Token数量必须大于等于10');
      }

      // 更新配置字段
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          config[key] = updateData[key];
        }
      });

      // 保存更新后的配置
      await config.save();

      // 更新缓存
      this.cachedConfig = config;
      this.lastCacheTime = Date.now();

      // 更新后立即检查健康状态
      if (updateData.provider || updateData.apiKey || updateData.baseUrl) {
        this.checkProviderHealth(config.provider.toLowerCase()).catch((err) =>
          this.logger.error(`健康检查失败: ${err.message}`),
        );
      }

      // 发送配置更新事件
      this.eventEmitter.emit('ai.config.updated', {
        provider: config.provider,
        model: config.model,
        timestamp: new Date(),
      });

      return config;
    } catch (error) {
      this.logger.error('更新AI配置失败', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('更新AI配置失败: ' + error.message);
    }
  }

  /**
   * 测试AI配置连接
   */
  async testConnection(
    provider: string,
    apiKey: string,
    model?: string,
    baseUrl?: string,
  ): Promise<AiServiceResponse<any>> {
    try {
      // 解密API密钥（如果是加密的）
      const decryptedApiKey = apiKey ? this.decryptApiKey(apiKey) : apiKey;

      // 请求超时控制
      const testPromise = this.testConnectionWithProvider(
        provider,
        decryptedApiKey,
        model,
        baseUrl,
      );

      // 创建一个超时Promise
      const timeoutPromise = new Promise<AiServiceResponse<any>>((resolve) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          resolve({
            success: false,
            error: {
              code: 'timeout',
              message: 'AI连接测试超时，请检查网络或服务可用性',
            },
          });
        }, this.requestTimeout);
      });

      // 使用Promise.race进行超时控制
      return Promise.race([testPromise, timeoutPromise]);
    } catch (error) {
      this.logger.error(`测试AI连接失败: ${error.message}`, error.stack);
      return {
        success: false,
        error: {
          code: 'connection_test_failed',
          message: `测试连接失败: ${error.message}`,
        },
      };
    }
  }

  /**
   * 与特定提供商进行连接测试
   */
  private async testConnectionWithProvider(
    provider: string,
    apiKey: string,
    model?: string,
    baseUrl?: string,
  ): Promise<AiServiceResponse<any>> {
    const providerKey = provider.toLowerCase();
    const llmProvider = this.providers[providerKey];

    if (!llmProvider) {
      return {
        success: false,
        error: {
          code: 'invalid_provider',
          message: `不支持的AI提供商: ${provider}`,
        },
      };
    }

    return llmProvider.testConnection(apiKey, { model, baseUrl });
  }

  /**
   * 获取当前提供商
   */
  async getCurrentProvider(): Promise<LlmProvider> {
    const config = await this.getConfig();
    const providerKey = config.provider.toLowerCase();
    const provider = this.providers[providerKey];

    if (!provider) {
      this.logger.warn(
        `未知的提供商类型: ${config.provider}，使用默认的OpenAI`,
      );
      return this.openaiProvider as unknown as LlmProvider;
    }

    // 检查提供商健康状态
    const health = this.healthStatus[providerKey];
    if (
      health &&
      health.status === 'down' &&
      config.fallbackProviders?.length > 0
    ) {
      // 如果当前提供商不可用，尝试切换到备用提供商
      for (const fallbackProvider of config.fallbackProviders) {
        const fallbackKey = fallbackProvider.toLowerCase();
        const fallbackHealth = this.healthStatus[fallbackKey];

        if (!fallbackHealth || fallbackHealth.status !== 'down') {
          this.logger.warn(
            `主要提供商 ${config.provider} 不可用，切换到备用提供商 ${fallbackProvider}`,
          );

          // 发送提供商切换事件
          this.eventEmitter.emit('ai.provider.fallback', {
            primary: config.provider,
            fallback: fallbackProvider,
            reason: 'health_check_failed',
            timestamp: new Date(),
          });

          return this.providers[fallbackKey] || this.openaiProvider;
        }
      }
    }

    return provider;
  }

  /**
   * 获取支持的AI提供商及其模型信息
   */
  getSupportedProviders() {
    // 返回支持的提供商及其模型
    return {
      providers: [
        {
          id: 'OpenAI',
          name: 'OpenAI',
          description: '支持GPT-3.5和GPT-4系列模型',
          models: [
            {
              id: 'gpt-3.5-turbo',
              name: 'GPT-3.5 Turbo',
              description: '平衡性能和成本的通用模型',
              tokens: 16385,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 1200, // 毫秒
              costPer1kTokens: 0.002,
            },
            {
              id: 'gpt-4',
              name: 'GPT-4',
              description: '高级理解和推理能力',
              tokens: 8192,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 2500,
              costPer1kTokens: 0.06,
            },
            {
              id: 'gpt-4-turbo',
              name: 'GPT-4 Turbo',
              description: '升级版GPT-4，更快更智能',
              tokens: 128000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 3000,
              costPer1kTokens: 0.03,
            },
          ],
          requiresApiKey: true,
          requiresBaseUrl: true,
          healthStatus: this.healthStatus['openai'] || {
            status: 'unknown',
            lastCheck: null,
          },
        },
        {
          id: 'Claude',
          name: 'Anthropic Claude',
          description: '擅长编码和文本分析的助手模型',
          models: [
            {
              id: 'claude-3-haiku-20240307',
              name: 'Claude 3 Haiku',
              description: '轻量快速的编码助手',
              tokens: 200000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 1000,
              costPer1kTokens: 0.00025,
            },
            {
              id: 'claude-3-sonnet-20240229',
              name: 'Claude 3 Sonnet',
              description: '平衡性能和深度理解能力',
              tokens: 200000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 1500,
              costPer1kTokens: 0.003,
            },
            {
              id: 'claude-3-opus-20240229',
              name: 'Claude 3 Opus',
              description: '最强大的Claude模型',
              tokens: 200000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 2000,
              costPer1kTokens: 0.015,
            },
          ],
          requiresApiKey: true,
          requiresBaseUrl: true,
          healthStatus: this.healthStatus['claude'] || {
            status: 'unknown',
            lastCheck: null,
          },
        },
        {
          id: 'DeepSeek',
          name: 'DeepSeek',
          description: '国内领先的大模型平台',
          models: [
            {
              id: 'deepseek-chat',
              name: 'DeepSeek Chat (V3)',
              description: '通用对话大模型',
              tokens: 64000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 1000,
              costPer1kTokens: 0.002,
            },
            {
              id: 'deepseek-reasoner',
              name: 'DeepSeek Reasoner (R1)',
              description: '专业推理模型',
              tokens: 64000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 1200,
              costPer1kTokens: 0.003,
            },
          ],
          requiresApiKey: true,
          requiresBaseUrl: true,
          healthStatus: this.healthStatus['deepseek'] || {
            status: 'unknown',
            lastCheck: null,
          },
        },
        {
          id: 'Baidu',
          name: '文心一言',
          description: '百度开发的大语言模型',
          models: [
            {
              id: 'ernie-4.0',
              name: 'ERNIE 4.0',
              description: '文心大模型4.0',
              tokens: 16000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 1500,
              costPer1kTokens: 0.002,
            },
          ],
          requiresApiKey: true,
          requiresBaseUrl: true,
          healthStatus: this.healthStatus['baidu'] || {
            status: 'unknown',
            lastCheck: null,
          },
        },
        {
          id: 'Zhipu',
          name: '智谱GLM',
          description: '智谱AI开发的大语言模型',
          models: [
            {
              id: 'glm-4',
              name: 'GLM-4',
              description: '通用大语言模型',
              tokens: 32000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 1300,
              costPer1kTokens: 0.002,
            },
          ],
          requiresApiKey: true,
          requiresBaseUrl: true,
          healthStatus: this.healthStatus['zhipu'] || {
            status: 'unknown',
            lastCheck: null,
          },
        },
        {
          id: 'MiniMax',
          name: 'MiniMax',
          description: 'MiniMax开发的大语言模型',
          models: [
            {
              id: 'abab6-chat',
              name: 'ABAB 6',
              description: '高性能对话与代码生成模型',
              tokens: 32000,
              features: ['代码生成', '代码分析', '聊天'],
              averageLatency: 1200,
              costPer1kTokens: 0.002,
            },
          ],
          requiresApiKey: true,
          requiresBaseUrl: true,
          healthStatus: this.healthStatus['minimax'] || {
            status: 'unknown',
            lastCheck: null,
          },
        },
        {
          id: 'LocalLLM',
          name: '本地模型',
          description: '本地部署的大语言模型',
          models: [
            {
              id: 'codellama',
              name: 'CodeLlama',
              description: '专为代码生成优化的模型',
              tokens: 16000,
              features: ['代码生成', '代码分析'],
              averageLatency: 800,
              costPer1kTokens: 0,
            },
            {
              id: 'mistral',
              name: 'Mistral',
              description: '开源高性能语言模型',
              tokens: 8000,
              features: ['代码生成', '聊天'],
              averageLatency: 600,
              costPer1kTokens: 0,
            },
          ],
          requiresApiKey: false,
          requiresBaseUrl: true,
          healthStatus: this.healthStatus['localllm'] || {
            status: 'unknown',
            lastCheck: null,
          },
        },
      ],
      defaultProvider: 'OpenAI',
      defaultModel: 'gpt-3.5-turbo',
    };
  }

  /**
   * 根据用户需求获取推荐模型
   */
  async getRecommendedModel(
    task: 'code_generation' | 'code_analysis' | 'chat' | 'optimization',
    prioritizeSpeed = false,
    prioritizeCost = false,
  ) {
    const config = await this.getConfig();
    const providerInfo = this.getSupportedProviders().providers.find(
      (p) => p.id.toLowerCase() === config.provider.toLowerCase(),
    );

    if (!providerInfo) {
      return config.model; // 默认返回配置的模型
    }

    let filteredModels = providerInfo.models.filter((model) => {
      if (task === 'code_generation' && !model.features.includes('代码生成'))
        return false;
      if (task === 'code_analysis' && !model.features.includes('代码分析'))
        return false;
      if (task === 'chat' && !model.features.includes('聊天')) return false;
      if (task === 'optimization' && !model.features.includes('代码分析'))
        return false;
      return true;
    });

    if (filteredModels.length === 0) {
      return config.model;
    }

    // 排序逻辑
    if (prioritizeSpeed) {
      filteredModels.sort(
        (a, b) => (a.averageLatency || 9999) - (b.averageLatency || 9999),
      );
    } else if (prioritizeCost) {
      filteredModels.sort(
        (a, b) => (a.costPer1kTokens || 0) - (b.costPer1kTokens || 0),
      );
    } else {
      // 平衡模式：基于性能和成本的加权评分
      filteredModels.sort((a, b) => {
        const scoreA =
          (a.averageLatency || 2000) / 2000 + (a.costPer1kTokens || 0.01) * 100;
        const scoreB =
          (b.averageLatency || 2000) / 2000 + (b.costPer1kTokens || 0.01) * 100;
        return scoreA - scoreB;
      });
    }

    return filteredModels[0].id;
  }
}
