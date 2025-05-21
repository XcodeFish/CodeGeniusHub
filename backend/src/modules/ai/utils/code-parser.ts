import { Injectable } from '@nestjs/common';

/**
 * 代码解析工具类
 * 用于提取代码片段，进行简单分析等
 */
@Injectable()
export class CodeParser {
  /**
   * 从文本中提取代码块
   *
   * @param text 包含代码块的文本
   * @returns 提取的代码块内容
   */
  extractCodeBlocks(text: string): string[] {
    if (!text) return [];

    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const matches = [...text.matchAll(codeBlockRegex)];
    return matches.map((match) => match[1].trim());
  }

  /**
   * 从文本中提取第一个代码块
   *
   * @param text 包含代码块的文本
   * @returns 第一个代码块的内容，如果没有则返回空字符串
   */
  extractFirstCodeBlock(text: string): string {
    if (!text) return '';

    const codeBlocks = this.extractCodeBlocks(text);
    return codeBlocks.length > 0 ? codeBlocks[0] : '';
  }

  /**
   * 从AI响应中提取生成的代码
   *
   * @param response AI响应文本
   * @returns 提取的代码内容
   */
  extractGeneratedCode(response: string): string {
    if (!response) return '';

    // 首先尝试提取代码块
    const codeBlock = this.extractFirstCodeBlock(response);
    if (codeBlock) {
      return codeBlock;
    }

    // 如果没有代码块，尝试提取整段代码
    // 这是一个简化的实现，可能需要更复杂的逻辑
    const lines = response.split('\n');
    const codeLines = lines.filter(
      (line) =>
        !line.startsWith('说明:') &&
        !line.startsWith('解释:') &&
        !line.startsWith('注意:'),
    );

    return codeLines.join('\n').trim();
  }

  /**
   * 从AI响应中提取解释部分
   *
   * @param response AI响应文本
   * @returns 提取的解释内容
   */
  extractExplanation(response: string): string {
    if (!response) return '';

    // 尝试寻找解释标记
    const explanationMarkers = [
      '解释:',
      '说明:',
      '实现思路:',
      '代码解释:',
      '实现说明:',
      '实现解释:',
      '思路说明:',
    ];

    for (const marker of explanationMarkers) {
      const markerIndex = response.indexOf(marker);
      if (markerIndex !== -1) {
        // 从标记开始到下一个代码块或结尾
        const explanationStart = markerIndex + marker.length;
        const nextCodeBlockIndex = response.indexOf('```', explanationStart);

        if (nextCodeBlockIndex !== -1) {
          return response
            .substring(explanationStart, nextCodeBlockIndex)
            .trim();
        } else {
          return response.substring(explanationStart).trim();
        }
      }
    }

    // 如果没有找到明确的解释标记，且有代码块，则假设代码块后的内容是解释
    const lastCodeBlockEnd = response.lastIndexOf('```');
    if (lastCodeBlockEnd !== -1) {
      const afterLastBlock = response.substring(lastCodeBlockEnd + 3).trim();
      if (afterLastBlock) {
        return afterLastBlock;
      }
    }

    // 最后的备选方案：返回整个响应（排除代码块）
    return this.removeCodeBlocks(response).trim();
  }

  /**
   * 从文本中移除所有代码块
   *
   * @param text 包含代码块的文本
   * @returns 移除代码块后的文本
   */
  removeCodeBlocks(text: string): string {
    if (!text) return '';
    return text.replace(/```(?:\w+)?\n[\s\S]*?```/g, '');
  }
}
