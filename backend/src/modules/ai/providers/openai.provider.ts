import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  AIProvider,
  ChatCompletionParams,
  ChatCompletionResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.openai.apiKey') || '';
    this.apiUrl =
      this.configService.get<string>('ai.openai.baseUrl') ||
      'https://api.openai.com/v1';
  }

  async chatCompletion(
    params: ChatCompletionParams,
  ): Promise<ChatCompletionResponse> {
    const { model, messages, temperature, maxTokens } = params;
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
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
      this.logger.debug(`OpenAI API请求完成，耗时: ${endTime - startTime}ms`);

      return response.data;
    } catch (error) {
      this.logger.error(`OpenAI API请求失败: ${error.message}`);
      throw error;
    }
  }

  async streamChatCompletion(
    params: ChatCompletionParams,
    onProgress: (chunk: any) => void,
  ): Promise<void> {
    const { model, messages, temperature, maxTokens } = params;

    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
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
      this.logger.error(`OpenAI流式API请求失败: ${error.message}`);
      throw error;
    }
  }
}
