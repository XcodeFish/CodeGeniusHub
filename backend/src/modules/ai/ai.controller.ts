import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Query,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { AiService } from './ai.service';
import { AiConfigService } from './ai-config.service';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { AnalyzeCodeDto } from './dto/analyze-code.dto';
import { OptimizeCodeDto } from './dto/optimize-code.dto';
import { ChatRequestDto } from './dto/chat.dto';
import {
  UpdateAiConfigDto,
  TestAiConfigDto,
  GetUsageStatsDto,
} from './dto/ai-config.dto';
import {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
  FilterPromptTemplateDto,
  TestPromptTemplateDto,
} from './dto/prompt-template.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiConfigService: AiConfigService,
  ) {}

  @Post('generate-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '根据描述生成代码' })
  @ApiBody({ type: GenerateCodeDto })
  async generateCode(@Body() generateCodeDto: GenerateCodeDto, @Req() req) {
    const userId = req?.user?.id || req?.user?.userId;
    console.log('userId', userId, req.user);
    return this.aiService.generateCode(
      userId,
      generateCodeDto.prompt,
      generateCodeDto.language,
      {
        framework: generateCodeDto.framework,
        context: generateCodeDto.context,
        projectContext: generateCodeDto.projectContext,
        maxTokens: generateCodeDto.maxTokens,
        temperature: generateCodeDto.temperature,
      },
    );
  }

  @Post('analyze-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '分析代码质量' })
  @ApiBody({ type: AnalyzeCodeDto })
  async analyzeCode(@Body() analyzeCodeDto: AnalyzeCodeDto, @Req() req) {
    const userId = req?.user?.id || req?.user?.userId;
    return this.aiService.analyzeCode(
      userId,
      analyzeCodeDto.code,
      analyzeCodeDto.language,
      {
        analysisLevel: analyzeCodeDto.analysisLevel,
        context: analyzeCodeDto.context,
      },
    );
  }

  @Post('optimize-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '优化/重构代码' })
  @ApiBody({ type: OptimizeCodeDto })
  async optimizeCode(@Body() optimizeCodeDto: OptimizeCodeDto, @Req() req) {
    const userId = req?.user?.id || req?.user?.userId;
    return this.aiService.optimizeCode(
      userId,
      optimizeCodeDto.code,
      optimizeCodeDto.language,
      {
        optimizationGoals: optimizeCodeDto.optimizationGoals,
        context: optimizeCodeDto.context,
        explanation: optimizeCodeDto.explanation,
      },
    );
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '编程助手对话' })
  @ApiBody({ type: ChatRequestDto })
  async chat(@Body() chatDto: ChatRequestDto, @Req() req) {
    const userId = req?.user?.id || req?.user?.userId;
    return this.aiService.chat(userId, chatDto.message, {
      conversationId: chatDto.conversationId,
      codeContext: chatDto.codeContext,
      projectId: chatDto.projectId,
      fileId: chatDto.fileId,
    });
  }

  @Post('explain-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '解释代码' })
  async explainCode(
    @Body()
    body: {
      code: string;
      language: string;
      detailLevel?: string;
      audience?: string;
    },
    @Req() req,
  ) {
    const userId = req?.user?.id || req?.user?.userId;
    return this.aiService.explainCode(userId, body.code, body.language, {
      detailLevel: body.detailLevel,
      audience: body.audience,
    });
  }

  // AI配置管理接口 - 仅管理员可用

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取AI配置' })
  async getConfig() {
    const config = await this.aiConfigService.getConfig();

    // 掩码显示API密钥
    const maskedConfig = {
      ...config.toObject(),
      apiKey: config.apiKey
        ? `${config.apiKey.substring(0, 4)}...${config.apiKey.substring(config.apiKey.length - 4)}`
        : '',
    };

    // 获取可用提供商列表，但只提取ID，避免循环引用
    try {
      const { providers } = this.aiConfigService.getSupportedProviders();
      const availableProviders = providers.map((p) => p.id);

      return {
        code: 0,
        message: '获取AI配置成功',
        data: {
          ...maskedConfig,
          availableProviders,
        },
      };
    } catch (error) {
      // 使用控制器中的logger
      console.error(`获取AI配置时出错: ${error.message}`, error.stack);
      // 即使获取AI提供商失败，也返回配置信息
      return {
        code: 0,
        message: '获取AI配置成功，但获取提供商列表失败',
        data: {
          ...maskedConfig,
          availableProviders: ['OpenAI', 'Claude', 'LocalLLM', 'DeepSeek'], // 提供基本的提供商列表作为备选
        },
      };
    }
  }

  @Post('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新AI配置' })
  @ApiBody({ type: UpdateAiConfigDto })
  async updateConfig(@Body() updateConfigDto: UpdateAiConfigDto) {
    const updatedConfig =
      await this.aiConfigService.updateConfig(updateConfigDto);

    return {
      code: 0,
      message: 'AI配置更新成功',
      data: {
        success: true,
      },
    };
  }

  @Post('config/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '测试AI配置' })
  @ApiBody({ type: TestAiConfigDto })
  async testConfig(@Body() testConfigDto: TestAiConfigDto) {
    if (!testConfigDto.provider) {
      throw new BadRequestException('AI提供商不能为空');
    }

    const result = await this.aiConfigService.testConnection(
      testConfigDto.provider,
      testConfigDto.apiKey,
      testConfigDto.model,
      testConfigDto.baseUrl,
    );

    if (!result.success) {
      return {
        code: 1,
        message: result.error?.message || '连接测试失败',
        data: {
          success: false,
        },
      };
    }

    return {
      code: 0,
      message: '连接测试成功',
      data: {
        success: true,
        models: result.data.models,
        latency: result.data.latency,
        quota: result.data.quota,
      },
    };
  }

  @Get('config/usage-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取AI使用统计' })
  async getUsageStats(@Query() query: GetUsageStatsDto) {
    return this.aiService.getUsageStats({
      startDate: query.startDate,
      endDate: query.endDate,
      groupBy: query.groupBy,
    });
  }

  @Get('health')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取AI服务健康状态' })
  async getHealthStatus() {
    const healthStatus = this.aiConfigService.getProvidersHealth();

    return {
      code: 0,
      message: '获取AI服务健康状态成功',
      data: healthStatus,
    };
  }

  @Get('recommend-model/:task')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取AI模型推荐' })
  @ApiParam({
    name: 'task',
    enum: ['code_generation', 'code_analysis', 'chat', 'optimization'],
  })
  @ApiQuery({ name: 'prioritizeSpeed', required: false, type: Boolean })
  @ApiQuery({ name: 'prioritizeCost', required: false, type: Boolean })
  async getRecommendedModel(
    @Param('task')
    task: 'code_generation' | 'code_analysis' | 'chat' | 'optimization',
    @Query('prioritizeSpeed') prioritizeSpeed?: string | boolean,
    @Query('prioritizeCost') prioritizeCost?: string | boolean,
  ) {
    const model = await this.aiConfigService.getRecommendedModel(
      task,
      prioritizeSpeed === true || prioritizeSpeed === 'true',
      prioritizeCost === true || prioritizeCost === 'true',
    );

    return {
      code: 0,
      message: '获取AI模型推荐成功',
      data: { model },
    };
  }

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取支持的AI提供商' })
  async getSupportedProviders() {
    try {
      const providersInfo = this.aiConfigService.getSupportedProviders();

      // 简化健康状态信息，避免可能的循环引用
      const simplifiedProviders = providersInfo.providers.map((provider) => {
        // 只保留简单的健康状态信息，避免复杂对象
        const healthStatus = provider.healthStatus
          ? {
              status: provider.healthStatus.status,
              lastCheck: provider.healthStatus.lastCheck,
              latency: provider.healthStatus.latency,
            }
          : { status: 'unknown', lastCheck: null };

        return {
          ...provider,
          healthStatus,
        };
      });

      return {
        code: 0,
        message: '获取AI提供商列表成功',
        data: {
          ...providersInfo,
          providers: simplifiedProviders,
        },
      };
    } catch (error) {
      console.error(`获取AI提供商列表时出错: ${error.message}`, error.stack);
      return {
        code: 1,
        message: '获取AI提供商列表失败',
        data: null,
      };
    }
  }

  // 提示词模板管理相关接口

  @Post('prompt-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建提示词模板' })
  @ApiBody({ type: CreatePromptTemplateDto })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createPromptTemplate(@Body() dto: CreatePromptTemplateDto) {
    return this.aiService.createPromptTemplate(dto);
  }

  @Put('prompt-templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新提示词模板' })
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiBody({ type: UpdatePromptTemplateDto })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updatePromptTemplate(
    @Param('id') id: string,
    @Body() dto: UpdatePromptTemplateDto,
  ) {
    return this.aiService.updatePromptTemplate(id, dto);
  }

  @Delete('prompt-templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除提示词模板' })
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deletePromptTemplate(@Param('id') id: string) {
    return this.aiService.deletePromptTemplate(id);
  }

  @Get('prompt-templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取提示词模板列表' })
  @ApiQuery({ name: 'type', required: false, description: '模板类型' })
  @ApiQuery({ name: 'keyword', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'isSystem', required: false, description: '是否系统模板' })
  @ApiQuery({ name: 'isActive', required: false, description: '是否激活' })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: '标签筛选，多个标签用逗号分隔',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPromptTemplates(@Query() query: FilterPromptTemplateDto) {
    // 处理标签筛选参数
    if (typeof query.tags === 'string') {
      query.tags = (query.tags as string).split(',');
    }

    return this.aiService.getPromptTemplates(query);
  }

  @Get('prompt-templates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取提示词模板详情' })
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPromptTemplate(@Param('id') id: string) {
    return this.aiService.getPromptTemplate(id);
  }

  @Post('prompt-templates/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '测试提示词模板' })
  @ApiBody({ type: TestPromptTemplateDto })
  @ApiResponse({ status: 200, description: '测试成功' })
  async testPromptTemplate(@Body() dto: TestPromptTemplateDto) {
    return this.aiService.testPromptTemplate(dto);
  }

  @Post('prompt-templates/init')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '初始化系统提示词模板' })
  @ApiResponse({ status: 200, description: '初始化成功' })
  async initSystemPromptTemplates() {
    return this.aiService.initSystemPromptTemplates();
  }
}
