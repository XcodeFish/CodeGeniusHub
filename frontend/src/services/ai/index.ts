import http from '@/utils/request';
import { ResponseData } from '@/types/common';
import {
  GenerateCodeParams,
  GenerateCodeResponse,
  OptimizeCodeParams,
  OptimizeCodeResponse,
  AnalyzeCodeParams,
  AnalyzeCodeResponse,
  ExplainCodeParams,
  ExplainCodeResponse,
  ChatParams,
  ChatResponse,
  AIConfigParams,
  AIConfigResponse,
  AIConfigTestParams,
  AIConfigTestResponse,
  AIUsageStatsResponse,
  AIHealthResponse,
  AIModelRecommendationResponse,
  AIProvidersResponse,
  PromptTemplate,
  CreatePromptTemplateParams,
  UpdatePromptTemplateParams,
  TestPromptTemplateParams,
  TestPromptTemplateResponse,
  InitPromptTemplatesResponse,
  AIProviderEnum,
  PRESET_MODELS
} from '@/types';
import messageUtil from '@/utils/message-util'

// 设置更长的超时时间
const TIMEOUT_LONG = 60000; // 60秒

// Ollama专用接口类型定义
export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  }
}

export interface OllamaModel {
  name: string;
  size: number;
  modified?: string;
  details?: Record<string, any>;
}

export interface OllamaMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
  images?: string[]; // base64编码的图像，用于多模态模型
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number; // 最大生成令牌数
    stop?: string[];
    frequency_penalty?: number;
    presence_penalty?: number;
    seed?: number;
    num_ctx?: number; // 上下文窗口大小
    mirostat?: number;
    mirostat_eta?: number;
    mirostat_tau?: number;
    num_gpu?: number;
    num_thread?: number;
    repeat_penalty?: number;
    tfs_z?: number;
    [key: string]: any;
  };
  format?: string; // 响应格式，如 "json"
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
    frequency_penalty?: number;
    presence_penalty?: number;
    seed?: number;
    num_ctx?: number;
    mirostat?: number;
    mirostat_eta?: number;
    mirostat_tau?: number;
    num_gpu?: number;
    num_thread?: number;
    repeat_penalty?: number;
    tfs_z?: number;
    [key: string]: any;
  };
  format?: string;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaVersionResponse {
  version: string;
}

