import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, HydratedDocument } from 'mongoose';
import { AiConfig } from './schemas/ai-config.schema';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { LocalLlmProvider } from './providers/local-llm.provider';
import { AiServiceResponse } from './interfaces/openai-response.interface';

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);
  private cachedConfig: HydratedDocument<AiConfig> | null = null;
  private lastCacheTime = 0;
  private readonly cacheTTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(
    @InjectModel(AiConfig.name) private aiConfigModel: Model<AiConfig>,
    private readonly openaiProvider: OpenAIProvider,
    private readonly claudeProvider: ClaudeProvider,
    private readonly localLlmProvider: LocalLlmProvider,
  ) {
    // 初始化时加载配置
    this.loadConfig();
  }

  /**
   * 获取当前AI配置
   */
  async getConfig(): Promise<HydratedDocument<AiConfig>> {
    // 如果缓存有效，返回缓存的配置
    if (this.cachedConfig && Date.now() - this.lastCacheTime < this.cacheTTL) {
      return this.cachedConfig;
    }

    return this.loadConfig();
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<HydratedDocument<AiConfig>> {
    try {
      // 查找配置，如果没有则创建默认配置
      let config = await this.aiConfigModel.findOne().exec();

      if (!config) {
        config = await this.createDefaultConfig();
      }

      // 更新缓存
      this.cachedConfig = config;
      this.lastCacheTime = Date.now();

      return config;
    } catch (error) {
      this.logger.error('加载AI配置失败', error);
      throw new Error('加载AI配置失败');
    }
  }

  /**
   * 创建默认配置
   */
  private async createDefaultConfig(): Promise<HydratedDocument<AiConfig>> {
    const defaultConfig = new this.aiConfigModel({
      provider: 'OpenAI',
      model: 'gpt-3.5-turbo',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
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
    });

    return defaultConfig.save();
  }

  /**
   * 更新AI配置
   */
  async updateConfig(updateData: Partial<AiConfig>): Promise<AiConfig> {
    try {
      const config = await this.aiConfigModel.findOne().exec();

      if (!config) {
        throw new NotFoundException('AI配置不存在');
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

      return config;
    } catch (error) {
      this.logger.error('更新AI配置失败', error);
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
      let result: AiServiceResponse<any>;

      switch (provider.toLowerCase()) {
        case 'openai':
          result = await this.openaiProvider.testConnection(apiKey, {
            model,
            baseUrl,
          });
          break;
        case 'claude':
        case 'anthropic':
          result = await this.claudeProvider.testConnection(apiKey, {
            model,
            baseUrl,
          });
          break;
        case 'localllm':
        case 'local':
        case 'ollama':
          result = await this.localLlmProvider.testConnection(apiKey, {
            model,
            baseUrl,
          });
          break;
        default:
          return {
            success: false,
            error: {
              code: 'invalid_provider',
              message: `不支持的AI提供商: ${provider}`,
            },
          };
      }

      return result;
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
   * 获取当前提供商
   */
  async getCurrentProvider() {
    const config = await this.getConfig();

    switch (config.provider.toLowerCase()) {
      case 'openai':
        return this.openaiProvider;
      case 'claude':
      case 'anthropic':
        return this.claudeProvider;
      case 'localllm':
      case 'local':
      case 'ollama':
        return this.localLlmProvider;
      default:
        // 默认使用OpenAI
        return this.openaiProvider;
    }
  }
}
