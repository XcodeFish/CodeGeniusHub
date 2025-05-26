import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AiConfigService } from './ai-config.service';
import { AiUsageLog } from './schemas/ai-usage-log.schema';
import { PromptTemplate } from './schemas/prompt-template.schema';
import { PromptBuilder } from './utils/prompt-builder';
import { TokenCounter } from './utils/token-counter';
import { CodeParser } from './utils/code-parser';
import { AiServiceResponse } from './interfaces/openai-response.interface';
import {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
  FilterPromptTemplateDto,
  TestPromptTemplateDto,
} from './dto/prompt-template.dto';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly configService: ConfigService,
    private readonly promptBuilder: PromptBuilder,
    private readonly tokenCounter: TokenCounter,
    private readonly codeParser: CodeParser,
    @InjectModel(AiUsageLog.name) private aiUsageLogModel: Model<AiUsageLog>,
    @InjectModel(PromptTemplate.name)
    private promptTemplateModel: Model<PromptTemplate>,
  ) {}

  /**
   * 在模块初始化时创建系统默认提示词模板
   */
  async onModuleInit() {
    try {
      this.logger.log('初始化系统默认提示词模板...');
      await this.initSystemPromptTemplates();
      this.logger.log('系统默认提示词模板初始化完成');
    } catch (error) {
      this.logger.error('初始化系统默认提示词模板失败', error.stack);
    }
  }

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
      const result = await provider.chat(message, {
        history: options?.history || [],
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
            reply: result.data.response,
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
      const result = await provider.chat(prompt, {
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

  /**
   * 创建提示词模板
   */
  async createPromptTemplate(dto: CreatePromptTemplateDto) {
    try {
      // 检查同名模板是否已存在
      const existingTemplate = await this.promptTemplateModel.findOne({
        name: dto.name,
        type: dto.type,
      });

      if (existingTemplate) {
        throw new BadRequestException('同类型下已存在同名模板');
      }

      // 创建新模板
      const newTemplate = new this.promptTemplateModel({
        ...dto,
        tags: dto.tags || [],
        isSystem: dto.isSystem || false,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      });

      await newTemplate.save();

      return {
        code: 0,
        message: '创建提示词模板成功',
        data: newTemplate,
      };
    } catch (error) {
      this.logger.error(`创建提示词模板失败: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`创建提示词模板失败: ${error.message}`);
    }
  }

  /**
   * 更新提示词模板
   */
  async updatePromptTemplate(id: string, dto: UpdatePromptTemplateDto) {
    try {
      // 验证ObjectId格式
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('无效的模板ID');
      }

      // 查找模板
      const template = await this.promptTemplateModel.findById(id);
      if (!template) {
        throw new NotFoundException('提示词模板不存在');
      }

      // 检查同名模板是否已存在(不包括自己)
      if (dto.name) {
        const existingTemplate = await this.promptTemplateModel.findOne({
          name: dto.name,
          type: dto.type || template.type,
          _id: { $ne: id },
        });

        if (existingTemplate) {
          throw new BadRequestException('同类型下已存在同名模板');
        }
      }

      // 更新模板
      Object.keys(dto).forEach((key) => {
        if (dto[key] !== undefined) {
          template[key] = dto[key];
        }
      });

      await template.save();

      return {
        code: 0,
        message: '更新提示词模板成功',
        data: template,
      };
    } catch (error) {
      this.logger.error(`更新提示词模板失败: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`更新提示词模板失败: ${error.message}`);
    }
  }

  /**
   * 删除提示词模板
   */
  async deletePromptTemplate(id: string) {
    try {
      // 验证ObjectId格式
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('无效的模板ID');
      }

      // 查找模板
      const template = await this.promptTemplateModel.findById(id);
      if (!template) {
        throw new NotFoundException('提示词模板不存在');
      }

      // 不允许删除系统模板
      if (template.isSystem) {
        throw new BadRequestException('系统模板不允许删除');
      }

      // 删除模板
      await this.promptTemplateModel.findByIdAndDelete(id);

      return {
        code: 0,
        message: '删除提示词模板成功',
        data: { success: true },
      };
    } catch (error) {
      this.logger.error(`删除提示词模板失败: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`删除提示词模板失败: ${error.message}`);
    }
  }

  /**
   * 获取提示词模板列表
   */
  async getPromptTemplates(filter: FilterPromptTemplateDto) {
    try {
      // 构建查询条件
      const query: any = {};

      if (filter.type) {
        query.type = filter.type;
      }

      if (filter.isSystem !== undefined) {
        query.isSystem = filter.isSystem;
      }

      if (filter.isActive !== undefined) {
        query.isActive = filter.isActive;
      }

      if (filter.tags && filter.tags.length > 0) {
        query.tags = { $in: filter.tags };
      }

      if (filter.keyword) {
        query.$or = [
          { name: { $regex: filter.keyword, $options: 'i' } },
          { description: { $regex: filter.keyword, $options: 'i' } },
        ];
      }

      // 查询模板
      const templates = await this.promptTemplateModel
        .find(query)
        .sort({ isSystem: -1, updatedAt: -1 });

      return {
        code: 0,
        message: '获取提示词模板列表成功',
        data: {
          templates,
          total: templates.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `获取提示词模板列表失败: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`获取提示词模板列表失败: ${error.message}`);
    }
  }

  /**
   * 获取提示词模板详情
   */
  async getPromptTemplate(id: string) {
    try {
      // 验证ObjectId格式
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('无效的模板ID');
      }

      // 查找模板
      const template = await this.promptTemplateModel.findById(id);
      if (!template) {
        throw new NotFoundException('提示词模板不存在');
      }

      return {
        code: 0,
        message: '获取提示词模板详情成功',
        data: template,
      };
    } catch (error) {
      this.logger.error(
        `获取提示词模板详情失败: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`获取提示词模板详情失败: ${error.message}`);
    }
  }

  /**
   * 测试提示词模板
   */
  async testPromptTemplate(dto: TestPromptTemplateDto) {
    try {
      // 获取当前AI提供商
      const provider = await this.aiConfigService.getCurrentProvider();

      // 获取AI配置
      const config = await this.aiConfigService.getConfig();

      // 根据模板类型执行不同的测试
      let result: AiServiceResponse<any>;

      switch (dto.type) {
        case 'generate':
          result = await provider.generateCode(dto.input, 'javascript', {
            customPrompt: dto.template,
            context: dto.context,
            maxTokens: Math.min(1000, config.maxTokensGenerate),
            temperature: config.temperature,
            model: config.model,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
          });
          break;

        case 'analyze':
          result = await provider.analyzeCode(dto.input, 'javascript', {
            customPrompt: dto.template,
            context: dto.context,
            model: config.model,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
          });
          break;

        case 'optimize':
          result = await provider.optimizeCode(dto.input, 'javascript', {
            customPrompt: dto.template,
            context: dto.context,
            model: config.model,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
          });
          break;

        case 'chat':
        case 'explain':
        default:
          // 使用聊天API进行测试
          result = await provider.chat(
            [
              { role: 'system', content: dto.template },
              { role: 'user', content: dto.input },
            ],
            {
              model: config.model,
              apiKey: config.apiKey,
              baseUrl: config.baseUrl,
            },
          );
          break;
      }

      if (!result.success) {
        return {
          code: 1,
          message: result.error?.message || '模板测试失败',
          data: null,
        };
      }

      return {
        code: 0,
        message: '模板测试成功',
        data: {
          result: result.data,
          tokensUsed: result.usage?.totalTokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`测试提示词模板失败: ${error.message}`, error.stack);
      throw new BadRequestException(`测试提示词模板失败: ${error.message}`);
    }
  }

  /**
   * 初始化系统默认提示词模板
   */
  async initSystemPromptTemplates() {
    try {
      const systemTemplates = [
        {
          name: '代码生成-通用',
          description: '通用的代码生成提示词模板，适用于各种编程语言和场景',
          template: `你是一位专业的代码生成助手，擅长根据需求描述生成高质量、符合最佳实践的代码。请根据提供的需求和上下文，生成清晰、简洁、易于维护的代码。生成的代码应当：
1. 结构清晰，注释适当
2. 遵循目标语言/框架的最佳实践
3. 代码简洁高效，避免冗余
4. 具备适当的错误处理
5. 命名规范一致`,
          type: 'generate',
          tags: ['通用', '代码生成'],
          isSystem: true,
          isActive: true,
        },
        {
          name: '代码分析-通用',
          description:
            '通用的代码分析提示词模板，用于评估代码质量并提供改进建议',
          template: `你是一位代码质量分析专家，擅长发现代码中的问题、优化机会和安全隐患。请对提供的代码进行全面分析，并给出具体的改进建议。分析应当关注：
1. 代码可读性和可维护性
2. 潜在的错误和边界情况
3. 性能问题和优化机会
4. 安全隐患
5. 设计模式和架构合理性`,
          type: 'analyze',
          tags: ['通用', '代码分析'],
          isSystem: true,
          isActive: true,
        },
        {
          name: '代码优化-通用',
          description: '通用的代码优化提示词模板，用于重构和改进现有代码',
          template: `你是一位代码优化专家，擅长重构和改进现有代码。请根据优化目标对提供的代码进行改进，同时保持代码功能不变，并详细说明所做的更改。优化应当关注：
1. 提高代码可读性和可维护性
2. 改进性能和效率
3. 减少代码复杂度
4. 消除冗余
5. 使用更现代和最佳的编程实践`,
          type: 'optimize',
          tags: ['通用', '代码优化'],
          isSystem: true,
          isActive: true,
        },
        {
          name: '编程助手-通用',
          description: '通用的编程助手提示词模板，用于回答编程相关问题',
          template: `你是一位经验丰富的编程助手，擅长回答各种编程相关问题。请提供准确、清晰、相关的信息，并在必要时补充代码示例。回答应该：
1. 直接解决用户的问题
2. 简洁明了，避免不必要的冗长
3. 提供具体的代码示例或解决方案步骤
4. 考虑最佳实践和可能的陷阱
5. 如有多种解决方案，说明各自的优缺点`,
          type: 'chat',
          tags: ['通用', '编程助手'],
          isSystem: true,
          isActive: true,
        },
        {
          name: '代码解释-通用',
          description: '通用的代码解释提示词模板，用于解释代码功能和实现逻辑',
          template: `你是一位代码解释专家，擅长分析代码并以清晰易懂的方式解释其功能和实现逻辑。请对提供的代码进行解释，包括：
1. 代码的整体功能和目的
2. 关键算法或设计模式的解释
3. 各部分代码的功能和相互关系
4. 特殊技巧或不常见语法的说明
5. 可能的边界情况或限制`,
          type: 'explain',
          tags: ['通用', '代码解释'],
          isSystem: true,
          isActive: true,
        },
      ];

      // 检查系统模板是否已存在
      for (const template of systemTemplates) {
        const existingTemplate = await this.promptTemplateModel.findOne({
          name: template.name,
          type: template.type,
          isSystem: true,
        });

        if (!existingTemplate) {
          await this.promptTemplateModel.create(template);
          this.logger.log(`创建系统提示词模板: ${template.name}`);
        }
      }

      return {
        code: 0,
        message: '初始化系统提示词模板成功',
        data: { success: true },
      };
    } catch (error) {
      this.logger.error(
        `初始化系统提示词模板失败: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `初始化系统提示词模板失败: ${error.message}`,
      );
    }
  }
}
