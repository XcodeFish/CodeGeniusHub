import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIProvider,
  ChatCompletionParams,
  ChatCompletionResponse,
} from '../interfaces/ai-provider.interface';
import axios from 'axios';

@Injectable()
export class OllamaProvider implements AIProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiUrl =
      this.configService.get<string>('ai.ollama.apiUrl') ||
      'http://localhost:11434';
  }

  async chatCompletion(
    params: ChatCompletionParams,
  ): Promise<ChatCompletionResponse> {
    const { model, messages, temperature, maxTokens } = params;
    const startTime = Date.now();

    try {
      this.logger.debug(`开始请求Ollama API，模型: ${model}`);

      const response = await axios.post(
        `${this.apiUrl}/api/chat`,
        {
          model: model,
          messages: messages,
          options: {
            temperature: temperature || 0.7,
            num_predict: maxTokens || 1000,
          },
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const endTime = Date.now();
      this.logger.debug(`Ollama API请求完成，耗时: ${endTime - startTime}ms`);

      return {
        id: `ollama-${Date.now()}`,
        model: model,
        choices: [
          {
            message: response.data.message,
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: response.data.prompt_eval_count || 0,
          completion_tokens: response.data.eval_count || 0,
          total_tokens:
            (response.data.prompt_eval_count || 0) +
            (response.data.eval_count || 0),
        },
      };
    } catch (error) {
      this.logger.error(`Ollama API请求失败: ${error.message}`);
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
        `${this.apiUrl}/api/chat`,
        {
          model: model,
          messages: messages,
          options: {
            temperature: temperature || 0.7,
            num_predict: maxTokens || 1000,
          },
          stream: true,
        },
        {
          timeout: 60000,
          responseType: 'stream',
        },
      );

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          try {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;
              if (line.trim() === '[DONE]') {
                resolve();
                return;
              }

              try {
                const data = JSON.parse(line);
                if (data.message && data.message.content) {
                  onProgress({
                    choices: [
                      {
                        delta: { content: data.message.content },
                        finish_reason: null,
                      },
                    ],
                  });
                }
              } catch (e) {
                this.logger.debug(`解析流式响应JSON失败: ${e.message}`);
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
      this.logger.error(`Ollama流式API请求失败: ${error.message}`);
      throw error;
    }
  }
}
