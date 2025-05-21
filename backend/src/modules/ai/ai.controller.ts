import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
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
    const userId = req.user.sub;
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
    const userId = req.user.sub;
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
    const userId = req.user.sub;
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
    const userId = req.user.sub;
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
    const userId = req.user.sub;
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

    // 添加可用提供商列表
    const availableProviders = ['OpenAI', 'Claude', 'LocalLLM'];

    return {
      code: 0,
      message: '获取AI配置成功',
      data: {
        ...maskedConfig,
        availableProviders,
      },
    };
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
}