// AI服务
const aiService = {
  // 代码生成
  generateCode(params: GenerateCodeParams): Promise<GenerateCodeResponse> {
    return http.post<ResponseData<GenerateCodeResponse>>('/ai/generate-code', params).then(res => res.data!);
  },

  // 代码优化
  optimizeCode(params: OptimizeCodeParams): Promise<OptimizeCodeResponse> {
    return http.post<ResponseData<OptimizeCodeResponse>>('/ai/optimize-code', params).then(res => res.data!);
  },

  // 代码分析
  analyzeCode(params: AnalyzeCodeParams): Promise<AnalyzeCodeResponse> {
    return http.post<ResponseData<AnalyzeCodeResponse>>('/ai/analyze-code', params).then(res => res.data!);
  },

  // 代码解释
  explainCode(params: ExplainCodeParams): Promise<ExplainCodeResponse> {
    return http.post<ResponseData<ExplainCodeResponse>>('/ai/explain-code', params).then(res => res.data!);
  },

  // AI助手聊天
  chat(params: ChatParams): Promise<ChatResponse> {
    return http.post<ResponseData<ChatResponse>>('/ai/chat', params, {
      timeout: TIMEOUT_LONG // 增加超时时间
    }).then(res => {
      return res.data!;
    }).catch(error => {
      // 特别处理超时错误
      if (error.code === 'ECONNABORTED') {
        messageUtil.error('AI响应超时，请稍后再试或尝试更简短的问题');
      }
      throw error;
    });
  },

  // 流式聊天API（如果后端支持）
  streamChat(params: ChatParams, onProgress: (data: any) => void): Promise<void> {
    const url = `/ai/chat/stream?${new URLSearchParams(params as any).toString()}`;
    const eventSource = new EventSource(url);
    
    return new Promise<void>((resolve, reject) => {
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onProgress(data);
        } catch (error) {
          console.error('解析流式响应失败:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        eventSource.close();
        reject(error);
      };
      
      eventSource.addEventListener('done', () => {
        eventSource.close();
        resolve();
      });
    });
  },

  // 获取AI配置
  getConfig(): Promise<AIConfigResponse> {
    return http.get<ResponseData<AIConfigResponse>>('/ai/config').then(res => res.data!);
  },

   // 更新AI配置，增强处理Ollama
  updateConfig(params: AIConfigParams): Promise<AIConfigResponse> {
    // 处理Ollama特殊配置
    if (params.provider === AIProviderEnum.OLLAMA) {
      // Ollama通常不需要API Key，如果用户未填写，使用默认值
      params.apiKey = params.apiKey || 'not-required';
      // 如果没有设置baseUrl，但设置了ollamaApiUrl，则使用ollamaApiUrl
      if (!params.baseUrl && params.ollamaApiUrl) {
        params.baseUrl = params.ollamaApiUrl;
      }
    }
    
    return http.post<ResponseData<AIConfigResponse>>('/ai/config', params).then(res => res.data!);
  },

  // 测试AI配置
  testConfig(params: AIConfigTestParams): Promise<AIConfigTestResponse> {
    // 特殊处理Ollama的API测试
    if (params.provider === AIProviderEnum.OLLAMA) {
      // 使用更长的超时时间，Ollama可能需要更多时间加载模型
      return http.post<ResponseData<AIConfigTestResponse>>('/ai/config/test', params, {
        timeout: TIMEOUT_LONG
      }).then(res => res.data!);
    }
    return http.post<ResponseData<AIConfigTestResponse>>('/ai/config/test', params).then(res => res.data!);
  },

  // 获取可用AI模型列表
  getAvailableModels(): Promise<{models: Array<{id: string; name: string; provider: string; capabilities?: string[]}>}> {
    return http.get<ResponseData<{models: Array<{id: string; name: string; provider: string; capabilities?: string[]}>}>>('/ai/models').then(res => res.data!);
  },

  /**
   * 获取AI使用统计数据
   */
  getUsageStats: (params: { startDate?: string; endDate?: string; groupBy?: string }) => {
    return http.get<ResponseData<AIUsageStatsResponse>>('/ai/config/usage-stats', params).then(res => res.data!);
  },

  // 获取AI服务健康状态
  getHealth(): Promise<AIHealthResponse> {
    return http.get<ResponseData<AIHealthResponse>>('/ai/health').then(res => res.data!);
  },

  // 获取AI模型推荐
  getModelRecommendation(task: string): Promise<AIModelRecommendationResponse> {
    return http.get<ResponseData<AIModelRecommendationResponse>>(`/ai/recommend-model/${task}`).then(res => res.data!);
  },

  // 获取支持的AI提供商
  getProviders(): Promise<AIProvidersResponse> {
    return http.get<ResponseData<AIProvidersResponse>>('/ai/providers').then(res => res.data!);
  },

  // 提示词模板相关

  // 创建提示词模板
  createPromptTemplate(params: CreatePromptTemplateParams): Promise<PromptTemplate> {
    return http.post<ResponseData<PromptTemplate>>('/ai/prompt-templates', params).then(res => res.data!);
  },

  // 获取提示词模板列表
  getPromptTemplates(): Promise<{ templates: PromptTemplate[], total: number }> {
    return http.get<ResponseData<{ templates: PromptTemplate[], total: number }>>('/ai/prompt-templates').then(res => res.data!);
  },

  // 更新提示词模板
  updatePromptTemplate(id: string, params: UpdatePromptTemplateParams): Promise<PromptTemplate> {
    return http.put<ResponseData<PromptTemplate>>(`/ai/prompt-templates/${id}`, params).then(res => res.data!);
  },

  // 删除提示词模板
  deletePromptTemplate(id: string): Promise<boolean> {
    return http.delete<ResponseData<boolean>>(`/ai/prompt-templates/${id}`).then(res => res.data!);
  },

  // 获取提示词模板详情
  getPromptTemplateDetail(id: string): Promise<PromptTemplate> {
    return http.get<ResponseData<PromptTemplate>>(`/ai/prompt-templates/${id}`).then(res => res.data!);
  },

  // 测试提示词模板
  testPromptTemplate(params: TestPromptTemplateParams): Promise<TestPromptTemplateResponse> {
    return http.post<ResponseData<TestPromptTemplateResponse>>('/ai/prompt-templates/test', params).then(res => res.data!);
  },

  // 初始化系统提示词模板
  initPromptTemplates(): Promise<InitPromptTemplatesResponse> {
    return http.post<ResponseData<InitPromptTemplatesResponse>>('/ai/prompt-templates/init', {}).then(res => res.data!);
  },
  
  // 获取Ollama可用模型列表
  getOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<OllamaModel[]> {
    // 直接访问Ollama API获取模型列表
    return fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`获取Ollama模型列表失败: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (data && data.models) {
        // 转换为统一格式
        return data.models.map((model: OllamaModelInfo) => ({
          name: model.name,
          size: model.size,
          modified: model.modified_at,
          details: model.details || {
            family: model.name.split(':')[0],
            parameter_size: model.name.includes(':') ? model.name.split(':')[1] : 'unknown'
          }
        }));
      }
      return PRESET_MODELS.Ollama.map(name => ({ name, size: 0 })); // 如果API调用失败，使用预设模型列表
    })
    .catch(error => {
      console.error('获取Ollama模型列表失败:', error);
      return PRESET_MODELS.Ollama.map(name => ({ name, size: 0 })); // 发生错误时返回预设模型列表
    });
  },

  // 使用Ollama模型进行聊天
  ollamaChat<T extends boolean = false>(
    baseUrl: string, 
    model: string, 
    messages: OllamaMessage[], 
    options?: Record<string, any>, 
    stream?: T
  ): Promise<T extends true ? Response : OllamaChatResponse> {
    const url = `${baseUrl}/api/chat`;
    const payload: OllamaChatRequest = {
      model,
      messages,
      stream: Boolean(stream),
      options: {
        temperature: options?.temperature || 0.7,
        num_predict: options?.maxTokens || options?.num_predict || 1000,
        top_p: options?.top_p,
        top_k: options?.top_k,
        stop: options?.stop,
        frequency_penalty: options?.frequency_penalty,
        presence_penalty: options?.presence_penalty,
        seed: options?.seed,
        num_ctx: options?.num_ctx,
        ...options
      }
    };

    // 使用fetch API
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Ollama API请求失败: ${response.status} ${response.statusText}`);
      }
      return stream ? response : response.json();
    }) as Promise<T extends true ? Response : OllamaChatResponse>;
  },

  // 使用Ollama模型进行文本生成
  ollamaGenerate<T extends boolean = false>(
    baseUrl: string, 
    model: string, 
    prompt: string, 
    options?: Record<string, any>, 
    stream?: T
  ): Promise<T extends true ? Response : OllamaGenerateResponse> {
    const url = `${baseUrl}/api/generate`;
    const payload: OllamaGenerateRequest = {
      model,
      prompt,
      stream: Boolean(stream),
      options: {
        temperature: options?.temperature || 0.7,
        num_predict: options?.maxTokens || options?.num_predict || 1000,
        top_p: options?.top_p,
        top_k: options?.top_k,
        stop: options?.stop,
        frequency_penalty: options?.frequency_penalty,
        presence_penalty: options?.presence_penalty,
        seed: options?.seed,
        num_ctx: options?.num_ctx,
        ...options
      }
    };

    // 使用fetch API
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Ollama API请求失败: ${response.status} ${response.statusText}`);
      }
      return stream ? response : response.json();
    }) as Promise<T extends true ? Response : OllamaGenerateResponse>;
  },

  // 测试Ollama连接和版本信息
  testOllamaConnection(baseUrl: string): Promise<{ success: boolean; version?: string; error?: string }> {
    return fetch(`${baseUrl}/api/version`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Ollama服务连接失败: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((data: OllamaVersionResponse) => {
      return { 
        success: true,
        version: data.version 
      };
    })
    .catch(error => {
      console.error('测试Ollama连接失败:', error);
      return { 
        success: false,
        error: error.message || '连接失败，请确保Ollama服务正在运行' 
      };
    });
  },

  // 获取Ollama模型详细信息
  getOllamaModelInfo(baseUrl: string, modelName: string): Promise<Record<string, any>> {
    return fetch(`${baseUrl}/api/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: modelName })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`获取Ollama模型详情失败: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error(`获取Ollama模型 ${modelName} 详情失败:`, error);
      throw error;
    });
  }
};

export default aiService; 