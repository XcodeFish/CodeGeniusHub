import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AiConfigService } from './ai-config.service';
import { AiUsageLog } from './schemas/ai-usage-log.schema';
import { PromptBuilder } from './utils/prompt-builder';
import { TokenCounter } from './utils/token-counter';
import { CodeParser } from './utils/code-parser';
import { AiServiceResponse } from './interfaces/openai-response.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly configService: ConfigService,
    private readonly promptBuilder: PromptBuilder,
    private readonly tokenCounter: TokenCounter,
    private readonly codeParser: CodeParser,
    @InjectModel(AiUsageLog.name) private aiUsageLogModel: Model<AiUsageLog>,
  ) {}

  /**
   * 生成代码
   */
  async generateCode(
    userId: Types.ObjectId,
    prompt: string,
    language: string,
    options?: {
      framework?: string;
      context?: string;
      projectContext?: Record<string, any>;
      maxTokens?: number;
      temperature?: number;
      projectId?: Types.ObjectId;
      fileId?: Types.ObjectId;
    },
  ) {
    try {
      // 获取当前AI提供商
      const provider = await this.aiConfigService.getCurrentProvider();

      // 获取AI配置
      const config = await this.aiConfigService.getConfig();

      // 检查用户是否超过使用限制
      await this.checkUserUsageLimit(userId);

      // 调用AI生成代码
      const result = await provider.generateCode(prompt, language, {
        framework: options?.framework,
        context: options?.context,
        maxTokens: options?.maxTokens || config.maxTokensGenerate,
        temperature: options?.temperature || config.temperature,
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });

      // 记录使用日志
      if (result.success) {
        await this.logUsage(userId, 'generate', {
          provider: config.provider,
          model: config.model,
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
          projectId: options?.projectId,
          fileId: options?.fileId,
          prompt,
          language,
          framework: options?.framework,
        });
      }

      // 返回结果
      if (result.success && result.data) {
        return {
          code: 0,
          message: '代码生成成功',
          data: {
            generatedCode: result.data.generatedCode,
            explanation: result.data.explanation,
            alternatives: result.data.alternatives,
            tokensUsed: result.usage?.totalTokens || 0,
          },
        };
      } else {
        return {
          code: 1,
          message: result.error?.message || '代码生成失败',
          data: null,
        };
      }
    } catch (error) {
      this.logger.error(`生成代码失败: ${error.message}`, error.stack);
      throw new BadRequestException(`生成代码失败: ${error.message}`);
    }
  }

  /**
   * 分析代码
   */
  async analyzeCode(
    userId: Types.ObjectId,
    code: string,
    language: string,
    options?: {
      analysisLevel?: 'basic' | 'detailed' | 'comprehensive';
      context?: string;
      projectId?: Types.ObjectId;
      fileId?: Types.ObjectId;
    },
  ) {
    try {
      // 获取当前AI提供商
      const provider = await this.aiConfigService.getCurrentProvider();

      // 获取AI配置
      const config = await this.aiConfigService.getConfig();

      // 检查用户是否超过使用限制
      await this.checkUserUsageLimit(userId);

      // 调用AI分析代码
      const result = await provider.analyzeCode(code, language, {
        analysisLevel: options?.analysisLevel,
        context: options?.context,
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });

      // 记录使用日志
      if (result.success) {
        await this.logUsage(userId, 'analyze', {
          provider: config.provider,
          model: config.model,
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
          projectId: options?.projectId,
          fileId: options?.fileId,
          language,
        });
      }

      // 返回结果
      if (result.success && result.data) {
        return {
          code: 0,
          message: '代码分析成功',
          data: {
            score: result.data.score,
            issues: result.data.issues,
            strengths: result.data.strengths,
            summary: result.data.summary,
            tokensUsed: result.usage?.totalTokens || 0,
          },
        };
      } else {
        return {
          code: 1,
          message: result.error?.message || '代码分析失败',
          data: null,
        };
      }
    } catch (error) {
      this.logger.error(`分析代码失败: ${error.message}`, error.stack);
      throw new BadRequestException(`分析代码失败: ${error.message}`);
    }
  }

  /**
   * 优化代码
   */
  async optimizeCode(
    userId: Types.ObjectId,
    code: string,
    language: string,
    options?: {
      optimizationGoals?: string[];
      context?: string;
      explanation?: boolean;
      projectId?: Types.ObjectId;
      fileId?: Types.ObjectId;
    },
  ) {
    try {
      // 获取当前AI提供商
      const provider = await this.aiConfigService.getCurrentProvider();

      // 获取AI配置
      const config = await this.aiConfigService.getConfig();

      // 检查用户是否超过使用限制
      await this.checkUserUsageLimit(userId);

      // 调用AI优化代码
      const result = await provider.optimizeCode(code, language, {
        optimizationGoals: options?.optimizationGoals,
        context: options?.context,
        explanation: options?.explanation,
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });

      // 记录使用日志
      if (result.success) {
        await this.logUsage(userId, 'optimize', {
          provider: config.provider,
          model: config.model,
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
          projectId: options?.projectId,
          fileId: options?.fileId,
          language,
        });
      }

      // 返回结果
      if (result.success && result.data) {
        return {
          code: 0,
          message: '代码优化成功',
          data: {
            optimizedCode: result.data.optimizedCode,
            changes: result.data.changes,
            improvementSummary: result.data.improvementSummary,
            tokensUsed: result.usage?.totalTokens || 0,
          },
        };
      } else {
        return {
          code: 1,
          message: result.error?.message || '代码优化失败',
          data: null,
        };
      }
    } catch (error) {
      this.logger.error(`优化代码失败: ${error.message}`, error.stack);
      throw new BadRequestException(`优化代码失败: ${error.message}`);
    }
  }

  /**
   * 聊天对话
   */
  async chat(
    userId: Types.ObjectId,
    message: string,
    options?: {
      conversationId?: string;
      history?: Array<{ role: string; content: string }>;
      codeContext?: string;
      projectId?: Types.ObjectId;
      fileId?: Types.ObjectId;
    },
  ) {
    try {
      // 获取当前AI提供商
      const provider = await this.aiConfigService.getCurrentProvider();

      // 获取AI配置
      const config = await this.aiConfigService.getConfig();

      // 检查用户是否超过使用限制
      await this.checkUserUsageLimit(userId);

      // 调用AI聊天
      const result = await provider.chat(message, options?.history || [], {
        codeContext: options?.codeContext,
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });

      // 记录使用日志
      if (result.success) {
        await this.logUsage(userId, 'chat', {
          provider: config.provider,
          model: config.model,
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
          projectId: options?.projectId,
          fileId: options?.fileId,
        });
      }

      // 返回结果
      if (result.success && result.data) {
        return {
          code: 0,
          message: '聊天成功',
          data: {
            response: result.data.response,
            conversationId:
              options?.conversationId || this.generateConversationId(),
            tokensUsed: result.usage?.totalTokens || 0,
          },
        };
      } else {
        return {
          code: 1,
          message: result.error?.message || '聊天失败',
          data: null,
        };
      }
    } catch (error) {
      this.logger.error(`聊天失败: ${error.message}`, error.stack);
      throw new BadRequestException(`聊天失败: ${error.message}`);
    }
  }

  /**
   * 解释代码
   */
  async explainCode(
    userId: Types.ObjectId,
    code: string,
    language: string,
    options?: {
      detailLevel?: string;
      audience?: string;
      projectId?: Types.ObjectId;
      fileId?: Types.ObjectId;
    },
  ) {
    try {
      // 获取当前AI提供商
      const provider = await this.aiConfigService.getCurrentProvider();

      // 获取AI配置
      const config = await this.aiConfigService.getConfig();

      // 检查用户是否超过使用限制
      await this.checkUserUsageLimit(userId);

      // 构建提示词
      const detailLevel = options?.detailLevel || 'detailed';
      const audience = options?.audience || 'intermediate';

      const prompt = `请解释以下${language}代码，解释详细程度为${detailLevel}，面向${audience}级别的开发者：\n\n\`\`\`\n${code}\n\`\`\`\n\n请提供整体解释，并尽可能按照代码的逻辑结构进行解释。`;

      // 调用AI聊天来解释代码
      const result = await provider.chat(prompt, [], {
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });

      // 记录使用日志
      if (result.success) {
        await this.logUsage(userId, 'explain', {
          provider: config.provider,
          model: config.model,
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
          projectId: options?.projectId,
          fileId: options?.fileId,
          language,
        });
      }

      // 返回结果
      if (result.success && result.data) {
        return {
          code: 0,
          message: '代码解释成功',
          data: {
            explanation: result.data.response,
            tokensUsed: result.usage?.totalTokens || 0,
          },
        };
      } else {
        return {
          code: 1,
          message: result.error?.message || '代码解释失败',
          data: null,
        };
      }
    } catch (error) {
      this.logger.error(`解释代码失败: ${error.message}`, error.stack);
      throw new BadRequestException(`解释代码失败: ${error.message}`);
    }
  }

  /**
   * 获取AI使用统计
   */
  async getUsageStats(options?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'user';
  }) {
    try {
      const startDate = options?.startDate
        ? new Date(options.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 默认30天前

      const endDate = options?.endDate ? new Date(options.endDate) : new Date();

      const matchStage = {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      // 总计使用量
      const totalStats = await this.aiUsageLogModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: '$totalTokens' },
            totalRequests: { $count: {} },
          },
        },
      ]);

      // 按功能分组统计
      const featureStats = await this.aiUsageLogModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$feature',
            totalTokens: { $sum: '$totalTokens' },
            totalRequests: { $count: {} },
          },
        },
        {
          $project: {
            feature: '$_id',
            totalTokens: 1,
            totalRequests: 1,
            _id: 0,
          },
        },
      ]);

      // 按日期分组统计
      const dateFormat =
        options?.groupBy === 'month'
          ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
          : options?.groupBy === 'week'
            ? { $dateToString: { format: '%Y-%U', date: '$createdAt' } }
            : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

      const dateStats = await this.aiUsageLogModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: dateFormat,
            totalTokens: { $sum: '$totalTokens' },
            totalRequests: { $count: {} },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            totalTokens: 1,
            totalRequests: 1,
            _id: 0,
          },
        },
      ]);

      // 如果按用户分组
      let userStats = [];
      if (options?.groupBy === 'user') {
        userStats = await this.aiUsageLogModel.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$userId',
              totalTokens: { $sum: '$totalTokens' },
              totalRequests: { $count: {} },
            },
          },
          {
            $project: {
              userId: '$_id',
              totalTokens: 1,
              totalRequests: 1,
              _id: 0,
            },
          },
          { $sort: { totalTokens: -1 } },
          { $limit: 20 }, // 只返回前20个用户
        ]);
      }

      // 估算成本(按OpenAI的价格，仅供参考)
      const estimatedCost = ((totalStats[0]?.totalTokens || 0) / 1000) * 0.002;

      return {
        code: 0,
        message: '获取使用统计成功',
        data: {
          totalTokens: totalStats[0]?.totalTokens || 0,
          totalRequests: totalStats[0]?.totalRequests || 0,
          totalCost: estimatedCost,
          usageByDate: dateStats,
          usageByFeature: featureStats,
          usageByUser: userStats,
        },
      };
    } catch (error) {
      this.logger.error(`获取使用统计失败: ${error.message}`, error.stack);
      throw new BadRequestException(`获取使用统计失败: ${error.message}`);
    }
  }

  /**
   * 记录使用日志
   */
  private async logUsage(
    userId: Types.ObjectId,
    feature: string,
    data: {
      provider: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      projectId?: Types.ObjectId;
      fileId?: Types.ObjectId;
      prompt?: string;
      language?: string;
      framework?: string;
    },
  ) {
    try {
      const log = new this.aiUsageLogModel({
        userId,
        feature,
        provider: data.provider,
        model: data.model,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        projectId: data.projectId,
        fileId: data.fileId,
        prompt: data.prompt,
        language: data.language,
        framework: data.framework,
        latency: 0, // 暂不记录延迟
        success: true,
      });

      await log.save();
    } catch (error) {
      this.logger.error(`记录使用日志失败: ${error.message}`, error.stack);
      // 记录日志失败不应该影响主流程
    }
  }

  /**
   * 检查用户是否超过使用限制
   */
  private async checkUserUsageLimit(userId: Types.ObjectId) {
    try {
      // 获取AI配置
      const config = await this.aiConfigService.getConfig();

      // 如果没有设置限制，则不检查
      if (!config.usageLimit?.userTokenLimit) {
        return true;
      }

      // 获取用户今日使用量
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userDailyUsage = await this.aiUsageLogModel.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: '$totalTokens' },
          },
        },
      ]);

      const userTokensUsed = userDailyUsage[0]?.totalTokens || 0;

      // 如果超过限制，抛出异常
      if (userTokensUsed >= config.usageLimit.userTokenLimit) {
        throw new BadRequestException(
          `您今日的AI使用量已达到限制(${config.usageLimit.userTokenLimit}tokens)，请明天再试或联系管理员提高限额。`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`检查用户使用限制失败: ${error.message}`, error.stack);
      // 如果检查失败，默认允许使用
      return true;
    }
  }

  /**
   * 生成会话ID
   */
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}
