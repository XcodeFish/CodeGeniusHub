import { Injectable } from '@nestjs/common';

/**
 * Token计数工具
 * 注意：这是一个简化版的实现，实际项目中可能需要用更精确的分词库
 */
@Injectable()
export class TokenCounter {
  /**
   * 估算文本中的token数量
   * 这是一个简化的实现，OpenAI的token计算比这复杂得多
   * 实际项目中应使用tiktoken等专业库
   *
   * @param text 要计算的文本
   * @param model 模型名称(不同模型分词规则不同)
   */
  countTokens(text: string, model: string = 'gpt-3.5-turbo'): number {
    if (!text) {
      return 0;
    }

    // 简单估算：
    // 英文约每4个字符1个token
    // 中文约每1.5个字符1个token
    // 代码和特殊符号可能会增加token数量

    // 英文单词和数字
    const englishWords = text.match(/[a-zA-Z0-9]+/g) || [];
    const englishChars = englishWords.join('').length;

    // 中文字符
    const chineseChars =
      text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g)?.join('')
        .length || 0;

    // 代码和特殊符号(略微增加权重)
    const codeChars =
      text.match(/[^\w\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g)?.join('')
        .length || 0;

    // 估算token数量
    const englishTokens = Math.ceil(englishChars / 4);
    const chineseTokens = Math.ceil(chineseChars / 1.5);
    const codeTokens = Math.ceil(codeChars / 3);

    return englishTokens + chineseTokens + codeTokens;
  }

  /**
   * 估算多个文本的总token数量
   *
   * @param texts 文本数组
   * @param model 模型名称
   */
  countTotalTokens(texts: string[], model: string = 'gpt-3.5-turbo'): number {
    return texts.reduce((sum, text) => sum + this.countTokens(text, model), 0);
  }

  /**
   * 估算对话消息的token数量
   *
   * @param messages 对话消息数组
   * @param model 模型名称
   */
  countMessageTokens(
    messages: Array<{ role: string; content: string }>,
    model: string = 'gpt-3.5-turbo',
  ): number {
    // 每条消息有一个固定开销(大约4个token)
    const perMessageTokens = 4;

    // 计算内容的token
    const contentTokens = messages.reduce(
      (sum, message) => sum + this.countTokens(message.content, model),
      0,
    );

    // 消息格式的开销
    const formatTokens = messages.length * perMessageTokens;

    return contentTokens + formatTokens;
  }
}
