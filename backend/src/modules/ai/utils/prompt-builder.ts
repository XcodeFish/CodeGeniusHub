import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptTemplate } from '../schemas/prompt-template.schema';

@Injectable()
export class PromptBuilder {
  private readonly systemPrompts: Record<string, string> = {
    generate: `你是一位专业的代码生成助手，擅长根据需求描述生成高质量、符合最佳实践的代码。请根据提供的需求和上下文，生成清晰、简洁、易于维护的代码。`,
    analyze: `你是一位代码质量分析专家，擅长发现代码中的问题、优化机会和安全隐患。请对提供的代码进行全面分析，并给出具体的改进建议。`,
    optimize: `你是一位代码优化专家，擅长重构和改进现有代码。请根据优化目标对提供的代码进行改进，同时保持代码功能不变，并详细说明所做的更改。`,
    chat: `你是一位编程助手，可以回答与编程、开发相关的问题。请尽可能提供准确、有帮助的回答，并在适当时提供代码示例。`,
  };

  constructor(
    @InjectModel(PromptTemplate.name)
    private promptTemplateModel: Model<PromptTemplate>,
  ) {}

  /**
   * 获取提示模板
   * @param type 模板类型
   * @param name 模板名称(可选)
   */
  async getTemplate(type: string, name?: string): Promise<string> {
    // 如果提供了名称，查找特定模板
    if (name) {
      const template = await this.promptTemplateModel.findOne({
        type,
        name,
        isActive: true,
      });
      if (template) {
        return template.template;
      }
    }

    // 如果没有找到特定模板，查找类型的默认模板
    const defaultTemplate = await this.promptTemplateModel.findOne({
      type,
      isSystem: true,
      isActive: true,
    });

    // 如果有默认模板，返回它
    if (defaultTemplate) {
      return defaultTemplate.template;
    }

    // 如果数据库中没有模板，返回内置的系统提示
    return this.systemPrompts[type] || '';
  }

  /**
   * 构建代码生成提示
   */
  async buildGeneratePrompt(params: {
    prompt: string;
    language: string;
    framework?: string;
    context?: string;
  }): Promise<string> {
    const templateText = await this.getTemplate('generate');
    const { prompt, language, framework, context } = params;

    let fullPrompt = templateText + '\n\n';

    // 添加任务描述
    fullPrompt += `需求描述: ${prompt}\n\n`;
    fullPrompt += `目标语言: ${language}\n`;

    if (framework) {
      fullPrompt += `目标框架/库: ${framework}\n`;
    }

    // 添加上下文代码(如果有)
    if (context) {
      fullPrompt += '\n当前文件内容:\n```\n' + context + '\n```\n';
    }

    fullPrompt += '\n请生成满足上述需求的代码，并简要解释实现思路。';

    return fullPrompt;
  }

  /**
   * 构建代码分析提示
   */
  async buildAnalyzePrompt(params: {
    code: string;
    language: string;
    analysisLevel?: string;
    context?: string;
  }): Promise<string> {
    const templateText = await this.getTemplate('analyze');
    const { code, language, analysisLevel = 'detailed', context } = params;

    let fullPrompt = templateText + '\n\n';

    // 添加分析级别说明
    fullPrompt += `分析深度: ${analysisLevel}\n\n`;
    fullPrompt += `编程语言: ${language}\n\n`;

    // 添加上下文代码(如果有)
    if (context) {
      fullPrompt += '上下文代码:\n```\n' + context + '\n```\n\n';
    }

    // 添加需要分析的代码
    fullPrompt += '需要分析的代码:\n```\n' + code + '\n```\n\n';

    // 添加分析要求
    fullPrompt += `请对上述代码进行${analysisLevel}级别的分析，包括：
1. 总体质量评分(0-100)
2. 代码存在的问题及严重程度(error/warning/info)
3. 代码优点
4. 改进建议
5. 总体评价`;

    return fullPrompt;
  }

  /**
   * 构建代码优化提示
   */
  async buildOptimizePrompt(params: {
    code: string;
    language: string;
    optimizationGoals?: string[];
    context?: string;
    explanation?: boolean;
  }): Promise<string> {
    const templateText = await this.getTemplate('optimize');
    const {
      code,
      language,
      optimizationGoals = [],
      context,
      explanation = true,
    } = params;

    let fullPrompt = templateText + '\n\n';

    fullPrompt += `编程语言: ${language}\n\n`;

    // 添加优化目标
    if (optimizationGoals.length > 0) {
      fullPrompt += `优化目标: ${optimizationGoals.join(', ')}\n\n`;
    }

    // 添加上下文代码(如果有)
    if (context) {
      fullPrompt += '上下文代码:\n```\n' + context + '\n```\n\n';
    }

    // 添加需要优化的代码
    fullPrompt += '需要优化的代码:\n```\n' + code + '\n```\n\n';

    // 添加优化要求
    fullPrompt += `请对上述代码进行优化，${
      optimizationGoals.length > 0
        ? `重点关注${optimizationGoals.join(', ')}方面，`
        : ''
    }保持功能不变的前提下提高代码质量。`;

    if (explanation) {
      fullPrompt += `\n\n请详细说明优化过程中所做的更改及其原因。`;
    }

    return fullPrompt;
  }

  /**
   * 构建聊天对话提示
   */
  async buildChatPrompt(params: {
    message: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    codeContext?: string;
  }): Promise<Array<{ role: string; content: string }>> {
    const templateText = await this.getTemplate('chat');
    const { message, conversationHistory = [], codeContext } = params;

    // 系统提示词
    const systemMessage = {
      role: 'system',
      content: templateText,
    };

    // 如果有代码上下文，添加到系统提示中
    if (codeContext) {
      systemMessage.content += `\n\n当前代码上下文:\n\`\`\`\n${codeContext}\n\`\`\``;
    }

    // 构建完整的对话历史
    const fullConversation = [
      systemMessage,
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    return fullConversation;
  }
}
